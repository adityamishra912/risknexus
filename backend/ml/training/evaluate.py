"""
Model Evaluation
----------------
Loads a saved threat_model.joblib and evaluates it against
a CSV dataset, printing ROC-AUC, Brier score, and a classification report.

Run standalone:
    python -m ml.training.evaluate
    python -m ml.training.evaluate path/to/model.joblib path/to/data.csv
"""

import sys
import os
import joblib
import pandas as pd
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss, classification_report

# Ensure backend/ is on path when run standalone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.services.ml.feature_builder import FEATURE_ORDER


def evaluate(model_path: str = None, csv_path: str = None) -> dict:
    """
    Loads a saved .joblib artifact and evaluates it against a CSV dataset.
    Returns a dict of metrics: auc, brier, logloss.
    """
    # Resolve model path
    if model_path is None:
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../threat_model.joblib")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ml/models/threat_model.joblib")),
        ]
        model_path = next((p for p in candidates if os.path.exists(p)), None)
        if model_path is None:
            raise FileNotFoundError(
                "No threat_model.joblib found. Run ml/training/train.py first."
            )

    # Resolve CSV path
    if csv_path is None:
        csv_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../datasets/training_data.csv")
        )

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found: {csv_path}")

    artifact = joblib.load(model_path)
    model = artifact["model"]
    saved_order = artifact["feature_order"]

    if saved_order != FEATURE_ORDER:
        raise RuntimeError(
            "Feature order mismatch between saved model and current feature_builder.py."
        )

    df = pd.read_csv(csv_path)
    X = df[FEATURE_ORDER]
    y = df["incident"]

    probs = model.predict_proba(X)[:, 1]
    preds = (probs >= 0.5).astype(int)

    auc = roc_auc_score(y, probs)
    brier = brier_score_loss(y, probs)
    logloss = log_loss(y, probs)

    print(f"\n=== Model Evaluation ===")
    print(f"Model:       {model_path}")
    print(f"Dataset:     {csv_path}  ({len(df)} rows)")
    print(f"ROC-AUC:     {auc:.4f}")
    print(f"Brier score: {brier:.4f}")
    print(f"Log loss:    {logloss:.4f}")
    print("\nClassification report:")
    print(classification_report(y, preds))

    return {"auc": auc, "brier": brier, "logloss": logloss}


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else None
    c = sys.argv[2] if len(sys.argv) > 2 else None
    evaluate(m, c)