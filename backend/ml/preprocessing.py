"""
Preprocessing & Train/Val/Test Split for RailForecastAI ML Pipeline.
"""

import numpy as np
from typing import Tuple, Dict, Any

def split_dataset(
    X: np.ndarray,
    y: np.ndarray,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    random_seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Shuffles and splits data into Train, Validation, and Test sets.
    Default: 80% train, 10% validation, 10% test.
    """
    assert len(X) == len(y), "Features and target must have the same length"
    np.random.seed(random_seed)
    
    n_samples = len(X)
    indices = np.arange(n_samples)
    np.random.shuffle(indices)

    train_end = int(train_ratio * n_samples)
    val_end = int((train_ratio + val_ratio) * n_samples)

    train_idx = indices[:train_end]
    val_idx = indices[train_end:val_end]
    test_idx = indices[val_end:]

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    print(f"Data Split: Train={len(X_train)}, Validation={len(X_val)}, Test={len(X_test)}")
    return X_train, y_train, X_val, y_val, X_test, y_test
