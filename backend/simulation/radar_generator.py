import math
import numpy as np
from typing import Dict, Any, List

class RadarGenerator:
    """Generates synthetic DWR (Doppler Weather Radar) reflectivity fields."""
    
    def __init__(self, grid_size: int = 50, spatial_span_km: float = 120.0):
        self.grid_size = grid_size
        self.spatial_span_km = spatial_span_km

    def generate_reflectivity_grid(self, center_lat: float, center_lon: float, storm: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a 2D Gaussian reflectivity field in dBZ around the radar/storm center.
        0-20 dBZ: Light rain / clear
        20-35 dBZ: Moderate rain
        35-50 dBZ: Heavy rain / Convective core
        50-65+ dBZ: Severe storm / Hail core (Hail spikes typically > 55 dBZ!)
        """
        lat_arr = np.linspace(center_lat - 0.6, center_lat + 0.6, self.grid_size)
        lon_arr = np.linspace(center_lon - 0.6, center_lon + 0.6, self.grid_size)
        
        # Peak dBZ based on storm intensity (intensity 0.0 - 1.0 -> 25 to 68 dBZ)
        peak_dbz = 25.0 + (storm.get("intensity", 0.75) * 45.0)
        storm_lat = storm.get("lat", center_lat)
        storm_lon = storm.get("lon", center_lon)
        sigma_deg = (storm.get("radius_km", 18.0) / 111.0) * 0.75

        grid = []
        features = []
        max_dbz = 0.0
        
        for i, lt in enumerate(lat_arr):
            row = []
            for j, ln in enumerate(lon_arr):
                dist_sq = (lt - storm_lat) ** 2 + (ln - storm_lon) ** 2
                # 2D Gaussian decay
                val = peak_dbz * math.exp(-dist_sq / (2 * (sigma_deg ** 2)))
                # Add subtle atmospheric speckle noise
                if val > 15.0:
                    val += np.random.normal(0, 1.2)
                val = max(0.0, min(75.0, val))
                row.append(round(float(val), 1))
                if val > max_dbz:
                    max_dbz = val
            grid.append(row)

        return {
            "grid_size": self.grid_size,
            "max_reflectivity_dbz": round(float(max_dbz), 1),
            "hail_core_present": bool(max_dbz >= 55.0),
            "bounds": {
                "min_lat": round(float(lat_arr[0]), 4),
                "max_lat": round(float(lat_arr[-1]), 4),
                "min_lon": round(float(lon_arr[0]), 4),
                "max_lon": round(float(lon_arr[-1]), 4),
            },
            "sample_matrix": grid  # 50x50 numerical reflectivity values
        }
