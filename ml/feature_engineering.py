"""
Feature Engineering for Dynamic ETA Forecast Engine.
Transforms raw operational state and historical train run logs into model-ready features.
"""

import math

CONGESTION_MAP = {"low": 0.0, "medium": 0.5, "high": 1.0}
WEATHER_MAP = {"clear": 0.0, "rain": 0.3, "fog": 0.7, "heavy_rain": 1.0}
TRAIN_TYPE_PRIORITY = {
    "Vande Bharat": 1.0,
    "Rajdhani Express": 1.0,
    "Shatabdi": 1.0,
    "Superfast Express": 0.75,
    "Mail/Express": 0.5,
    "Passenger/MEMU": 0.25
}

FEATURE_COLUMNS = [
    "section_distance_km",
    "nominal_section_time_min",
    "scheduled_section_time_min",
    "current_delay_min",
    "previous_station_delay_min",
    "distance_to_destination_km",
    "remaining_stations",
    "priority_score",
    "target_speed_kmh",
    "time_of_day_sin",
    "time_of_day_cos",
    "day_of_week",
    "is_peak_hour",
    "congestion_score",
    "has_tsr",
    "weather_score",
    "scheduled_dwell_min"
]

def extract_features_from_dict(row: dict) -> list:
    """Extract and normalize a single sample's numerical feature vector."""
    time_of_day = float(row.get("time_of_day", 12))
    tod_sin = math.sin(2 * math.pi * time_of_day / 24.0)
    tod_cos = math.cos(2 * math.pi * time_of_day / 24.0)
    
    t_type = row.get("train_type", "Superfast Express")
    priority_score = TRAIN_TYPE_PRIORITY.get(t_type, 0.5)
    if "priority" in row and row["priority"] == 1:
        priority_score = 1.0
        
    congestion = row.get("congestion_level", "low")
    congestion_score = CONGESTION_MAP.get(congestion, 0.0)
    
    weather = row.get("weather_condition", "clear")
    weather_score = WEATHER_MAP.get(weather, 0.0)
    
    has_tsr = 1.0 if row.get("has_tsr", 0) or row.get("has_speed_restriction", False) else 0.0
    
    return [
        float(row.get("section_distance_km", 50.0)),
        float(row.get("nominal_section_time_min", 40.0)),
        float(row.get("scheduled_section_time_min", 44.0)),
        float(row.get("current_delay_min", 0.0)),
        float(row.get("previous_station_delay_min", 0.0)),
        float(row.get("distance_to_destination_km", 200.0)),
        float(row.get("remaining_stations", 5)),
        float(priority_score),
        float(row.get("target_speed_kmh", 80.0)),
        tod_sin,
        tod_cos,
        float(row.get("day_of_week", 2)),
        float(row.get("is_peak_hour", 0)),
        float(congestion_score),
        float(has_tsr),
        float(weather_score),
        float(row.get("scheduled_dwell_min", 2.0))
    ]

def get_feature_names() -> list:
    return list(FEATURE_COLUMNS)
