"""
Railway & Station Operations Dashboard API Endpoints.
Provides macro-network health, high-risk train classification,
and cascading downstream delay propagation analysis.
"""

from typing import List, Optional
from fastapi import APIRouter
from backend.app.database.db import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Operations Dashboard"])

@router.get("/summary")
def get_dashboard_summary():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM trains")
        total_trains = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM trains WHERE current_delay_min <= 5")
        on_time = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM trains WHERE current_delay_min > 5 AND current_delay_min <= 25")
        delayed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM trains WHERE current_delay_min > 25")
        severely_delayed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM trains WHERE risk_level IN ('High', 'Severe')")
        high_risk = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sections WHERE congestion_level IN ('medium', 'high')")
        congested_sections = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sections WHERE has_speed_restriction = 1")
        active_tsr = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(current_delay_min) FROM trains")
        total_delay = cursor.fetchone()[0] or 0.0
        
        return {
            "total_active_trains": total_trains,
            "on_time_trains": on_time,
            "delayed_trains": delayed,
            "severely_delayed_trains": severely_delayed,
            "high_risk_trains": high_risk,
            "congested_sections": congested_sections,
            "active_speed_restrictions": active_tsr,
            "predicted_network_impact_min": round(total_delay, 1)
        }

@router.get("/high-risk-trains")
def get_high_risk_trains():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT number, name, type, origin, destination, current_location,
               current_speed_kmh, current_delay_min, previous_station_delay_min,
               status, risk_level
        FROM trains
        ORDER BY current_delay_min DESC
        LIMIT 25
        """)
        trains = [dict(r) for r in cursor.fetchall()]
        
    enriched = []
    for t in trains:
        delay = t["current_delay_min"]
        prev_delay = t["previous_station_delay_min"]
        
        # Classification
        if delay > 45 or (delay > 30 and delay > prev_delay):
            risk_color = "red"
            risk_category = "Severe Risk"
            risk_reason = "Compounding delay with high downstream ripple hazard"
        elif delay > 25:
            risk_color = "orange"
            risk_category = "High Risk"
            risk_reason = "Significant delay exceeding scheduled recovery buffers"
        elif delay > 10:
            risk_color = "yellow"
            risk_category = "Moderate Risk"
            risk_reason = "Minor delay, recoverable under green corridor precedence"
        else:
            risk_color = "green"
            risk_category = "Low Risk"
            risk_reason = "Operating on timetable schedule with normal headway"
            
        t["risk_color"] = risk_color
        t["risk_category"] = risk_category
        t["risk_reason"] = risk_reason
        t["predicted_dest_delay"] = int(round(delay + (2.0 if risk_color in ["orange", "red"] else -1.0)))
        enriched.append(t)
        
    return {"count": len(enriched), "high_risk_trains": enriched}

@router.get("/downstream-ripple")
def get_downstream_ripple():
    """
    Returns visual network propagation relationships showing how
    delays cascade between leading and trailing rakes.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT number, name, current_location, current_delay_min, route_id, risk_level
        FROM trains WHERE current_delay_min > 12
        ORDER BY current_delay_min DESC LIMIT 4
        """)
        primary_disruptions = [dict(r) for r in cursor.fetchall()]
        
    chains = []
    for p in primary_disruptions:
        chains.append({
            "primary_train": {
                "number": p["number"],
                "name": p["name"],
                "location": p["current_location"],
                "delay_minutes": p["current_delay_min"]
            },
            "cascade_steps": [
                {
                    "stage": 1,
                    "event": f"Train {p['number']} experiences {int(p['current_delay_min'])}m delay",
                    "impact": "Occupies critical section headway"
                },
                {
                    "stage": 2,
                    "event": "Automated block signalling triggers cautionary yellow / red aspect",
                    "impact": "Trailing rakes held at outer home signals"
                },
                {
                    "stage": 3,
                    "event": "Downstream junction dwell increased by +8–14m",
                    "impact": "Platform allocation conflict at junction station"
                }
            ],
            "estimated_network_loss_minutes": round(p["current_delay_min"] * 1.6, 1)
        })
        
    return {"cascading_chains": chains}
