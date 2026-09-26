# Simulation Engine for StormSense AI
import math
import random
from typing import Dict, Any, List

class StormCell:
    """Represents a convective storm cell with physical dynamics."""
    def __init__(
        self,
        storm_id: str = "STORM-001",
        lat: float = 16.506,
        lon: float = 80.648,
        speed_kmh: float = 42.0,
        direction_deg: float = 135.0,  # Southeast
        intensity: float = 0.78,       # 0.0 to 1.0 scale
        radius_km: float = 18.0,
        stage: str = "Rapid Intensification"
    ):
        self.storm_id = storm_id
        self.lat = lat
        self.lon = lon
        self.speed_kmh = speed_kmh
        self.direction_deg = direction_deg
        self.intensity = intensity
        self.radius_km = radius_km
        self.stage = stage
        self.age_minutes = 0

    def step(self, dt_minutes: float = 5.0, environment: Dict[str, float] = None) -> None:
        """Advance storm position and physics."""
        self.age_minutes += dt_minutes
        
        # Calculate displacement based on speed and heading
        # 1 degree latitude ~ 111 km, 1 degree longitude ~ 111 * cos(lat) km
        dist_km = (self.speed_kmh * (dt_minutes / 60.0))
        rad = math.radians(self.direction_deg)
        
        # dlat is north/south (cos), dlon is east/west (sin)
        dlat = (dist_km * math.cos(rad)) / 111.0
        dlon = (dist_km * math.sin(rad)) / (111.0 * math.cos(math.radians(self.lat)))
        
        self.lat -= dlat  # Moving southward if direction is 135 (SE)
        self.lon += dlon  # Moving eastward
        
        # Convective lifecycle evolution
        cape = environment.get("cape", 1500) if environment else 1500
        growth_factor = 1.0 + (cape - 1000) / 4000.0 if cape > 1000 else 0.95
        
        if self.stage == "Developing":
            self.intensity = min(0.65, self.intensity + 0.03 * growth_factor)
            if self.intensity >= 0.50:
                self.stage = "Rapid Intensification"
        elif self.stage == "Rapid Intensification":
            self.intensity = min(0.96, self.intensity + 0.04 * growth_factor)
            self.radius_km = min(28.0, self.radius_km + 0.5)
            if self.intensity >= 0.85:
                self.stage = "Severe Convective"
        elif self.stage == "Severe Convective":
            # Small random convection pulsation
            self.intensity = max(0.75, min(0.98, self.intensity + random.uniform(-0.02, 0.02)))
            if self.age_minutes > 120:
                self.stage = "Dissipating"
        elif self.stage == "Dissipating":
            self.intensity = max(0.15, self.intensity - 0.04)
            self.radius_km = max(8.0, self.radius_km - 0.4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "storm_id": self.storm_id,
            "lat": round(self.lat, 4),
            "lon": round(self.lon, 4),
            "speed_kmh": round(self.speed_kmh, 1),
            "direction_deg": round(self.direction_deg, 1),
            "intensity": round(self.intensity, 3),
            "radius_km": round(self.radius_km, 1),
            "stage": self.stage,
            "age_minutes": self.age_minutes
        }
