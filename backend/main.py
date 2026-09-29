import asyncio
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

# Load backend/.env (GROK_API_KEY / XAI_API_KEY, TARGET_CITY, ...) BEFORE
# SimulationManager (and its GrokService) reads the environment.
load_dotenv()

from services.simulation_manager import SimulationManager

sim_manager = SimulationManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the continuous simulation background task
    task = asyncio.create_task(sim_manager.simulation_loop())
    yield
    task.cancel()

app = FastAPI(
    title="StormSense AI API",
    description="AI-Powered Convective-Scale Nowcasting & Early Warning System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite default port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class WhatIfRequest(BaseModel):
    intensity: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    speed_kmh: Optional[float] = None

class ScenarioRequest(BaseModel):
    scenario: str

class ControlRequest(BaseModel):
    action: str  # "play", "pause", "reset"
    speed: Optional[float] = 1.0

class ChatRequest(BaseModel):
    message: str
    nowcast_briefing: Optional[str] = None

# Endpoints
@app.get("/")
def root():
    return {
        "system": "StormSense AI Backend",
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "websocket_url": "/ws/live"
    }

@app.get("/api/storms")
def get_storms():
    state = sim_manager.get_current_state()
    return {
        "active_storms": [state["storm"]],
        "total_active": 1,
        "timestamp": state["timestamp"]
    }

@app.get("/api/storms/{storm_id}")
def get_storm_detail(storm_id: str):
    state = sim_manager.get_current_state()
    if state["storm"]["storm_id"] != storm_id and storm_id != "current":
        raise HTTPException(status_code=404, detail="Storm cell not found")
    return {
        "storm": state["storm"],
        "hazards": state["hazards"],
        "weather": state["weather"],
        "radar": state["radar"],
        "lightning": state["lightning"],
        "tracking": state["tracking"]
    }

@app.get("/api/storms/{storm_id}/forecast")
def get_storm_forecast(storm_id: str):
    state = sim_manager.get_current_state()
    return {
        "storm_id": state["storm"]["storm_id"],
        "waypoints_0_to_6h": state["tracking"]["waypoints"],
        "trajectory_geojson": state["tracking"]["trajectory_geojson"]
    }

@app.get("/api/hazards")
def get_hazards():
    state = sim_manager.get_current_state()
    return state["hazards"]

@app.get("/api/weather")
def get_weather():
    state = sim_manager.get_current_state()
    return state["weather"]

@app.post("/api/simulate")
def simulate_what_if(req: WhatIfRequest):
    """Allows user to tweak storm variables in the 'What-If' simulator."""
    if req.intensity is not None:
        sim_manager.set_override("intensity", req.intensity)
    if req.humidity is not None:
        sim_manager.set_override("humidity", req.humidity)
    if req.wind_speed is not None:
        sim_manager.set_override("wind_speed", req.wind_speed)
    if req.speed_kmh is not None:
        sim_manager.set_override("speed_kmh", req.speed_kmh)
    
    return sim_manager.get_current_state()

@app.post("/api/simulate/reset")
def reset_what_if():
    sim_manager.clear_overrides()
    return sim_manager.get_current_state()

@app.post("/api/scenarios/select")
def select_scenario(req: ScenarioRequest):
    new_state = sim_manager.set_scenario(req.scenario)
    return new_state

@app.post("/api/simulation/control")
def control_simulation(req: ControlRequest):
    if req.action == "pause":
        sim_manager.is_running = False
    elif req.action == "play":
        sim_manager.is_running = True
    elif req.action == "reset":
        sim_manager.set_scenario(sim_manager.active_scenario)
    
    if req.speed is not None:
        sim_manager.simulation_speed = max(0.2, min(10.0, req.speed))
        
    return {
        "is_running": sim_manager.is_running,
        "speed": sim_manager.simulation_speed
    }

@app.post("/api/mode/select")
def select_mode(mode: str = Body(..., embed=True)):
    if mode in ["Simulation", "Historical", "Live"]:
        sim_manager.current_mode = mode
    return {"current_mode": sim_manager.current_mode}

def _compass_bearing(deg) -> str:
    """Compass bearing string from direction degrees (SE, SW, ...)."""
    try:
        d = float(deg)
    except (TypeError, ValueError):
        return "—"
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][round(((d % 360) + 360) % 360 / 45) % 8]


def _engine_assessment() -> dict:
    """
    Structured assessment produced by the StormSense engine (physics + ML +
    tracking). This — NOT raw observations — is what the AI Storm Analyst
    receives and explains. The LLM is an explanation layer, never the
    forecaster.

    Shape (matches the design contract):
        { storm, hazards, tracking, environment, observations }
    """
    state = sim_manager.get_current_state()
    storm = state["storm"]
    hazards = state["hazards"]
    weather = state["weather"]
    tracking = state["tracking"]
    radar = state["radar"]
    lightning = state["lightning"]
    satellite = state.get("satellite", {})

    return {
        "engine": "StormSense RF/physics nowcasting engine",
        "storm": {
            "storm_id": storm["storm_id"],
            "stage": storm["stage"],
            "intensity": storm["intensity"],
            "speed_kmh": storm["speed_kmh"],
            "direction": _compass_bearing(storm.get("direction_deg")),
            "radius_km": storm.get("radius_km"),
            "position": {"lat": storm["lat"], "lon": storm["lon"]},
        },
        "hazards": {
            "severity_level": hazards.get("severity_level"),
            "overall_convective_risk": hazards.get("overall_convective_risk"),
            "hail_probability": hazards.get("hail_probability"),
            "lightning_probability": hazards.get("lightning_probability"),
            "cloudburst_probability": hazards.get("cloudburst_probability"),
            "downburst_probability": hazards.get("downburst_probability"),
        },
        "tracking": {
            "target_name": tracking["target"]["name"],
            "distance_km": tracking["target"]["distance_km"],
            "arrival_minutes": tracking["target"]["arrival_minutes"],
            "imminent_threat": tracking["target"]["imminent_threat"],
            "path_waypoints": [
                {"label": wp["label"], "risk": wp["risk"], "status": wp["status"]}
                for wp in tracking.get("waypoints", [])
            ],
        },
        "environment": {
            "cape_j_kg": weather.get("cape_j_kg"),
            "humidity_percent": weather.get("humidity_percent"),
            "pressure_hpa": weather.get("pressure_hpa"),
            "temperature_c": weather.get("temperature_c"),
            "wind_speed_kmh": weather.get("wind_speed_kmh"),
            "wind_gusts_kmh": weather.get("wind_gusts_kmh"),
        },
        "observations": {
            "max_reflectivity_dbz": radar.get("max_reflectivity_dbz"),
            "hail_core_present": radar.get("hail_core_present"),
            "total_strikes_1min": lightning.get("total_strikes_1min"),
            "lightning_jump_detected": lightning.get("lightning_jump_detected"),
            "cloud_top_temp_c": satellite.get("min_cloud_top_temp_c"),
            "updraft_velocity_ms": satellite.get("updraft_velocity_ms"),
        },
    }


@app.post("/api/ai/explain")
def explain_alert():
    """AI Storm Analyst: explains the engine's structured risk assessment
    in plain language for disaster-management officers."""
    return sim_manager.grok_svc.explain_risk(_engine_assessment())


@app.post("/api/ai/chat")
def chat_ai(req: ChatRequest):
    """Ask StormSense AI — grounded Q&A over the engine's structured output."""
    assessment = _engine_assessment()
    if req.nowcast_briefing:
        assessment["nowcast_context"] = req.nowcast_briefing
        
    answer = sim_manager.grok_svc.chat(req.message, assessment)
    return {
        "response": answer,
        "provider": (
            sim_manager.grok_svc.provider_label
            if sim_manager.grok_svc.api_key
            else "StormSense Convective Reasoning Engine"
        ),
        "grounded_on": "engine_assessment",
    }

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await sim_manager.register_websocket(websocket)
    try:
        while True:
            # Keep connection open and receive optional client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        sim_manager.unregister_websocket(websocket)
    except Exception:
        sim_manager.unregister_websocket(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
