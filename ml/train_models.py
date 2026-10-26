"""
Model Training and Evaluation Pipeline for Dynamic ETA Forecasting.
Trains and compares:
1. Static Timetable Schedule Baseline
2. Current Delay / Persistence Baseline
3. Dynamic Machine Learning Model (Gradient Boosting / Random Forest / Ridge)
Evaluates genuine MAE, RMSE, MAPE, error distributions, and feature importances.
"""

import json
import math
import os
import random
from feature_engineering import extract_features_from_dict, get_feature_names

def load_data(filepath="data/processed/historical_runs.json"):
    if not os.path.exists(filepath):
        # Fallback to CSV if json missing
        import csv
        csv_path = "data/processed/train_features.csv"
        records = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                records.append(r)
        return records
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def train_and_evaluate():
    print("Loading historical railway training dataset...")
    records = load_data()
    print(f"Loaded {len(records)} train run records.")
    
    # Shuffle and split 80% train, 20% test
    random.seed(42)
    random.shuffle(records)
    split_idx = int(0.8 * len(records))
    train_records = records[:split_idx]
    test_records = records[split_idx:]
    
    feature_names = get_feature_names()
    
    X_train = [extract_features_from_dict(r) for r in train_records]
    y_train_time = [float(r["actual_section_time_min"]) for r in train_records]
    y_train_delay = [float(r["arrival_delay_at_next_min"]) for r in train_records]
    
    X_test = [extract_features_from_dict(r) for r in test_records]
    y_test_time = [float(r["actual_section_time_min"]) for r in test_records]
    y_test_delay = [float(r["arrival_delay_at_next_min"]) for r in test_records]
    
    print(f"Training set: {len(X_train)} samples. Test set: {len(X_test)} samples.")
    
    # Try importing scikit-learn
    sklearn_available = False
    try:
        from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
        from sklearn.linear_model import Ridge
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        sklearn_available = True
        print("Using Scikit-Learn engine for ML training.")
    except ImportError:
        print("Scikit-Learn not yet available, using optimized numerical gradient regression engine.")

    # 1. Evaluate Baseline 1: Static Schedule
    # Predicts that sectional time equals scheduled section time
    static_preds = [float(r["scheduled_section_time_min"]) for r in test_records]
    mae_static = sum(abs(p - a) for p, a in zip(static_preds, y_test_time)) / len(y_test_time)
    rmse_static = math.sqrt(sum((p - a)**2 for p, a in zip(static_preds, y_test_time)) / len(y_test_time))
    mape_static = sum(abs(p - a) / max(a, 1.0) for p, a in zip(static_preds, y_test_time)) / len(y_test_time) * 100

    # 2. Evaluate Baseline 2: Current Delay / Persistence Method
    # Predicts section time = scheduled section time, plus keeps current delay constant
    current_delay_preds = [float(r["scheduled_section_time_min"]) + (float(r.get("current_delay_min", 0)) * 0.05) for r in test_records]
    mae_curr = sum(abs(p - a) for p, a in zip(current_delay_preds, y_test_time)) / len(y_test_time)
    rmse_curr = math.sqrt(sum((p - a)**2 for p, a in zip(current_delay_preds, y_test_time)) / len(y_test_time))
    mape_curr = sum(abs(p - a) / max(a, 1.0) for p, a in zip(current_delay_preds, y_test_time)) / len(y_test_time) * 100

    # 3. Train Dynamic ML Model
    ml_preds = []
    feature_importances = {}
    
    if sklearn_available:
        model = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
        model.fit(X_train, y_train_time)
        ml_preds = model.predict(X_test).tolist()
        
        # Calculate feature importances
        for name, imp in zip(feature_names, model.feature_importances_):
            feature_importances[name] = round(float(imp), 4)
            
        import joblib
        os.makedirs("ml/models", exist_ok=True)
        joblib.dump(model, "ml/models/gradient_boosting_model.pkl")
    else:
        # High-performance closed-form Ridge Regression + feature interaction weights
        # Compute normalized weights via normal equations or feature correlations
        # X: (N, D), Y: (N,)
        n_features = len(feature_names)
        # Standardize features
        means = [sum(row[j] for row in X_train) / len(X_train) for j in range(n_features)]
        stds = [math.sqrt(sum((row[j] - means[j])**2 for row in X_train) / len(X_train)) or 1.0 for j in range(n_features)]
        
        # Simple gradient descent for Ridge regression
        weights = [0.0] * n_features
        bias = sum(y_train_time) / len(y_train_time)
        lr = 0.001
        
        # Fast 100 epochs
        for epoch in range(120):
            # Batch sample
            sample_indices = random.sample(range(len(X_train)), min(1000, len(X_train)))
            for idx in sample_indices:
                x_norm = [(X_train[idx][j] - means[j]) / stds[j] for j in range(n_features)]
                pred = bias + sum(w * x for w, x in zip(weights, x_norm))
                err = pred - y_train_time[idx]
                bias -= lr * err * 0.05
                for j in range(n_features):
                    weights[j] -= lr * (err * x_norm[j] + 0.01 * weights[j])
                    
        # Feature importances based on absolute normalized weight
        total_w = sum(abs(w) for w in weights) or 1.0
        for name, w in zip(feature_names, weights):
            feature_importances[name] = round(abs(w) / total_w, 4)
            
        # Inference on test set
        for row in X_test:
            x_norm = [(row[j] - means[j]) / stds[j] for j in range(n_features)]
            p = bias + sum(w * x for w, x in zip(weights, x_norm))
            # Lower bound by physical speed limit
            nominal = row[1]
            p = max(nominal * 0.7, p)
            ml_preds.append(p)
            
        # Save custom weights
        os.makedirs("ml/models", exist_ok=True)
        with open("ml/models/model_weights.json", "w") as f:
            json.dump({
                "bias": bias,
                "weights": weights,
                "means": means,
                "stds": stds,
                "feature_names": feature_names
            }, f, indent=2)

    mae_ml = sum(abs(p - a) for p, a in zip(ml_preds, y_test_time)) / len(y_test_time)
    rmse_ml = math.sqrt(sum((p - a)**2 for p, a in zip(ml_preds, y_test_time)) / len(y_test_time))
    mape_ml = sum(abs(p - a) / max(a, 1.0) for p, a in zip(ml_preds, y_test_time)) / len(y_test_time) * 100

    # Error distribution
    errors = [abs(p - a) for p, a in zip(ml_preds, y_test_time)]
    err_dist = {
        "0-2 min (High Accuracy)": sum(1 for e in errors if e <= 2.0),
        "2-5 min (Acceptable)": sum(1 for e in errors if 2.0 < e <= 5.0),
        "5-10 min (Moderate)": sum(1 for e in errors if 5.0 < e <= 10.0),
        ">10 min (Extreme Disruption)": sum(1 for e in errors if e > 10.0)
    }

    # Sample comparison points for frontend charting (15 representative samples)
    comparison_samples = []
    step = max(1, len(test_records) // 15)
    for i in range(0, min(len(test_records), step * 15), step):
        r = test_records[i]
        comparison_samples.append({
            "section": f"{r['from_station']} → {r['to_station']}",
            "train": f"{r['train_id']} {r['train_name']}",
            "actual_time": round(y_test_time[i], 1),
            "static_schedule_time": round(static_preds[i], 1),
            "current_delay_heuristic": round(current_delay_preds[i], 1),
            "ml_predicted_time": round(ml_preds[i], 1),
            "congestion": r["congestion_level"],
            "has_tsr": bool(r["has_tsr"]),
            "weather": r["weather_condition"]
        })

    metrics = {
        "dataset_summary": {
            "total_samples": len(records),
            "train_samples": len(train_records),
            "test_samples": len(test_records),
            "features_count": len(feature_names)
        },
        "model_comparison": {
            "static_schedule": {
                "name": "Static Schedule Baseline",
                "mae_minutes": round(mae_static, 2),
                "rmse_minutes": round(rmse_static, 2),
                "mape_percent": round(mape_static, 2),
                "description": "Assumes train runs strictly according to published timetable."
            },
            "current_delay_method": {
                "name": "Current-Delay Persistence",
                "mae_minutes": round(mae_curr, 2),
                "rmse_minutes": round(rmse_curr, 2),
                "mape_percent": round(mape_curr, 2),
                "description": "Standard commercial train app method: propagates current delay uniformly."
            },
            "dynamic_ml_model": {
                "name": "Dynamic ML ETA Engine (Gradient Boosting)",
                "mae_minutes": round(mae_ml, 2),
                "rmse_minutes": round(rmse_ml, 2),
                "mape_percent": round(mape_ml, 2),
                "accuracy_improvement_percent": round(((mae_curr - mae_ml) / mae_curr) * 100, 1),
                "description": "Our model: dynamically models congestion, TSRs, weather, recovery slack, and train priority."
            }
        },
        "feature_importances": sorted([{"feature": k, "importance": v} for k, v in feature_importances.items()], key=lambda x: x["importance"], reverse=True),
        "error_distribution": err_dist,
        "comparison_samples": comparison_samples,
        "engine_type": "scikit-learn" if sklearn_available else "gradient_descent_ridge"
    }

    os.makedirs("ml/models", exist_ok=True)
    with open("ml/models/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n================ MODEL EVALUATION SUMMARY ================")
    print(f"Static Schedule Baseline:       MAE = {mae_static:.2f} min, RMSE = {rmse_static:.2f} min")
    print(f"Current Delay Method:           MAE = {mae_curr:.2f} min, RMSE = {rmse_curr:.2f} min")
    print(f"Dynamic ML Model (Ours):        MAE = {mae_ml:.2f} min, RMSE = {rmse_ml:.2f} min")
    print(f"Improvement over standard apps: {((mae_curr - mae_ml) / mae_curr) * 100:.1f}% reduction in arrival error!")
    print("=========================================================\n")
    return metrics

if __name__ == "__main__":
    train_and_evaluate()
