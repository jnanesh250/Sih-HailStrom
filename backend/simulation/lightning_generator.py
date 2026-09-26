import random
import math
from typing import Dict, Any, List

class LightningGenerator:
    """
    Generates synthetic lightning flash counts, strike coordinates, 
    and lightning flash density (strokes / km^2 / min).
    """
    def __init__(self):
        pass

    def generate_lightning_cluster(self, storm: Dict[str, Any]) -> Dict[str, Any]:
        intensity = storm.get("intensity", 0.75)
        storm_lat = storm.get("lat", 16.506)
        storm_lon = storm.get("lon", 80.648)
        radius_km = storm.get("radius_km", 18.0)
        
        # Strike count scales exponentially with intensity in deep convective cells
        # Severe hailstorms feature a "lightning jump" (sudden surge to 80-200 strikes/min)
        base_strikes = int((intensity ** 2.2) * 120.0)
        actual_strikes = max(2, int(random.gauss(base_strikes, max(1, base_strikes * 0.15))))
        
        strikes = []
        for i in range(min(actual_strikes, 45)):  # Send up to 45 live coordinate points for UI display
            # Scatter around storm centroid using Gaussian radial distribution
            r_km = abs(random.gauss(0, radius_km * 0.45))
            theta = random.uniform(0, 2 * math.pi)
            
            dlat = (r_km * math.cos(theta)) / 111.0
            dlon = (r_km * math.sin(theta)) / (111.0 * math.cos(math.radians(storm_lat)))
            
            # Strike polarity: 85% negative CG, 15% positive CG (positive strikes often correlate with hail)
            is_positive = random.random() < 0.18
            peak_current_ka = round(random.uniform(25.0, 95.0) if is_positive else random.uniform(15.0, 60.0), 1)
            
            strikes.append({
                "id": f"CG-{random.randint(10000, 99999)}",
                "lat": round(storm_lat + dlat, 4),
                "lon": round(storm_lon + dlon, 4),
                "type": "Cloud-to-Ground (+CG)" if is_positive else "Cloud-to-Ground (-CG)",
                "peak_current_ka": peak_current_ka,
                "timestamp_ms": int(random.uniform(500, 4500))
            })
            
        area_km2 = math.pi * (radius_km ** 2)
        density = round(actual_strikes / max(1.0, area_km2), 3)
        lightning_jump = bool(actual_strikes > 50 and intensity > 0.70)
        
        return {
            "total_strikes_1min": actual_strikes,
            "density_strikes_km2_min": density,
            "lightning_jump_detected": lightning_jump,
            "active_strikes": strikes
        }
