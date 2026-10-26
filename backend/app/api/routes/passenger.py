"""
Passenger Travel History & Journey Log API.
Manages recorded passenger train journeys, mileage analytics,
and carbon savings across Indian Railways corridors.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/passenger", tags=["Passenger Travel History"])

class PassengerJourney(BaseModel):
    id: str
    train_number: str
    train_name: str
    train_type: str
    from_station_code: str
    from_station_name: str
    to_station_code: str
    to_station_name: str
    journey_date: str
    departure_time: str
    arrival_time: str
    distance_km: float
    duration_str: str
    coach: str
    seat_number: str
    berth_type: str
    pnr: Optional[str] = None
    status: str  # 'Completed', 'Upcoming', 'In-Transit'
    punctuality: str  # 'On Time', 'Delayed (+15m)'
    co2_saved_kg: float
    notes: Optional[str] = None

# In-memory default history for Southern Railway passenger
DEFAULT_TRAVEL_HISTORY = [
    {
        "id": "trip_001",
        "train_number": "12635",
        "train_name": "Vaigai Superfast Express",
        "train_type": "Superfast",
        "from_station_code": "MS",
        "from_station_name": "Chennai Egmore",
        "to_station_code": "MDU",
        "to_station_name": "Madurai Jn",
        "journey_date": "2026-08-14",
        "departure_time": "13:50",
        "arrival_time": "21:30",
        "distance_km": 497.0,
        "duration_str": "7h 40m",
        "coach": "B2",
        "seat_number": "42",
        "berth_type": "Middle Berth (MB)",
        "pnr": "4521890321",
        "status": "Completed",
        "punctuality": "On Time",
        "co2_saved_kg": 54.6,
        "notes": "Fastest daytime run to Madurai. Excellent pantry catering."
    },
    {
        "id": "trip_002",
        "train_number": "20643",
        "train_name": "Coimbatore Vande Bharat Express",
        "train_type": "Vande Bharat",
        "from_station_code": "MAS",
        "from_station_name": "Chennai Central",
        "to_station_code": "CBE",
        "to_station_name": "Coimbatore Jn",
        "journey_date": "2026-07-22",
        "departure_time": "06:10",
        "arrival_time": "11:50",
        "distance_km": 495.0,
        "duration_str": "5h 40m",
        "coach": "C3",
        "seat_number": "24",
        "berth_type": "Window Seat (W)",
        "pnr": "6241098452",
        "status": "Completed",
        "punctuality": "Delayed (+4m)",
        "co2_saved_kg": 59.4,
        "notes": "Smooth 130 km/h cruising between Arakkonam and Jolarpettai."
    },
    {
        "id": "trip_003",
        "train_number": "12637",
        "train_name": "Pandian Superfast Express",
        "train_type": "Superfast",
        "from_station_code": "MS",
        "from_station_name": "Chennai Egmore",
        "to_station_code": "MDU",
        "to_station_name": "Madurai Jn",
        "journey_date": "2026-06-18",
        "departure_time": "21:40",
        "arrival_time": "05:35",
        "distance_km": 497.0,
        "duration_str": "7h 55m",
        "coach": "A1",
        "seat_number": "18",
        "berth_type": "Lower Berth (LB)",
        "pnr": "8192301475",
        "status": "Completed",
        "punctuality": "On Time",
        "co2_saved_kg": 54.6,
        "notes": "Overnight flagship journey. Slept comfortably with alarm."
    },
    {
        "id": "trip_004",
        "train_number": "12675",
        "train_name": "Kovai Superfast Express",
        "train_type": "Superfast",
        "from_station_code": "CBE",
        "from_station_name": "Coimbatore Jn",
        "to_station_code": "MAS",
        "to_station_name": "Chennai Central",
        "journey_date": "2026-05-10",
        "departure_time": "15:05",
        "arrival_time": "22:50",
        "distance_km": 495.0,
        "duration_str": "7h 45m",
        "coach": "D2",
        "seat_number": "56",
        "berth_type": "Window Seat (2S)",
        "pnr": "2198475012",
        "status": "Completed",
        "punctuality": "Delayed (+12m)",
        "co2_saved_kg": 54.4,
        "notes": "Scenic sunset views around Erode and Salem."
    },
    {
        "id": "trip_005",
        "train_number": "12631",
        "train_name": "Nellai Superfast Express",
        "train_type": "Superfast",
        "from_station_code": "MS",
        "from_station_name": "Chennai Egmore",
        "to_station_code": "TEN",
        "to_station_name": "Tirunelveli Jn",
        "journey_date": "2026-03-28",
        "departure_time": "20:10",
        "arrival_time": "06:40",
        "distance_km": 650.0,
        "duration_str": "10h 30m",
        "coach": "S3",
        "seat_number": "35",
        "berth_type": "Side Lower (SL)",
        "pnr": "5839201476",
        "status": "Completed",
        "punctuality": "On Time",
        "co2_saved_kg": 71.5,
        "notes": "Long distance overnight transit down the Chord line."
    }
]

_passenger_history = list(DEFAULT_TRAVEL_HISTORY)

@router.get("/travel-history")
def get_travel_history():
    """Returns the complete passenger travel history and lifetime travel statistics."""
    total_km = sum(t["distance_km"] for t in _passenger_history)
    total_co2 = sum(t["co2_saved_kg"] for t in _passenger_history)
    completed = [t for t in _passenger_history if t["status"] == "Completed"]
    on_time_count = sum(1 for t in completed if "On Time" in t.get("punctuality", ""))
    punctuality_pct = round((on_time_count / len(completed) * 100), 1) if completed else 100.0

    return {
        "passenger_name": "Dedicated Rail Passenger",
        "frequent_traveler_id": "SR-TN-89421",
        "total_journeys": len(_passenger_history),
        "total_distance_km": round(total_km, 1),
        "total_co2_saved_kg": round(total_co2, 1),
        "punctuality_rate_percent": punctuality_pct,
        "most_frequented_corridor": "Chennai ➔ Madurai (Chord Line)",
        "journeys": _passenger_history
    }

@router.post("/travel-history")
def record_journey(journey: PassengerJourney):
    """Records a new passenger journey."""
    j_dict = journey.dict()
    # Prepend to history
    _passenger_history.insert(0, j_dict)
    return {
        "status": "recorded",
        "message": f"Journey on {journey.train_number} {journey.train_name} logged successfully.",
        "journey": j_dict
    }

@router.delete("/travel-history/{journey_id}")
def delete_journey(journey_id: str):
    """Removes a journey from travel history."""
    global _passenger_history
    _passenger_history = [t for t in _passenger_history if t["id"] != journey_id]
    return {
        "status": "deleted",
        "remaining_count": len(_passenger_history)
    }
