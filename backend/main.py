"""
FastAPI Server for SIH Problem Statement 26028:
Dynamic Forecast of Expected Time of Arrival (ETA) for Coaching Trains.
Ministry of Railways | Smart Automation
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure root paths are in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR in sys.path:
    sys.path.remove(ROOT_DIR)
sys.path.insert(0, ROOT_DIR)


from backend.app.database.db import init_db, seed_initial_data
from backend.app.websocket.manager import ws_manager
from backend.app.simulation.engine import sim_engine

# Import routers
from backend.app.api.routes.trains import router as trains_router
from backend.app.api.routes.stations import router as stations_router
from backend.app.api.routes.sections import router as sections_router
from backend.app.api.routes.operations import router as operations_router
from backend.app.api.routes.analytics import router as analytics_router
from backend.app.api.routes.connections import router as connections_router
from backend.app.api.routes.departure import router as departure_router
from backend.app.api.routes.simulation import router as simulation_router
from backend.app.api.routes.railradar import router as railradar_router
from backend.app.api.routes.passenger import router as passenger_router
from backend.app.api.routes.booking import router as booking_router
from backend.app.api.routes.predictions_api import router as predictions_router
from backend.app.api.routes.saved_api import router as saved_router
from backend.app.api.routes.alerts_api import router as alerts_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB and synchronize real operational train data
    print("Starting Indian Railways Dynamic ETA Forecasting Engine...")
    init_db()
    seed_initial_data()
    
    provider_mode = os.getenv("DATA_PROVIDER_MODE", "real_data")
    if provider_mode == "simulation":
        print("Starting Simulation Mode...")
        await sim_engine.start()
    else:
        print("Starting Real-time Operational Data Mode (Live NTES & Authentic Timetables)...")
        from backend.app.services.real_train_data_engine import sync_all_trains_to_real_operational_data
        sync_all_trains_to_real_operational_data()
    yield
    # Shutdown: pause simulation if running
    if sim_engine.is_running:
        await sim_engine.pause()
    print("Railway ETA Engine stopped.")

app = FastAPI(
    title="Indian Railways Dynamic ETA Forecast Engine",
    description="SIH Problem Statement 26028: AI-powered dynamic ETA forecasting, delay propagation, and recovery analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(trains_router)
app.include_router(stations_router)
app.include_router(sections_router)
app.include_router(operations_router)
app.include_router(analytics_router)
app.include_router(connections_router)
app.include_router(departure_router)
app.include_router(simulation_router)
app.include_router(railradar_router)
app.include_router(passenger_router)
app.include_router(booking_router)
app.include_router(predictions_router)
app.include_router(saved_router)
app.include_router(alerts_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/api/health")
def health_check():
    mode = os.getenv("DATA_PROVIDER_MODE", "real_data")
    return {
        "status": "healthy",
        "system": "Indian Railways Dynamic ETA Platform",
        "mode": "Real-Time Operational Telemetry (Official Timetable & NTES Live Data)" if mode != "simulation" else "Simulation Mode",
        "sih_problem_id": "26028",
        "is_simulation_running": sim_engine.is_running
    }

if __name__ == "__main__":
    import uvicorn
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=root_dir)
