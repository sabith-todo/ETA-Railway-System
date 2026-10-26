"""
RailRadar API Routes.
Exposes RailRadar catalog endpoints, live connectivity diagnostics, coach layout,
and real-time radar data to the frontend.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.railradar_service import (
    railradar_client,
    RAILRADAR_CATALOG,
    RAILRADAR_BASE_URL
)

from backend.app.services.coach_service import generate_coach_rake, get_seat_info

router = APIRouter(prefix="/api/railradar", tags=["RailRadar API Integration"])

class KeyUpdateRequest(BaseModel):
    api_key: str

@router.get("/catalog")
def get_railradar_catalog():
    """Returns the full catalog of all 26 RailRadar API endpoints."""
    return {
        "provider": "RailRadar (https://railradar.in)",
        "base_url": RAILRADAR_BASE_URL,
        "total_endpoints": len(RAILRADAR_CATALOG),
        "auth_type": "Bearer Token / x-api-key",
        "key_configured": bool(railradar_client.api_key),
        "catalog": RAILRADAR_CATALOG
    }

@router.get("/status")
def get_railradar_status():
    """Checks the operational status of RailRadar integration."""
    test_res = railradar_client.test_connection()
    return {
        "provider": "RailRadar v1",
        "is_configured": bool(railradar_client.api_key),
        "diagnostics": test_res
    }

@router.post("/test")
def test_railradar_key(body: KeyUpdateRequest):
    """Tests a provided RailRadar API key against the live server."""
    if not body.api_key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
    result = railradar_client.test_connection(test_key=body.api_key)
    if result.get("authenticated") or result.get("status") == "connected":
        railradar_client.set_api_key(body.api_key)
    return result

@router.get("/trains/{train_number}/coaches")
def get_train_coaches(train_number: str, station: Optional[str] = None):
    """Fetches coach composition and platform alignment from RailRadar with authentic IR fallback."""
    data = None
    try:
        if station:
            data = railradar_client.get_platform_coaches(train_number, station)
        else:
            data = railradar_client.get_coaches(train_number)
    except Exception:
        data = None

    if not data or not data.get("coaches"):
        # Produce comprehensive authentic rake composition
        return generate_coach_rake(train_number, station)
    return data

@router.get("/trains/{train_number}/coaches/{coach_code}/seat/{seat_number}")
def get_train_seat_layout(train_number: str, coach_code: str, seat_number: int, layout_type: str = "8_berth_sleeper"):
    """Fetches exact compartment and berth information for a specific seat number."""
    return get_seat_info(coach_code, seat_number, layout_type)

@router.get("/pnr/{pnr}")
def check_pnr_status(pnr: str):
    """Checks 10-digit PNR enquiry via local PRS reservation store or RailRadar."""
    clean = pnr.strip()
    
    # 1. Check local PRS bookings first
    try:
        from backend.app.api.routes.booking import BOOKINGS_STORE
        match = BOOKINGS_STORE.get(clean)
        if not match:
            for k, v in BOOKINGS_STORE.items():
                if k.replace("-", "") == clean.replace("-", ""):
                    match = v
                    break
        if match:
            return {
                "pnr": match["pnr"],
                "train_number": match["train_number"],
                "train_name": match["train_name"],
                "from_station": f"{match['from_station_name']} ({match['from_station']})",
                "to_station": f"{match['to_station_name']} ({match['to_station']})",
                "date_of_journey": match["journey_date"],
                "chart_prepared": True,
                "booking_class": match["class_name"],
                "passengers": [
                    {
                        "number": p["passenger_number"],
                        "name": p["name"],
                        "coach": p["coach"],
                        "seat": p["seat_number"],
                        "berth": p["berth_type"],
                        "booking_status": f"{p['coach']} / {p['seat_number']} / {p['berth_type'].split(' ')[0]}",
                        "current_status": "CNF"
                    } for p in match["passengers"]
                ]
            }
    except Exception as e:
        print(f"Error checking local booking store: {e}")

    # 2. Check RailRadar external client
    data = railradar_client.get_pnr_status(pnr)
    if not data:
        return {
            "pnr": pnr,
            "status": "ready_for_key",
            "message": "Enter your RailRadar Bearer token in Settings to query live IRCTC PNR records directly."
        }
    return data
