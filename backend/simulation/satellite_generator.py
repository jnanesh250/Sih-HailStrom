import math
import numpy as np
from typing import Dict, Any

class SatelliteGenerator:
    """
    Generates synthetic INSAT-3D/3DR inspired thermal infrared (TIR1/TIR2) 
    and Cloud-Top Temperature (CTT) fields.
    """
    def __init__(self):
        pass

    def generate_thermal_field(self, storm: Dict[str, Any], ambient_temp_c: float = 32.0) -> Dict[str, Any]:
        """
        Overshooting cloud tops in deep tropical convection can cool to -65°C to -85°C.
        Cold tops + high radar reflectivity are direct physical precursors to severe hail & cloudburst.
        """
        intensity = storm.get("intensity", 0.75)
        # Deep convective cloud top temperature calculation
        # Ambient surface 30°C -> convective cloud top reaches -40°C to -82°C
        min_cloud_top_temp_c = 15.0 - (intensity * 95.0)  # At intensity 0.85 -> -65.75°C
        
        # Cloud vertical growth rate in km/h or m/s
        updraft_speed_ms = 5.0 + (intensity * 35.0)  # 5 m/s to 40 m/s severe updraft
        cloud_depth_km = 6.0 + (intensity * 11.0)     # 6 km to 17 km tropopause penetration
        
        return {
            "sensor": "INSAT-3DR TIR1 (Synthetic Emulation)",
            "min_cloud_top_temp_c": round(min_cloud_top_temp_c, 1),
            "tropopause_overshooting": bool(min_cloud_top_temp_c < -65.0),
            "updraft_velocity_ms": round(updraft_speed_ms, 1),
            "cloud_depth_km": round(cloud_depth_km, 1),
            "convective_cloud_growth": "Rapid" if intensity > 0.65 else "Moderate"
        }
