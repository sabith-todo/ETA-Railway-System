"""
Evaluation Metrics and Benchmark Analysis for RailForecastAI.
Evaluates MAE, RMSE, R², and compares candidate models against baselines.
"""

import math
import numpy as np
from typing import Dict, Any, List
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes standard regression evaluation metrics:
    - MAE: Mean Absolute Error (minutes)
    - RMSE: Root Mean Squared Error (minutes)
    - R²: Explained variance
    - Max Error: Worst-case delay error (minutes)
    """
    y_t = np.asarray(y_true, dtype=np.float64)
    y_p = np.asarray(y_pred, dtype=np.float64)

    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(math.sqrt(mean_squared_error(y_t, y_p)))
    r2 = float(r2_score(y_t, y_p))
    max_err = float(np.max(np.abs(y_t - y_p)))

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 4),
        "max_error": round(max_err, 2)
    }

def print_benchmark_table(model_results: Dict[str, Dict[str, float]]):
    """Prints a structured benchmark table comparing candidate models."""
    header = f"{'Model Candidate':<28} | {'MAE (min)':<10} | {'RMSE (min)':<11} | {'R² Score':<10}"
    divider = "-" * len(header)
    print("\n" + divider)
    print(header)
    print(divider)
    for name, m in model_results.items():
        print(f"{name:<28} | {m['mae']:<10.3f} | {m['rmse']:<11.3f} | {m['r2']:<10.4f}")
    print(divider + "\n")
