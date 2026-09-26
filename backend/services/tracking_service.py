import math
from typing import Dict, Any, List

class TrackingService:
    """
    Computes storm trajectory, 0-6h future waypoints, 
    dynamic multi-tier hazard polygons, and ETA / Countdown to target asset.
    """
    def __init__(self, target_lat: float = 16.506, target_lon: float = 80.648, target_name: str = "Vijayawada Urban Zone"):
        self.target_lat = target_lat
        self.target_lon = target_lon
        self.target_name = target_name

    def haversine_distance_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def compute_trajectory_and_nowcast(self, storm: Dict[str, Any]) -> Dict[str, Any]:
        """
        Projects storm path across 0 to 6 hours (+15m, +30m, +45m, +1h, +2h, +3h, +4h, +5h, +6h).
        Returns GeoJSON LineString and timeline waypoints.
        """
        current_lat = storm.get("lat", 16.506)
        current_lon = storm.get("lon", 80.648)
        speed_kmh = storm.get("speed_kmh", 42.0)
        direction_deg = storm.get("direction_deg", 135.0)
        intensity = storm.get("intensity", 0.78)

        # Time offsets in minutes
        intervals = [0, 15, 30, 45, 60, 90, 120, 180, 240, 300, 360]
        waypoints = []
        coordinates = []
        
        rad = math.radians(direction_deg)
        
        for m in intervals:
            dist_km = speed_kmh * (m / 60.0)
            dlat = (dist_km * math.cos(rad)) / 111.0
            dlon = (dist_km * math.sin(rad)) / (111.0 * math.cos(math.radians(current_lat)))
            
            p_lat = round(current_lat - dlat, 4)
            p_lon = round(current_lon + dlon, 4)
            coordinates.append([p_lon, p_lat])
            
            # Forecast decay/intensity projection
            decay_factor = max(0.2, 1.0 - (m / 450.0)) if m > 90 else min(1.0, 1.0 + (m / 180.0) * 0.15)
            projected_intensity = round(min(1.0, intensity * decay_factor), 2)
            
            # Forecast hazard probabilities for this timestep
            hail_p = round(projected_intensity * 82.0, 1) if projected_intensity > 0.6 else round(projected_intensity * 40.0, 1)
            ltg_p = round(projected_intensity * 92.0, 1)
            rain_p = round(projected_intensity * 85.0, 1)
            wind_p = round(projected_intensity * 72.0, 1)
            risk_p = round(0.3 * hail_p + 0.3 * rain_p + 0.25 * ltg_p + 0.15 * wind_p, 1)

            waypoints.append({
                "minute_offset": m,
                "label": "NOW" if m == 0 else f"+{m}m" if m < 60 else f"+{m//60}h" if m % 60 == 0 else f"+{m}m",
                "lat": p_lat,
                "lon": p_lon,
                "intensity": projected_intensity,
                "risk": risk_p,
                "hail_prob": hail_p,
                "lightning_prob": ltg_p,
                "cloudburst_prob": rain_p,
                "downburst_prob": wind_p,
                "status": "Severe" if risk_p >= 75 else "High" if risk_p >= 60 else "Moderate" if risk_p >= 40 else "Low"
            })

        trajectory_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "properties": {
                "storm_id": storm.get("storm_id", "STORM-001"),
                "speed_kmh": speed_kmh,
                "direction_deg": direction_deg
            }
        }

        # Calculate arrival time to target
        dist_to_target_km = self.haversine_distance_km(current_lat, current_lon, self.target_lat, self.target_lon)
        
        # Calculate ETA in minutes
        # If moving roughly towards target:
        if speed_kmh > 0:
            time_hours = dist_to_target_km / speed_kmh
            arrival_minutes = max(0, int(time_hours * 60))
            arrival_seconds = int((time_hours * 3600) % 60)
        else:
            arrival_minutes = 999
            arrival_seconds = 0

        # Multi-tier hazard polygons around storm centroid
        hazard_polygons = self._generate_hazard_polygons(current_lat, current_lon, storm.get("radius_km", 18.0), intensity)

        return {
            "target": {
                "name": self.target_name,
                "lat": self.target_lat,
                "lon": self.target_lon,
                "distance_km": round(dist_to_target_km, 1),
                "arrival_minutes": arrival_minutes,
                "arrival_seconds": arrival_seconds,
                "formatted_countdown": f"{arrival_minutes // 60:02d}:{arrival_minutes % 60:02d}:{arrival_seconds:02d}",
                "imminent_threat": bool(dist_to_target_km < 35.0)
            },
            "trajectory_geojson": trajectory_geojson,
            "waypoints": waypoints,
            "hazard_polygons_geojson": hazard_polygons
        }

    def _generate_hazard_polygons(self, center_lat: float, center_lon: float, base_radius_km: float, intensity: float) -> Dict[str, Any]:
        """
        Creates concentric circular / elliptical polygon buffers for:
        1. 🔴 Severe Core (Hail & Extreme Lightning)
        2. 🟠 High Risk (Cloudburst & Gale winds)
        3. 🟡 Moderate Advisory Zone
        """
        def make_circle(lat: float, lon: float, radius_km: float, n_points: int = 24) -> List[List[float]]:
            pts = []
            for i in range(n_points):
                angle = (2 * math.pi * i) / n_points
                dlat = (radius_km * math.cos(angle)) / 111.0
                dlon = (radius_km * math.sin(angle)) / (111.0 * math.cos(math.radians(lat)))
                pts.append([round(lon + dlon, 4), round(lat + dlat, 4)])
            pts.append(pts[0])  # Close polygon ring
            return pts

        severe_r = base_radius_km * 0.6
        high_r = base_radius_km * 1.1
        moderate_r = base_radius_km * 1.7

        features = [
            {
                "type": "Feature",
                "properties": {
                    "tier": "MODERATE",
                    "level": 1,
                    "color": "#eab308",
                    "opacity": 0.2,
                    "description": "Moderate Convective Advisory Zone (30-50 km/h gusts, light lightning)"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [make_circle(center_lat, center_lon, moderate_r)]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "tier": "HIGH",
                    "level": 2,
                    "color": "#f97316",
                    "opacity": 0.35,
                    "description": "High Risk Zone (Squall winds, heavy rain > 40 mm/hr)"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [make_circle(center_lat, center_lon, high_r)]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "tier": "SEVERE",
                    "level": 3,
                    "color": "#ef4444",
                    "opacity": 0.55,
                    "description": "Severe Convective Core (Destructive Hail, Cloudburst, Intense Lightning)"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [make_circle(center_lat, center_lon, severe_r)]
                }
            }
        ]

        return {
            "type": "FeatureCollection",
            "features": features
        }
