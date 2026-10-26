"""
Dynamic ETA Inference Engine with ML & Statistical Fallback.
Calculates station-by-station dynamic arrival times, confidence intervals,
delay contributors breakdown, and recovery dynamics.
"""

import json
import math
import os
from datetime import datetime, timedelta

class DynamicETAPredictor:
    def __init__(self, models_dir="ml/models", data_dir="data"):
        self.models_dir = models_dir
        self.data_dir = data_dir
        self.sklearn_model = None
        self.ml_weights = None
        self.metrics = None
        self.load_models()
        
    def load_models(self):
        pkl_path = os.path.join(self.models_dir, "gradient_boosting_model.pkl")
        weights_path = os.path.join(self.models_dir, "model_weights.json")
        metrics_path = os.path.join(self.models_dir, "metrics.json")
        
        if os.path.exists(pkl_path):
            try:
                import joblib
                self.sklearn_model = joblib.load(pkl_path)
            except Exception as e:
                print(f"Notice: Could not load sklearn pkl, using weights: {e}")

        if os.path.exists(weights_path):
            with open(weights_path, "r") as f:
                self.ml_weights = json.load(f)
                
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                self.metrics = json.load(f)

    def predict_section_time(self, features: dict) -> tuple[float, str]:
        """
        Predicts travel time for a single section.
        Returns (predicted_minutes, prediction_source: 'ML' | 'Statistical Fallback')
        """
        nominal = float(features.get("nominal_section_time_min", 30.0))
        dist = float(features.get("section_distance_km", 40.0))
        current_speed = max(float(features.get("target_speed_kmh", 80.0)), 20.0)
        congestion = features.get("congestion_level", "low")
        has_tsr = bool(features.get("has_tsr", False) or features.get("has_speed_restriction", False))
        weather = features.get("weather_condition", "clear")
        priority = int(features.get("priority", 2))
        
        # 1. If trained sklearn GradientBoostingRegressor is loaded:
        if self.sklearn_model is not None:
            try:
                from ml.feature_engineering import extract_features_from_dict
            except ImportError:
                from feature_engineering import extract_features_from_dict
            raw_vec = extract_features_from_dict(features)
            pred_time = float(self.sklearn_model.predict([raw_vec])[0])
            min_physical_time = (dist / 135.0) * 60.0
            pred_time = max(min_physical_time, pred_time)
            return round(pred_time, 1), "ML"

        # 2. If numerical model weights available:
        if self.ml_weights:
            try:
                from ml.feature_engineering import extract_features_from_dict
            except ImportError:
                from feature_engineering import extract_features_from_dict
            raw_vec = extract_features_from_dict(features)
            means = self.ml_weights["means"]
            stds = self.ml_weights["stds"]
            weights = self.ml_weights["weights"]
            bias = self.ml_weights["bias"]
            
            x_norm = [(raw_vec[j] - means[j]) / stds[j] for j in range(len(weights))]
            pred_time = bias + sum(w * x for w, x in zip(weights, x_norm))
            
            # Physics constraint: train cannot travel faster than theoretical max physical speed
            min_physical_time = (dist / 135.0) * 60.0
            pred_time = max(min_physical_time, pred_time)
            return round(pred_time, 1), "ML"
            
        # Statistical Fallback
        base_time = (dist / current_speed) * 60.0
        congestion_penalty = 12.0 if congestion == "high" else (5.0 if congestion == "medium" else 0.0)
        tsr_penalty = 6.0 if has_tsr else 0.0
        weather_penalty = 8.0 if weather == "heavy_rain" else (10.0 if weather == "fog" else 0.0)
        
        total_time = base_time + congestion_penalty + tsr_penalty + weather_penalty
        return round(total_time, 1), "Statistical fallback"

    def calculate_dynamic_eta(self, train: dict, route: dict, current_section_idx: int, 
                              active_events: list = None, base_time: datetime = None) -> dict:
        """
        Calculates the complete dynamic ETA forecast for all upcoming stations on the route.
        """
        if base_time is None:
            base_time = datetime.now()
            
        stations = route["stations"]
        distances = route["distances"]
        total_stations = len(stations)
        current_section_idx = max(0, min(current_section_idx, max(0, total_stations - 2)))
        
        current_delay = float(train.get("current_delay_min", 18.0))
        previous_delay = float(train.get("previous_station_delay_min", current_delay))
        current_speed = float(train.get("current_speed_kmh", 75.0))
        train_type = train.get("type", "Superfast Express")
        priority = int(train.get("priority", 2))
        
        # Collect active section overrides / conditions from active_events
        section_overrides = {}
        if active_events:
            for ev in active_events:
                s_id = ev.get("section_id")
                if s_id:
                    section_overrides[s_id] = ev

        running_time_accum = base_time
        curr_dist = distances[current_section_idx]
        total_dest_dist = distances[-1]
        
        station_predictions = []
        accumulated_additional_delay = 0.0
        
        # Accumulators for contributor factors
        total_signal_delay = 0.0
        total_tsr_delay = 0.0
        total_traffic_delay = 0.0
        total_dwell_delay = 0.0
        total_weather_delay = 0.0
        
        # Analyze recovery propensity
        recovery_rate_per_section = round(previous_delay - current_delay, 1)
        
        for idx in range(current_section_idx, total_stations - 1):
            st_from = stations[idx]
            st_to = stations[idx + 1]
            sec_dist = distances[idx + 1] - distances[idx]
            rem_dest_dist = total_dest_dist - distances[idx + 1]
            rem_stations = total_stations - 1 - (idx + 1)
            sec_id = f"SEC_{st_from}_{st_to}"
            
            # Check override or default section condition
            override = section_overrides.get(sec_id, {})
            congestion = override.get("congestion_level", train.get("congestion_level", "low"))
            has_tsr = override.get("has_tsr", False) or override.get("has_speed_restriction", False)
            weather = override.get("weather_condition", "clear")
            
            # Contributor impacts for this section
            sec_signal = 7.0 if congestion == "high" else (3.0 if congestion == "medium" else 0.0)
            sec_traffic = 5.0 if congestion == "high" else (2.0 if congestion == "medium" else 0.0)
            sec_tsr = 5.0 if has_tsr else 0.0
            sec_weather = 7.0 if weather == "heavy_rain" else (9.0 if weather == "fog" else 0.0)
            sec_dwell = 2.0 if st_to in ["JTJ", "ED", "SA", "KPD", "BPL", "NGP", "BRC", "CNB"] else 1.0
            
            total_signal_delay += sec_signal
            total_traffic_delay += sec_traffic
            total_tsr_delay += sec_tsr
            total_weather_delay += sec_weather
            total_dwell_delay += (sec_dwell - 1.0)
            
            nominal_time = (sec_dist / 85.0) * 60.0
            sched_time = nominal_time * 1.08
            
            features = {
                "section_distance_km": sec_dist,
                "nominal_section_time_min": nominal_time,
                "scheduled_section_time_min": sched_time,
                "current_delay_min": current_delay + accumulated_additional_delay,
                "previous_station_delay_min": current_delay,
                "distance_to_destination_km": rem_dest_dist,
                "remaining_stations": rem_stations,
                "train_type": train_type,
                "priority": priority,
                "target_speed_kmh": current_speed if not has_tsr else min(current_speed, 45.0),
                "time_of_day": running_time_accum.hour,
                "day_of_week": running_time_accum.weekday(),
                "is_peak_hour": 1 if running_time_accum.hour in [8, 9, 10, 17, 18, 19, 20] else 0,
                "congestion_level": congestion,
                "has_tsr": 1 if has_tsr else 0,
                "weather_condition": weather,
                "scheduled_dwell_min": sec_dwell
            }
            
            pred_sec_time, engine_src = self.predict_section_time(features)
            
            # Scheduled time calculation: use authentic timetable if available
            sched_entry = next((s for s in train.get("schedule", []) if s.get("station_code") == st_to), None)
            if sched_entry and sched_entry.get("scheduled_arrival"):
                try:
                    arr_parts = list(map(int, sched_entry["scheduled_arrival"].split(":")))
                    sched_eta = base_time.replace(hour=arr_parts[0], minute=arr_parts[1], second=0, microsecond=0)
                    if sched_entry.get("day", 1) == 2:
                        sched_eta += timedelta(days=1)
                except Exception:
                    station_sched_offset_min = sum((distances[j+1] - distances[j]) / 85.0 * 60.0 * 1.08 + 2.0 for j in range(idx + 1))
                    sched_eta = base_time + timedelta(minutes=station_sched_offset_min)
            else:
                station_sched_offset_min = sum((distances[j+1] - distances[j]) / 85.0 * 60.0 * 1.08 + 2.0 for j in range(idx + 1))
                sched_eta = base_time + timedelta(minutes=station_sched_offset_min)
            
            # Dynamic predicted time
            sec_delay_delta = (pred_sec_time + sec_dwell) - (sched_time + 2.0)
            accumulated_additional_delay += sec_delay_delta
            
            # Confidence decay with horizon distance and uncertainty
            hops = idx - current_section_idx + 1
            base_conf = max(0.65, 0.95 - (hops * 0.03))
            if congestion == "high":
                base_conf -= 0.08
            if has_tsr:
                base_conf -= 0.05
            confidence = round(max(0.60, min(0.98, base_conf)), 2)
            
            # Predicted arrival time
            pred_arrival_delay = max(0.0, round(current_delay + accumulated_additional_delay, 1))
            predicted_eta = sched_eta + timedelta(minutes=pred_arrival_delay)
            
            # Confidence bounds (+/- variance proportional to 1 - confidence)
            uncertainty_margin = (1.0 - confidence) * 22.0
            range_lower = predicted_eta - timedelta(minutes=uncertainty_margin)
            range_upper = predicted_eta + timedelta(minutes=uncertainty_margin * 1.2)
            
            station_predictions.append({
                "station_code": st_to,
                "station_index": idx + 1,
                "distance_from_origin_km": distances[idx + 1],
                "scheduled_eta": sched_eta.strftime("%H:%M"),
                "scheduled_eta_iso": sched_eta.isoformat(),
                "predicted_eta": predicted_eta.strftime("%H:%M"),
                "predicted_eta_iso": predicted_eta.isoformat(),
                "platform": sched_entry.get("platform", "1") if sched_entry else "1",
                "delay_minutes": int(round(pred_arrival_delay)),
                "confidence": confidence,
                "confidence_percent": int(confidence * 100),
                "range_lower": range_lower.strftime("%H:%M"),
                "range_upper": range_upper.strftime("%H:%M"),
                "predicted_section_time_min": pred_sec_time,
                "engine_source": engine_src
            })

        # Destination metrics
        dest_pred = station_predictions[-1] if station_predictions else {
            "predicted_eta": base_time.strftime("%H:%M"),
            "delay_minutes": int(current_delay),
            "confidence": 0.85,
            "range_lower": base_time.strftime("%H:%M"),
            "range_upper": base_time.strftime("%H:%M")
        }
        
        total_pred_impact = round(total_signal_delay + total_traffic_delay + total_tsr_delay + total_dwell_delay + total_weather_delay, 1)
        
        # Recovery message
        if recovery_rate_per_section > 1.5:
            recovery_status = f"Train is currently recovering approximately {recovery_rate_per_section:.1f} minutes per section."
            is_recovering = True
        elif recovery_rate_per_section < -1.5:
            recovery_status = f"Train delay is increasing by approximately {abs(recovery_rate_per_section):.1f} minutes per section."
            is_recovering = False
        else:
            recovery_status = "Train delay is currently stable across sections."
            is_recovering = False

        return {
            "train_id": train.get("number", "12627"),
            "train_name": train.get("name", "Karnataka Express"),
            "current_location": train.get("current_location", "Near Erode"),
            "current_speed_kmh": current_speed,
            "current_delay_minutes": int(round(current_delay)),
            "destination": stations[-1],
            "predicted_destination_delay_minutes": dest_pred["delay_minutes"],
            "expected_additional_delay_minutes": max(0, dest_pred["delay_minutes"] - int(round(current_delay))),
            "predicted_eta": dest_pred["predicted_eta"],
            "confidence": dest_pred["confidence"],
            "confidence_percent": int(dest_pred["confidence"] * 100),
            "prediction_range": {
                "lower": dest_pred["range_lower"],
                "upper": dest_pred["range_upper"]
            },
            "recovery_info": {
                "is_recovering": is_recovering,
                "recovery_rate_per_section": recovery_rate_per_section,
                "status_text": recovery_status
            },
            "delay_contributors": [
                {"factor": "Signal congestion", "impact_minutes": round(total_signal_delay, 1), "category": "Signalling"},
                {"factor": "Downstream traffic", "impact_minutes": round(total_traffic_delay, 1), "category": "Traffic"},
                {"factor": "Temporary speed restriction", "impact_minutes": round(total_tsr_delay, 1), "category": "Track"},
                {"factor": "Extended station dwell", "impact_minutes": round(total_dwell_delay, 1), "category": "Station Ops"},
                {"factor": "Weather / Visibility impact", "impact_minutes": round(total_weather_delay, 1), "category": "Weather"}
            ],
            "total_predicted_impact_minutes": total_pred_impact,
            "stations": station_predictions,
            "prediction_source": station_predictions[0]["engine_source"] if station_predictions else "ML"
        }

predictor = DynamicETAPredictor()
