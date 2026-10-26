"""
"When Should I Leave?" Departure Recommendation API Endpoint.
Computes optimal passenger home departure time considering travel time,
station buffer, and AI-predicted live train arrival.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import DeparturePlannerRequest, DeparturePlannerResponse
from backend.app.services.data_provider import data_provider

router = APIRouter(prefix="/api/departure", tags=["Departure Planner"])

@router.post("/when-to-leave", response_model=DeparturePlannerResponse)
def compute_when_to_leave(req: DeparturePlannerRequest):
    train = data_provider.get_train(req.train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {req.train_id} not found.")
        
    eta_data = data_provider.get_dynamic_eta(req.train_id)
    if not eta_data:
        raise HTTPException(status_code=400, detail="Could not calculate dynamic ETA.")
        
    st_code = req.station_code.upper()
    matched_st = next((s for s in eta_data["stations"] if s["station_code"] == st_code), None)
    
    now = datetime.now()
    if matched_st:
        sched_time_str = matched_st["scheduled_eta"]
        pred_time_str = matched_st["predicted_eta"]
        delay_min = matched_st["delay_minutes"]
        station_name = matched_st.get("station_name", st_code)
    else:
        sched_time_str = (now + timedelta(minutes=40)).strftime("%H:%M")
        pred_time_str = eta_data["predicted_eta"]
        delay_min = eta_data["predicted_destination_delay_minutes"]
        station_name = st_code
        
    try:
        ph, pm = map(int, pred_time_str.split(":"))
        pred_dt = now.replace(hour=ph, minute=pm, second=0, microsecond=0)
        if pred_dt < now - timedelta(hours=3):
            pred_dt += timedelta(days=1)
    except Exception:
        pred_dt = now + timedelta(minutes=45)
        pred_time_str = pred_dt.strftime("%H:%M")

    # Recommended departure = Predicted Arrival - Travel Time - Buffer
    total_lead_time = req.travel_time_to_station_min + req.desired_station_buffer_min
    rec_leave_dt = pred_dt - timedelta(minutes=total_lead_time)
    rec_leave_str = rec_leave_dt.strftime("%H:%M")
    
    # Compare with static schedule recommendation
    try:
        sh, sm = map(int, sched_time_str.split(":"))
        sched_dt = now.replace(hour=sh, minute=sm, second=0, microsecond=0)
        if sched_dt < now - timedelta(hours=3):
            sched_dt += timedelta(days=1)
        sched_leave_dt = sched_dt - timedelta(minutes=total_lead_time)
        time_saved = max(0, int((rec_leave_dt - sched_leave_dt).total_seconds() / 60))
    except Exception:
        time_saved = max(0, int(delay_min))

    if delay_min > 15:
        advice = f"Train is delayed by {delay_min} mins. You can leave home {time_saved} minutes later than originally scheduled without risking your boarding!"
    elif delay_min > 5:
        advice = f"Train is slightly delayed (+{delay_min}m). Maintain your planned departure schedule with healthy platform margin."
    else:
        advice = "Train is on time. Proceed according to standard timetable schedule."

    return DeparturePlannerResponse(
        train_id=train["number"],
        train_name=train["name"],
        station_code=st_code,
        station_name=station_name,
        scheduled_departure=sched_time_str,
        predicted_departure=pred_time_str,
        current_delay_minutes=delay_min,
        travel_time_min=req.travel_time_to_station_min,
        station_buffer_min=req.desired_station_buffer_min,
        recommended_leave_time=rec_leave_str,
        time_saved_due_to_delay_min=time_saved,
        advice=advice
    )
