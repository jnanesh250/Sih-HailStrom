import asyncio
import time
from typing import Dict, Any, List, Set
from fastapi import WebSocket

from simulation.storm_generator import StormCell
from simulation.radar_generator import RadarGenerator
from simulation.satellite_generator import SatelliteGenerator
from simulation.lightning_generator import LightningGenerator
from services.weather_service import WeatherService
from services.tracking_service import TrackingService
from services.grok_service import GrokService
from models.hazard_model import HazardMLModel

class SimulationManager:
    """
    Central Coordinator for the StormSense AI System.
    Executes the multi-source data fusion loop, machine learning inference, 
    tracking, and WebSocket broadcasting.
    """
    def __init__(self):
        self.storm = StormCell()
        self.radar_gen = RadarGenerator()
        self.sat_gen = SatelliteGenerator()
        self.ltg_gen = LightningGenerator()
        self.weather_svc = WeatherService()
        self.tracking_svc = TrackingService()
        self.ml_model = HazardMLModel()
        self.grok_svc = GrokService()
        
        self.active_websockets: Set[WebSocket] = set()
        self.is_running = True
        self.simulation_speed = 1.0  # 1x, 2x, 5x
        self.current_mode = "Simulation"  # "Simulation", "Historical", "Live"
        self.active_scenario = "Rapid Intensification"
        
        # User manual overrides for "What-If" simulation
        self.overrides: Dict[str, float] = {}
        self.cached_state: Dict[str, Any] = {}

    def set_scenario(self, scenario_name: str):
        self.active_scenario = scenario_name
        if scenario_name == "Developing Storm":
            self.storm = StormCell(intensity=0.35, stage="Developing", speed_kmh=30.0)
        elif scenario_name == "Rapid Intensification":
            self.storm = StormCell(intensity=0.78, stage="Rapid Intensification", speed_kmh=42.0)
        elif scenario_name == "Severe Convective Storm":
            self.storm = StormCell(intensity=0.94, stage="Severe Convective", speed_kmh=52.0)
        elif scenario_name == "Storm Dissipation":
            self.storm = StormCell(intensity=0.25, stage="Dissipating", speed_kmh=24.0)
        self.overrides.clear()
        return self.get_current_state()

    def set_override(self, key: str, value: float):
        self.overrides[key] = value

    def clear_overrides(self):
        self.overrides.clear()

    def get_current_state(self) -> Dict[str, Any]:
        """Runs the complete data fusion, ML inference, and tracking pipeline."""
        storm_dict = self.storm.to_dict()
        
        # Apply what-if overrides if set
        if "intensity" in self.overrides:
            storm_dict["intensity"] = float(self.overrides["intensity"])
        if "speed_kmh" in self.overrides:
            storm_dict["speed_kmh"] = float(self.overrides["speed_kmh"])

        # 1. Fetch atmospheric background (Open-Meteo)
        weather = self.weather_svc.get_weather(storm_dict["lat"], storm_dict["lon"])
        if "humidity" in self.overrides:
            weather["humidity_percent"] = float(self.overrides["humidity"])
        if "wind_speed" in self.overrides:
            weather["wind_speed_kmh"] = float(self.overrides["wind_speed"])

        # 2. Generate multi-source sensor observations
        radar = self.radar_gen.generate_reflectivity_grid(storm_dict["lat"], storm_dict["lon"], storm_dict)
        sat = self.sat_gen.generate_thermal_field(storm_dict, weather["temperature_c"])
        ltg = self.ltg_gen.generate_lightning_cluster(storm_dict)

        # 3. Construct Feature Vector for the ML Model
        features = {
            "reflectivity_dbz": radar["max_reflectivity_dbz"],
            "reflectivity_change": 3.8 if storm_dict["stage"] == "Rapid Intensification" else -2.1,
            "cloud_updraft_ms": sat["updraft_velocity_ms"],
            "cloud_top_temp_c": sat["min_cloud_top_temp_c"],
            "lightning_density": ltg["density_strikes_km2_min"],
            "lightning_growth_rate": 6.5 if storm_dict["intensity"] > 0.7 else 1.0,
            "humidity_percent": weather["humidity_percent"],
            "temperature_c": weather["temperature_c"],
            "wind_speed_kmh": weather["wind_speed_kmh"],
            "cape_j_kg": weather["cape_j_kg"],
            "storm_intensity": storm_dict["intensity"]
        }

        # 4. Machine Learning Hazard Prediction
        hazard_preds = self.ml_model.predict(features)

        # 5. Spatiotemporal Tracking, Trajectory Nowcast, and Hazard Zones
        tracking_info = self.tracking_svc.compute_trajectory_and_nowcast(storm_dict)

        # 6. Assemble Full Telemetry Payload
        full_state = {
            "system_name": "StormSense AI",
            "version": "1.0.0-PROTOTYPE",
            "data_mode": self.current_mode,
            "active_scenario": self.active_scenario,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "data_sources_status": {
                "weather_api": {"name": "Open-Meteo Environmental Stream", "status": "CONNECTED", "color": "#22c55e"},
                "radar_sim": {"name": "Synthetic DWR Radar Stream", "status": "ACTIVE", "color": "#22c55e"},
                "satellite_sim": {"name": "Synthetic INSAT-3DR Thermal", "status": "ACTIVE", "color": "#22c55e"},
                "lightning_sim": {"name": "Synthetic Lightning Network", "status": "ACTIVE", "color": "#22c55e"},
                "ai_engine": {"name": "Random Forest ML Classifier", "status": "READY", "color": "#22c55e"}
            },
            "storm": storm_dict,
            "weather": weather,
            "radar": {
                "max_reflectivity_dbz": radar["max_reflectivity_dbz"],
                "hail_core_present": radar["hail_core_present"],
                "bounds": radar["bounds"]
            },
            "satellite": sat,
            "lightning": ltg,
            "hazards": hazard_preds,
            "tracking": tracking_info,
            "is_running": self.is_running
        }
        self.cached_state = full_state
        return full_state

    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)
        # Send initial state immediately
        await websocket.send_json(self.get_current_state())

    def unregister_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_state(self):
        """Pushes state to all connected frontends."""
        if not self.active_websockets:
            return
        state = self.get_current_state()
        dead = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(state)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_websockets.discard(ws)

    async def simulation_loop(self):
        """Asynchronous background loop advancing the storm every 3.5 seconds."""
        while True:
            if self.is_running:
                # Advance storm physics by dt minutes
                dt = 3.0 * self.simulation_speed
                env = self.weather_svc.get_weather(self.storm.lat, self.storm.lon)
                self.storm.step(dt_minutes=dt, environment=env)
                await self.broadcast_state()
            await asyncio.sleep(3.5 / max(0.2, self.simulation_speed))
