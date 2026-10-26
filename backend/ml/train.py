"""
Model Training Pipeline for RailForecastAI.
Trains candidate regression models:
- Linear Regression (Ridge)
- Random Forest Regressor
- Gradient Boosting Regressor
- XGBoost Regressor (if available)

Evaluates on MAE, RMSE, R², selects the champion model, and exports:
- backend/ml/models/eta_delay_model.joblib
- backend/ml/models/model_metadata.json

Execute via:
python -m backend.ml.train
"""

import os
import json
import joblib
import logging
from datetime import datetime
from typing import Dict, Any

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

from backend.ml.dataset_loader import load_railway_dataset
from backend.ml.feature_engineering import (
    extract_features_from_dataframe,
    get_feature_names
)
from backend.ml.preprocessing import split_dataset
from backend.ml.evaluate import compute_metrics, print_benchmark_table

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_train")

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
MODEL_PATH = os.path.join(MODEL_DIR, "eta_delay_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

def train_and_select_champion():
    print("=" * 60)
    print("RAILFORECASTAI: TRAINING PIPELINE FOR DYNAMIC ETA & DELAY PREDICTION")
    print("=" * 60)

    # 1. Load authentic railway dataset
    df = load_railway_dataset()

    # 2. Extract features & target
    print("\nExtracting 12 operational railway features...")
    X, y = extract_features_from_dataframe(df)
    feature_names = get_feature_names()
    print(f"Features: {feature_names}")
    print(f"Dataset Shape: X={X.shape}, y={y.shape}")

    # 3. Split train/validation/test
    X_train, y_train, X_val, y_val, X_test, y_test = split_dataset(X, y)

    # 4. Define candidate models
    candidates: Dict[str, Any] = {
        "Linear Regression (Ridge)": Ridge(alpha=1.0),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=40, max_depth=12, min_samples_split=4, n_jobs=-1, random_state=42
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
        )
    }

    # Attempt to load XGBoost
    try:
        import xgboost as xgb
        candidates["XGBoost Regressor"] = xgb.XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, n_jobs=-1
        )
        print("XGBoost library detected and included in candidate models.")
    except (ImportError, Exception) as e:
        print(f"Note: XGBoost not available ({e}), using Scikit-Learn ensembles.")

    # 5. Train & Evaluate Candidates on Validation Set
    val_results = {}
    fitted_models = {}

    for name, model in candidates.items():
        print(f"\nTraining candidate model: {name}...")
        start_time = datetime.utcnow()
        model.fit(X_train, y_train)
        elapsed = (datetime.utcnow() - start_time).total_seconds()

        preds_val = model.predict(X_val)
        metrics = compute_metrics(y_val, preds_val)
        metrics["training_seconds"] = round(elapsed, 2)
        val_results[name] = metrics
        fitted_models[name] = model
        print(f" -> Validation MAE: {metrics['mae']:.3f} min | RMSE: {metrics['rmse']:.3f} | R²: {metrics['r2']:.4f}")

    # Print comparative benchmark table
    print_benchmark_table(val_results)

    # 6. Select Champion Model based on minimum MAE
    champion_name = min(val_results, key=lambda k: val_results[k]["mae"])
    champion_model = fitted_models[champion_name]
    print(f"🏆 CHAMPION MODEL SELECTED: {champion_name}")

    # 7. Final Evaluation on Held-Out Test Set
    test_preds = champion_model.predict(X_test)
    test_metrics = compute_metrics(y_test, test_preds)
    print(f"\nFinal Test Set Performance for {champion_name}:")
    print(f"  Test MAE : {test_metrics['mae']:.3f} minutes")
    print(f"  Test RMSE: {test_metrics['rmse']:.3f} minutes")
    print(f"  Test R²  : {test_metrics['r2']:.4f}")
    print(f"  Max Error: {test_metrics['max_error']:.2f} minutes")

    # 8. Feature Importances if available
    feature_importances = {}
    if hasattr(champion_model, "feature_importances_"):
        for fname, imp in zip(feature_names, champion_model.feature_importances_):
            feature_importances[fname] = round(float(imp), 4)

    # 9. Save Artifacts
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(champion_model, MODEL_PATH)
    print(f"\nSaved champion model artifact to: {MODEL_PATH}")

    metadata = {
        "model_version": "1.0.0",
        "champion_model": champion_name,
        "trained_at": datetime.utcnow().isoformat(),
        "dataset_samples": len(X),
        "features": feature_names,
        "feature_importances": feature_importances,
        "validation_benchmark": val_results,
        "test_performance": test_metrics,
        "hyperparameters": champion_model.get_params() if hasattr(champion_model, "get_params") else {}
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata and benchmarks to: {METADATA_PATH}")
    print("=" * 60)
    print("TRAINING PIPELINE SUCCESSFULLY COMPLETED.")
    print("=" * 60)
    return metadata

if __name__ == "__main__":
    train_and_select_champion()
