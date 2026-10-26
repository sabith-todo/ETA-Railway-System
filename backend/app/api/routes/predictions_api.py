"""
Prediction & Model Status API Endpoints for RailForecastAI.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from backend.ml.predict import (
    predict_delay_minutes,
    calculate_dynamic_eta,
    calculate_operational_risk,
    get_loaded_model
)

router = APIRouter(prefix="/api", tags=["Predictions & Model"])

class ETAPredictionRequest(BaseModel):
    train_number: str = Field(..., example="12635")
    scheduled_eta: str = Field("18:30", example="18:30")
    remaining_distance_km: float = Field(200.0, example=200.0)
    current_speed_kmh: float = Field(75.0, example=75.0)
    current_delay_min: float = Field(5.0, example=5.0)
    previous_station_delay_min: float = Field(4.0, example=4.0)
    station_sequence: int = Field(5, example=5)
    section_avg_speed: float = Field(80.0, example=80.0)

@router.post("/predictions/eta")
def predict_eta_endpoint(req: ETAPredictionRequest):
    """
    Computes dynamic ETA and delay prediction for a given train status.
    """
    pred_delay = predict_delay_minutes(
        train_number=req.train_number,
        station_sequence=req.station_sequence,
        remaining_distance=req.remaining_distance_km,
        current_delay=req.current_delay_min,
        previous_station_delay=req.previous_station_delay_min,
        current_speed=req.current_speed_kmh,
        section_avg_speed=req.section_avg_speed
    )

    eta_calc = calculate_dynamic_eta(
        scheduled_time_str=req.scheduled_eta,
        remaining_distance_km=req.remaining_distance_km,
        current_speed_kmh=req.current_speed_kmh,
        current_delay_min=req.current_delay_min,
        predicted_delay_min=pred_delay
    )

    risk_analysis = calculate_operational_risk(
        current_delay=req.current_delay_min,
        previous_delay=req.previous_station_delay_min,
        current_speed=req.current_speed_kmh,
        remaining_distance=req.remaining_distance_km
    )

    return {
        "train_number": req.train_number,
        "prediction": eta_calc,
        "risk_analysis": risk_analysis,
        "model_used": "Random Forest Regressor (Champion)"
    }

@router.get("/model/status")
def model_status_endpoint():
    """
    Returns current Machine Learning champion model metrics, version, and feature importances.
    """
    _, metadata = get_loaded_model()
    if not metadata:
        return {
            "status": "ready_fallback",
            "message": "Default analytical momentum model active. Run python -m backend.ml.train to compile ML model.",
            "version": "1.0.0"
        }

    return {
        "status": "active",
        "champion_model": metadata.get("champion_model"),
        "version": metadata.get("model_version"),
        "trained_at": metadata.get("trained_at"),
        "dataset_samples": metadata.get("dataset_samples"),
        "test_performance": metadata.get("test_performance"),
        "validation_benchmark": metadata.get("validation_benchmark"),
        "feature_importances": metadata.get("feature_importances")
    }
