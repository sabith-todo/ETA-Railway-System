"""
Simulation Control & Event Injection API Endpoints.
Enables judges and evaluators to trigger real-time railway disruptions
and watch dynamic ETA recalculations occur live.
"""

from typing import Optional
from fastapi import APIRouter
from backend.app.models.schemas import OperationalEventCreate
from backend.app.simulation.engine import sim_engine

router = APIRouter(prefix="/api/simulation", tags=["Simulation Control"])

@router.post("/start")
async def start_simulation():
    return await sim_engine.start()

@router.post("/pause")
async def pause_simulation():
    return await sim_engine.pause()

@router.post("/reset")
async def reset_simulation():
    return await sim_engine.reset()

@router.post("/multiplier")
async def set_simulation_multiplier(multiplier: int = 1):
    return await sim_engine.set_multiplier(multiplier)

@router.get("/status")
def get_simulation_status():
    return {
        "is_running": sim_engine.is_running,
        "tick_interval_seconds": sim_engine.tick_interval_seconds,
        "time_multiplier": sim_engine.time_multiplier,
        "active_events_count": len(sim_engine.active_events),
        "history_count": len(sim_engine.event_history)
    }

@router.get("/events")
def get_simulation_events():
    return {
        "active_events": sim_engine.active_events,
        "history": sim_engine.event_history[:20]
    }

@router.post("/events")
async def inject_simulation_event(event: OperationalEventCreate):
    res = await sim_engine.inject_event(
        event_type=event.event_type,
        train_id=event.train_id or "12627",
        section_id=event.section_id or "SEC_SA_ED",
        description=event.description,
        impact_minutes=event.impact_minutes,
        severity=event.severity
    )
    return res
