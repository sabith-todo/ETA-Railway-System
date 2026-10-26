"""
Connection Risk Evaluation API Endpoints.
Evaluates inter-train transfer feasibility using dynamic AI ETA forecasts
rather than deceptive static timetable schedules.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.models.schemas import (
    ConnectionCheckRequest, 
    ConnectionCheckResponse,
    TransferStationInfo,
    PopularConnectionPair
)
from backend.app.services.data_provider import data_provider
from backend.app.database.db import get_db

router = APIRouter(prefix="/api/connections", tags=["Connection Risk Planner"])

@router.get("/popular", response_model=List[PopularConnectionPair])
def get_popular_connections():
    """Returns curated popular / showcase connection pairs for live demo."""
    return [
        PopularConnectionPair(
            id="CONN_1",
            title="Salem Junction Trunk Interchange",
            arriving_train_id="12627",
            arriving_train_name="Karnataka Express",
            connecting_train_id="12675",
            connecting_train_name="Kovai Superfast Express",
            transfer_station_code="SA",
            transfer_station_name="Salem Junction",
            description="Transfer from Karnataka Express to Kovai SF towards Coimbatore. Evaluates delay impact on platform interchange."
        ),
        PopularConnectionPair(
            id="CONN_2",
            title="Erode Junction Cross-Connection",
            arriving_train_id="12675",
            arriving_train_name="Kovai Superfast Express",
            connecting_train_id="12679",
            connecting_train_name="Coimbatore Intercity",
            transfer_station_code="ED",
            transfer_station_name="Erode Junction",
            description="Interchange between Kovai SF Express and Coimbatore Intercity on the Southern Trunk corridor."
        ),
        PopularConnectionPair(
            id="CONN_3",
            title="Katpadi Junction Feeder Transfer",
            arriving_train_id="12007",
            arriving_train_name="Shatabdi Express",
            connecting_train_id="12675",
            connecting_train_name="Kovai Superfast Express",
            transfer_station_code="KPD",
            transfer_station_name="Katpadi Junction",
            description="Feeder transfer between Chennai-Bengaluru Shatabdi and Coimbatore-bound Kovai Express."
        ),
        PopularConnectionPair(
            id="CONN_4",
            title="Jolarpettai Junction Link",
            arriving_train_id="12627",
            arriving_train_name="Karnataka Express",
            connecting_train_id="20607",
            connecting_train_name="Vande Bharat Express",
            transfer_station_code="JTJ",
            transfer_station_name="Jolarpettai Junction",
            description="Transfer at the key junction linking the Salem and Bengaluru trunk corridors."
        ),
        PopularConnectionPair(
            id="CONN_5",
            title="Tiruchirappalli Junction Grand Chord Interchange",
            arriving_train_id="12635",
            arriving_train_name="Vaigai Superfast Express",
            connecting_train_id="12631",
            connecting_train_name="Nellai Superfast Express",
            transfer_station_code="TPJ",
            transfer_station_name="Tiruchirappalli Junction",
            description="Interchange between Vaigai SF and Nellai SF connecting Central Tamil Nadu to the Deep South."
        )
    ]

@router.get("/transfer-stations", response_model=List[TransferStationInfo])
def get_transfer_stations(
    arriving_train_id: str = Query(..., description="Arriving Train Number"),
    connecting_train_id: str = Query(..., description="Connecting Train Number")
):
    """Returns all shared transfer stations between two trains."""
    train_a = data_provider.get_train(arriving_train_id.strip())
    if not train_a:
        raise HTTPException(status_code=404, detail=f"Incoming Train {arriving_train_id} not found.")
        
    train_b = data_provider.get_train(connecting_train_id.strip())
    if not train_b:
        raise HTTPException(status_code=404, detail=f"Connecting Train {connecting_train_id} not found.")

    stations_a = train_a.get("route_stations", [])
    stations_b = train_b.get("route_stations", [])
    common_codes = [st for st in stations_a if st in stations_b]
    
    if not common_codes:
        return []

    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(common_codes))
        cursor.execute(f"SELECT code, name, city, state FROM stations WHERE code IN ({placeholders})", common_codes)
        st_rows = {r["code"]: dict(r) for r in cursor.fetchall()}

    result = []
    for code in common_codes:
        info = st_rows.get(code, {"code": code, "name": code, "city": code, "state": None})
        result.append(TransferStationInfo(
            station_code=code,
            station_name=info["name"],
            city=info["city"],
            state=info.get("state")
        ))
    return result

@router.post("/check-risk", response_model=ConnectionCheckResponse)
def check_connection_risk(req: ConnectionCheckRequest):
    train_a = data_provider.get_train(req.arriving_train_id.strip())
    if not train_a:
        raise HTTPException(status_code=404, detail=f"Incoming Train {req.arriving_train_id} not found.")
        
    train_b = data_provider.get_train(req.connecting_train_id.strip())
    if not train_b:
        raise HTTPException(status_code=404, detail=f"Connecting Train {req.connecting_train_id} not found.")
        
    stations_a = train_a.get("route_stations", [])
    stations_b = train_b.get("route_stations", [])
    common_stations = [st for st in stations_a if st in stations_b]
    
    if not common_stations:
        raise HTTPException(
            status_code=400,
            detail=f"Trains {train_a['number']} ({train_a['name']}) and {train_b['number']} ({train_b['name']}) do not share any common transfer stations."
        )

    transfer_st = req.transfer_station_code.strip().upper()
    if transfer_st not in stations_a:
        raise HTTPException(
            status_code=400,
            detail=f"Transfer station '{transfer_st}' is not on Incoming Train {train_a['number']}'s route. Common transfer stations: {', '.join(common_stations)}"
        )
    if transfer_st not in stations_b:
        raise HTTPException(
            status_code=400,
            detail=f"Transfer station '{transfer_st}' is not on Connecting Train {train_b['number']}'s route. Common transfer stations: {', '.join(common_stations)}"
        )
    if transfer_st == train_b.get("destination") and transfer_st != train_b.get("origin"):
        raise HTTPException(
            status_code=400,
            detail=f"Station '{transfer_st}' is Connecting Train {train_b['number']}'s final destination. Passengers cannot board this train for onward connection."
        )

    # Station Details
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT code, name, city, platforms FROM stations WHERE code = ?", (transfer_st,))
        st_row = cursor.fetchone()
        st_name = st_row["name"] if st_row else transfer_st
        total_plats = st_row["platforms"] if st_row else 4

    # Dynamic ETA for Train A
    eta_a = data_provider.get_dynamic_eta(req.arriving_train_id.strip())
    if not eta_a:
        raise HTTPException(status_code=400, detail="Could not calculate dynamic ETA for incoming train.")

    matched_st_a = next((s for s in eta_a["stations"] if s["station_code"] == transfer_st), None)
    
    now = datetime.now()
    if matched_st_a:
        pred_arr_str = matched_st_a["predicted_eta"]
        sched_arr_str = matched_st_a["scheduled_eta"]
        delay_a = matched_st_a["delay_minutes"]
        conf_a = matched_st_a.get("confidence_percent", 85)
    else:
        # If train is already at or past transfer_st
        cur_idx_a = train_a.get("current_station_idx", 0)
        idx_in_route_a = stations_a.index(transfer_st) if transfer_st in stations_a else -1
        if idx_in_route_a <= cur_idx_a:
            return ConnectionCheckResponse(
                arriving_train_id=train_a["number"],
                arriving_train_name=train_a["name"],
                predicted_arrival_time=now.strftime("%H:%M"),
                scheduled_arrival_time=now.strftime("%H:%M"),
                arriving_delay_minutes=int(train_a.get("current_delay_min", 0)),
                arriving_confidence_percent=95,
                connecting_train_id=train_b["number"],
                connecting_train_name=train_b["name"],
                scheduled_departure_time=now.strftime("%H:%M"),
                predicted_departure_time=now.strftime("%H:%M"),
                connecting_delay_minutes=int(train_b.get("current_delay_min", 0)),
                connecting_confidence_percent=95,
                transfer_station=transfer_st,
                transfer_station_name=st_name,
                scheduled_transfer_minutes=0,
                available_transfer_minutes=0,
                buffer_margin_minutes=-req.minimum_buffer_minutes,
                platform_arriving=1,
                platform_connecting=2,
                cross_platform_transfer=False,
                status="Missed",
                recommendation=f"❌ Train {train_a['number']} has already departed/passed station {st_name} ({transfer_st}). Transfer is no longer feasible."
            )
        else:
            pred_arr_str = eta_a["predicted_eta"]
            sched_arr_str = eta_a["predicted_eta"]
            delay_a = eta_a["predicted_destination_delay_minutes"]
            conf_a = eta_a.get("confidence_percent", 80)

    # Dynamic ETA for Train B
    eta_b = data_provider.get_dynamic_eta(req.connecting_train_id.strip())
    matched_st_b = next((s for s in eta_b["stations"] if s["station_code"] == transfer_st), None) if eta_b else None

    # Parse scheduled and predicted times
    def parse_time(t_str: str) -> datetime:
        try:
            h, m = map(int, t_str.split(":"))
            return now.replace(hour=h, minute=m, second=0, microsecond=0)
        except Exception:
            return now + timedelta(minutes=30)

    arr_dt = parse_time(pred_arr_str)
    sched_arr_dt = parse_time(sched_arr_str)

    # Connecting Train B timings
    # Default scheduled transfer window provided by timetable: 38 minutes
    base_scheduled_window_min = 38
    
    if matched_st_b:
        b_sched_arr = parse_time(matched_st_b["scheduled_eta"])
        b_pred_arr = parse_time(matched_st_b["predicted_eta"])
        delay_b = matched_st_b["delay_minutes"]
        conf_b = matched_st_b.get("confidence_percent", 86)
        # Departure is 3 min dwell after arrival
        sched_dep_dt = b_sched_arr + timedelta(minutes=3)
        pred_dep_dt = b_pred_arr + timedelta(minutes=3)
        
        # Verify if timetable delta is within reasonable day range
        raw_sched_diff = int((sched_dep_dt - sched_arr_dt).total_seconds() / 60)
        if 15 <= raw_sched_diff <= 180:
            sched_window_min = raw_sched_diff
        else:
            sched_window_min = base_scheduled_window_min
            sched_dep_dt = sched_arr_dt + timedelta(minutes=sched_window_min)
            pred_dep_dt = sched_dep_dt + timedelta(minutes=delay_b)
    else:
        delay_b = int(train_b.get("current_delay_min", 0))
        conf_b = 85
        sched_window_min = base_scheduled_window_min
        sched_dep_dt = sched_arr_dt + timedelta(minutes=sched_window_min)
        pred_dep_dt = sched_dep_dt + timedelta(minutes=delay_b)

    sched_dep_str = sched_dep_dt.strftime("%H:%M")
    pred_dep_str = pred_dep_dt.strftime("%H:%M")

    # The actual physical transfer window:
    # Available Window = Scheduled Window - Incoming Delay + Connecting Delay
    diff_minutes = sched_window_min - delay_a + delay_b
    margin = diff_minutes - req.minimum_buffer_minutes

    # Platforms assignment
    plat_a = (hash(train_a["number"]) % total_plats) + 1
    plat_b = (plat_a % total_plats) + 1
    cross_platform = abs(plat_a - plat_b) == 1

    # Evaluation Status and Recommendation
    if margin >= 10:
        status = "Likely"
        recommendation = (
            f"🟢 High Confidence Transfer. AI predicts an available transfer window of {diff_minutes} mins "
            f"(Timetable: {sched_window_min}m). This comfortably exceeds your required {req.minimum_buffer_minutes}-minute buffer. "
            f"Incoming Train {train_a['number']} lands at Platform {plat_a} at {pred_arr_str}, "
            f"Connecting Train {train_b['number']} departs from Platform {plat_b} at {pred_dep_str}."
        )
    elif margin >= 0:
        status = "Moderate Risk"
        recommendation = (
            f"🟡 Tight Buffer. Available transfer window is {diff_minutes} mins (Timetable: {sched_window_min}m, "
            f"eroded by {delay_a}m delay on Train {train_a['number']}). Buffer margin is only {margin} mins. "
            f"Proceed promptly from Platform {plat_a} to Platform {plat_b} upon arrival. "
            f"Any additional delay exceeding {margin}m will cause a missed connection."
        )
    elif diff_minutes > 0:
        status = "At Risk"
        recommendation = (
            f"🔴 High Risk of Missed Connection! Available transfer time is only {diff_minutes} mins, "
            f"which fails to meet your {req.minimum_buffer_minutes}-minute buffer requirement. "
            f"Train {train_a['number']} is running +{delay_a}m late (arriving {pred_arr_str}), "
            f"leaving barely {diff_minutes} mins before Train {train_b['number']} departs at {pred_dep_str}. "
            f"Recommend alerting the Station Controller at {st_name} for a cross-platform rake hold."
        )
    else:
        status = "Missed"
        recommendation = (
            f"❌ Connection Missed. Due to a +{delay_a}m delay on Train {train_a['number']} (arriving {pred_arr_str}), "
            f"Connecting Train {train_b['number']} will have already departed at {pred_dep_str} "
            f"({abs(diff_minutes)} mins prior). Strongly recommend auto-rebooking on subsequent rakes."
        )

    return ConnectionCheckResponse(
        arriving_train_id=train_a["number"],
        arriving_train_name=train_a["name"],
        predicted_arrival_time=pred_arr_str,
        scheduled_arrival_time=sched_arr_str,
        arriving_delay_minutes=delay_a,
        arriving_confidence_percent=conf_a,
        connecting_train_id=train_b["number"],
        connecting_train_name=train_b["name"],
        scheduled_departure_time=sched_dep_str,
        predicted_departure_time=pred_dep_str,
        connecting_delay_minutes=delay_b,
        connecting_confidence_percent=conf_b,
        transfer_station=transfer_st,
        transfer_station_name=st_name,
        scheduled_transfer_minutes=sched_window_min,
        available_transfer_minutes=diff_minutes,
        buffer_margin_minutes=margin,
        platform_arriving=plat_a,
        platform_connecting=plat_b,
        cross_platform_transfer=cross_platform,
        status=status,
        recommendation=recommendation
    )
