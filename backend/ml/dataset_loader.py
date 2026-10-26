"""
Dataset Loader for RailForecastAI ML Pipeline.
Loads, validates, and cleans historical Indian Railways section run records.
"""

import json
import logging
import os
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, Optional

logger = logging.getLogger("ml_dataset_loader")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "train_features.csv")
JSON_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "historical_runs.json")

def load_railway_dataset(filepath: Optional[str] = None) -> pd.DataFrame:
    """
    Loads historical railway run records from CSV or JSON processed dataset.
    Validates presence of essential railway operational columns.
    """
    target_path = filepath or CSV_PATH
    if not os.path.exists(target_path):
        if os.path.exists(JSON_PATH):
            target_path = JSON_PATH
        else:
            raise FileNotFoundError(f"Railway dataset not found at {CSV_PATH} or {JSON_PATH}")

    logger.info(f"Loading railway historical dataset from {target_path}...")
    if target_path.endswith(".csv"):
        df = pd.read_csv(target_path)
    else:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        df = pd.DataFrame(data)

    print(f"Loaded raw dataset with {len(df)} records and {len(df.columns)} columns.")
    df = clean_and_validate_dataset(df)
    return df

def clean_and_validate_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validates data, handles missing values, cleans outliers,
    and ensures numerical types for delay and distance targets.
    """
    df = df.copy()

    # Required columns map or check
    required_cols = [
        "train_id",
        "current_delay_min",
        "distance_to_destination_km",
        "target_speed_kmh",
        "arrival_delay_at_next_min"
    ]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing mandatory column: {col} in railway dataset")

    # Clean numeric columns
    numeric_cols = [
        "section_distance_km",
        "distance_to_destination_km",
        "current_delay_min",
        "previous_station_delay_min",
        "target_speed_kmh",
        "actual_section_time_min",
        "arrival_delay_at_next_min",
        "scheduled_section_time_min",
        "nominal_section_time_min",
        "remaining_stations"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # Impute previous station delay if missing
    if "previous_station_delay_min" in df.columns and "current_delay_min" in df.columns:
        df["previous_station_delay_min"] = df["previous_station_delay_min"].fillna(df["current_delay_min"])

    # Categorical defaults
    if "weather_condition" in df.columns:
        df["weather_condition"] = df["weather_condition"].fillna("clear").astype(str).str.lower()
    else:
        df["weather_condition"] = "clear"

    if "congestion_level" in df.columns:
        df["congestion_level"] = df["congestion_level"].fillna("low").astype(str).str.lower()
    else:
        df["congestion_level"] = "low"

    # Drop extreme unphysical anomalies (e.g. negative distance or delays > 24 hours)
    df = df[df["distance_to_destination_km"] >= 0]
    df = df[df["arrival_delay_at_next_min"].between(-30, 1440)]

    print(f"Validated clean dataset with {len(df)} valid operational records.")
    return df

if __name__ == "__main__":
    df = load_railway_dataset()
    print("Dataset Summary:")
    print(df[["current_delay_min", "arrival_delay_at_next_min", "target_speed_kmh"]].describe())
