"""
Feature Engineering for RailForecastAI Machine Learning Pipeline.
Extracts the 12 required railway operational features:
1. train_number (encoded/hashed)
2. station_sequence
3. distance_from_origin
4. remaining_distance
5. current_delay
6. previous_station_delay
7. current_speed
8. historical_avg_delay
9. section_avg_speed
10. day_of_week
11. month
12. scheduled_hour

Target:
delay_minutes (arrival_delay_at_next_min)
"""

import math
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any

FEATURE_NAMES = [
    "train_number_code",
    "station_sequence",
    "distance_from_origin",
    "remaining_distance",
    "current_delay",
    "previous_station_delay",
    "current_speed",
    "historical_avg_delay",
    "section_avg_speed",
    "day_of_week",
    "month",
    "scheduled_hour"
]

def get_feature_names() -> List[str]:
    """Returns the ordered list of model feature names."""
    return list(FEATURE_NAMES)

def encode_train_number(train_num: Any) -> float:
    """Consistently hashes / encodes train number to numeric float."""
    try:
        s = str(train_num).strip()
        num = int("".join(filter(str.isdigit, s)))
        return float(num % 100000)
    except Exception:
        return float(abs(hash(str(train_num))) % 10000)

def extract_features_from_dataframe(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extracts feature matrix X and target vector y from a cleaned pandas DataFrame.
    """
    X_rows = []
    y_vals = []

    # Precalculate historical average delay per train if available
    train_avg_delays = df.groupby("train_id")["current_delay_min"].mean().to_dict()

    for _, row in df.iterrows():
        train_id = str(row.get("train_id", ""))
        train_code = encode_train_number(train_id)

        # 2. Station sequence (inferred from remaining stations or sequence)
        rem_stations = float(row.get("remaining_stations", 10))
        station_seq = max(1.0, 30.0 - rem_stations)

        # 3. Distance from origin
        sec_dist = float(row.get("section_distance_km", 50.0))
        rem_dist = float(row.get("distance_to_destination_km", 200.0))
        dist_from_origin = max(0.0, 1000.0 - rem_dist)

        # 5. Delays
        curr_delay = float(row.get("current_delay_min", 0.0))
        prev_delay = float(row.get("previous_station_delay_min", curr_delay))

        # 7. Speed
        speed = float(row.get("target_speed_kmh", 75.0))
        sec_speed = max(40.0, float(row.get("target_speed_kmh", 80.0)))

        # 8. Historical average delay
        hist_avg = float(train_avg_delays.get(train_id, 8.5))

        # 10. Temporal features
        day_of_week = float(row.get("day_of_week", 2))
        month = float(row.get("month", 7))  # Default July mid-year monsoon/summer
        sched_hour = float(row.get("time_of_day", 14))

        features = [
            train_code,
            station_seq,
            dist_from_origin,
            rem_dist,
            curr_delay,
            prev_delay,
            speed,
            hist_avg,
            sec_speed,
            day_of_week,
            month,
            sched_hour
        ]
        X_rows.append(features)

        # Target: delay_minutes
        target_delay = float(row.get("arrival_delay_at_next_min", curr_delay))
        y_vals.append(target_delay)

    X = np.array(X_rows, dtype=np.float32)
    y = np.array(y_vals, dtype=np.float32)
    return X, y

def extract_features_single(
    train_number: str,
    station_sequence: int = 5,
    distance_from_origin: float = 150.0,
    remaining_distance: float = 300.0,
    current_delay: float = 5.0,
    previous_station_delay: float = 4.0,
    current_speed: float = 75.0,
    historical_avg_delay: float = 7.5,
    section_avg_speed: float = 80.0,
    day_of_week: int = 2,
    month: int = 7,
    scheduled_hour: int = 14
) -> np.ndarray:
    """
    Extracts features for a single real-time inference request.
    Returns 2D numpy array shaped (1, 12).
    """
    train_code = encode_train_number(train_number)
    feat = [
        train_code,
        float(station_sequence),
        float(distance_from_origin),
        float(remaining_distance),
        float(current_delay),
        float(previous_station_delay),
        float(current_speed),
        float(historical_avg_delay),
        float(section_avg_speed),
        float(day_of_week),
        float(month),
        float(scheduled_hour)
    ]
    return np.array([feat], dtype=np.float32)
