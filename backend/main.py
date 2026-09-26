import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

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

@app.post("/api/ai/explain")
def explain_alert():
    """Grok AI Convective Risk Explanation Layer."""
    state = sim_manager.get_current_state()
    explanation = sim_manager.grok_svc.explain_risk(
        state["storm"],
        state["hazards"],
        state["weather"]
    )
    return explanation

@app.post("/api/ai/chat")
def chat_ai(req: ChatRequest):
    """Interactive Q&A with Grok AI Storm Analyst."""
    state = sim_manager.get_current_state()
    context = {
        "storm_id": state["storm"]["storm_id"],
        "stage": state["storm"]["stage"],
        "speed_kmh": state["storm"]["speed_kmh"],
        "overall_convective_risk": state["hazards"]["overall_convective_risk"],
        "hail_probability": state["hazards"]["hail_probability"],
        "lightning_probability": state["hazards"]["lightning_probability"],
        "cloudburst_probability": state["hazards"]["cloudburst_probability"],
        "downburst_probability": state["hazards"]["downburst_probability"],
        "cape_j_kg": state["weather"]["cape_j_kg"],
        "arrival_minutes": state["tracking"]["target"]["arrival_minutes"]
    }
    answer = sim_manager.grok_svc.chat(req.message, context)
    return {
        "response": answer,
        "provider": "xAI Grok 4.7" if sim_manager.grok_svc.api_key else "StormSense Convective Reasoning Engine"
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
