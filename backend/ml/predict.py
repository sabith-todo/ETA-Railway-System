"""
AI ETA Inference, Delay Propagation, and Operational Risk Engine for RailForecastAI.
"""

import os
import json
import joblib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
from backend.ml.feature_engineering import extract_features_single

logger = logging.getLogger("ml_predict")

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
MODEL_PATH = os.path.join(MODEL_DIR, "eta_delay_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

_cached_model = None
_cached_metadata = None

def get_loaded_model():
    """Returns singleton cached ML model instance, loading if necessary."""
    global _cached_model, _cached_metadata
    if _cached_model is None:
        if os.path.exists(MODEL_PATH):
            try:
                _cached_model = joblib.load(MODEL_PATH)
                logger.info(f"Loaded trained ML model from {MODEL_PATH}")
            except Exception as e:
                logger.error(f"Error loading model from {MODEL_PATH}: {e}")
        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _cached_metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metadata from {METADATA_PATH}: {e}")
    return _cached_model, _cached_metadata

def predict_delay_minutes(
    train_number: str,
    station_sequence: int = 5,
    distance_from_origin: float = 150.0,
    remaining_distance: float = 300.0,
    current_delay: float = 5.0,
    previous_station_delay: float = 4.0,
    current_speed: float = 75.0,
    historical_avg_delay: float = 7.0,
    section_avg_speed: float = 80.0,
    day_of_week: int = 2,
    month: int = 7,
    scheduled_hour: int = 14
) -> float:
    """
    Predicts arrival delay at the next station using the trained champion model.
    Falls back gracefully to inertia/momentum baseline if model file is not present.
    """
    model, _ = get_loaded_model()
    if model is not None:
        X = extract_features_single(
            train_number=train_number,
            station_sequence=station_sequence,
            distance_from_origin=distance_from_origin,
            remaining_distance=remaining_distance,
            current_delay=current_delay,
            previous_station_delay=previous_station_delay,
            current_speed=current_speed,
            historical_avg_delay=historical_avg_delay,
            section_avg_speed=section_avg_speed,
            day_of_week=day_of_week,
            month=month,
            scheduled_hour=scheduled_hour
        )
        pred = float(model.predict(X)[0])
        return max(0.0, round(pred, 1))

    # Analytical momentum baseline fallback
    trend = current_delay - previous_station_delay
    baseline_pred = max(0.0, current_delay + (0.3 * trend))
    return round(baseline_pred, 1)

def parse_time_string(time_str: str) -> Optional[datetime]:
    """Parses 'HH:MM' string to datetime (today)."""
    if not time_str:
        return None
    try:
        parts = time_str.strip().split(":")
        now = datetime.now()
        return datetime(now.year, now.month, now.day, int(parts[0]), int(parts[1]))
    except Exception:
        return None

def format_time_string(dt: Optional[datetime]) -> str:
    """Formats datetime to 'HH:MM'."""
    if not dt:
        return "--:--"
    return dt.strftime("%H:%M")

def calculate_dynamic_eta(
    scheduled_time_str: str,
    remaining_distance_km: float,
    current_speed_kmh: float,
    current_delay_min: float,
    predicted_delay_min: float
) -> Dict[str, Any]:
    """
    Calculates:
    1. Baseline Physics ETA
    2. ML Predicted Delay
    3. Final Dynamic ETA = Scheduled ETA + Predicted Delay
    """
    sched_dt = parse_time_string(scheduled_time_str) or datetime.now()
    speed = max(35.0, current_speed_kmh if current_speed_kmh > 10 else 65.0)

    # Baseline physics travel time
    baseline_transit_min = (remaining_distance_km / speed) * 60.0
    baseline_eta_dt = datetime.now() + timedelta(minutes=baseline_transit_min + current_delay_min)

    # ML Dynamic ETA
    dynamic_eta_dt = sched_dt + timedelta(minutes=predicted_delay_min)
    delay_delta_min = round(predicted_delay_min - current_delay_min, 1)

    return {
        "scheduled_eta": scheduled_time_str,
        "baseline_eta": format_time_string(baseline_eta_dt),
        "ai_predicted_eta": format_time_string(dynamic_eta_dt),
        "predicted_delay_min": round(predicted_delay_min, 1),
        "delay_delta_min": delay_delta_min,
        "difference": f"{'+' if predicted_delay_min >= 0 else ''}{round(predicted_delay_min)} min"
    }

def propagate_delay_trajectory(
    train_number: str,
    current_delay_min: float,
    current_station_idx: int,
    schedule: List[Dict[str, Any]],
    current_speed: float = 75.0
) -> List[Dict[str, Any]]:
    """
    Propagates delay progression across all upcoming stations in the route timetable.
    Returns station-wise scheduled vs predicted arrival times with confidence intervals.
    """
    if not schedule:
        return []

    propagated = []
    accumulated_delay = current_delay_min
    prev_delay = current_delay_min
    total_stops = len(schedule)

    now = datetime.now()
    cur_day_of_week = now.weekday()
    cur_month = now.month
    cur_hour = now.hour

    for idx, stop in enumerate(schedule):
        station_code = stop.get("station_code", stop.get("station", stop.get("code", "")))
        station_name = stop.get("station_name", station_code)
        sched_arr = stop.get("scheduled_arrival") or stop.get("arrival") or stop.get("scheduled_departure") or "12:00"
        dist_km = float(stop.get("distance_km", 0.0))

        if idx < current_station_idx:
            # Passed station
            propagated.append({
                "sequence": idx + 1,
                "station_code": station_code,
                "station_name": station_name,
                "status": "PASSED",
                "scheduled_arrival": sched_arr,
                "actual_arrival": sched_arr,
                "delay_min": round(current_delay_min, 1),
                "confidence": 1.0
            })
        elif idx == current_station_idx:
            # Current station
            sched_dt = parse_time_string(sched_arr) or datetime.now()
            pred_dt = sched_dt + timedelta(minutes=accumulated_delay)
            propagated.append({
                "sequence": idx + 1,
                "station_code": station_code,
                "station_name": station_name,
                "status": "CURRENT",
                "scheduled_arrival": sched_arr,
                "predicted_arrival": format_time_string(pred_dt),
                "delay_min": round(accumulated_delay, 1),
                "confidence": 0.95
            })
        else:
            # Upcoming station: apply ML delay propagation
            rem_dist = max(10.0, 500.0 - dist_km)
            pred_step_delay = predict_delay_minutes(
                train_number=train_number,
                station_sequence=idx + 1,
                distance_from_origin=dist_km,
                remaining_distance=rem_dist,
                current_delay=accumulated_delay,
                previous_station_delay=prev_delay,
                current_speed=current_speed,
                day_of_week=cur_day_of_week,
                month=cur_month,
                scheduled_hour=cur_hour
            )

            # Decay or compound towards destination
            prev_delay = accumulated_delay
            accumulated_delay = pred_step_delay

            sched_dt = parse_time_string(sched_arr) or datetime.now()
            pred_dt = sched_dt + timedelta(minutes=accumulated_delay)
            
            # Confidence decreases slightly with distance into future
            distance_ahead = idx - current_station_idx
            confidence = max(0.60, round(0.95 - (distance_ahead * 0.03), 2))

            propagated.append({
                "sequence": idx + 1,
                "station_code": station_code,
                "station_name": station_name,
                "status": "UPCOMING",
                "scheduled_arrival": sched_arr,
                "predicted_arrival": format_time_string(pred_dt),
                "delay_min": round(accumulated_delay, 1),
                "confidence": confidence
            })

    return propagated

def calculate_operational_risk(
    current_delay: float,
    previous_delay: float,
    current_speed: float,
    max_section_speed: float = 110.0,
    remaining_distance: float = 200.0,
    historical_section_delay: float = 8.0
) -> Dict[str, Any]:
    """
    Calculates an operational risk classification:
    - LOW: Train on time or steadily recovering
    - MEDIUM: Moderate delay (10-25 min) or speed restrictions
    - HIGH: Severe delay (>25 min), worsening trend, or high congestion

    Provides transparent, data-driven reasons.
    """
    delay_trend = current_delay - previous_delay
    reasons: List[str] = []
    risk_score = 0

    # 1. Delay magnitude
    if current_delay > 25:
        risk_score += 40
        reasons.append(f"Current delay: +{int(current_delay)} min (above high risk threshold)")
    elif current_delay > 10:
        risk_score += 20
        reasons.append(f"Current delay: +{int(current_delay)} min")
    elif current_delay > 0:
        risk_score += 5
        reasons.append(f"Minor delay: +{int(current_delay)} min")
    else:
        reasons.append("Train running strictly on time")

    # 2. Delay trend (momentum)
    if delay_trend > 5:
        risk_score += 25
        reasons.append(f"Delay compounding: added {int(delay_trend)} min since previous station")
    elif delay_trend < -2:
        risk_score -= 10
        reasons.append("Train actively recovering timetable buffer in open corridor")
    elif delay_trend > 0:
        reasons.append("Delay slightly increasing (+1-4 min)")

    # 3. Speed deficit
    speed_ratio = current_speed / max(max_section_speed, 60.0)
    if speed_ratio < 0.60:
        risk_score += 25
        reasons.append(f"Speed deficit: running at {int(current_speed)} km/h vs {int(max_section_speed)} km/h limit")
    elif speed_ratio < 0.85:
        risk_score += 10
        reasons.append("Speed slightly below track sectional capability")
    else:
        reasons.append(f"Operating at cruising speed ({int(current_speed)} km/h)")

    # 4. Historical corridor risk
    if historical_section_delay > 15:
        risk_score += 15
        reasons.append("Approaching historically bottlenecked junction section")

    # Classify
    if risk_score >= 50 or current_delay >= 30:
        level = "HIGH"
    elif risk_score >= 25 or current_delay >= 12:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "level": level,
        "score": min(100, max(0, risk_score)),
        "reasons": reasons,
        "disclaimer": "Operational risk analysis is derived from telemetry velocity, historical section latency, and delay momentum. Not an official Indian Railways classification."
    }
