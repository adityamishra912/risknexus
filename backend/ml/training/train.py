"""
Model Training
--------------
Trains an XGBoost classifier, wraps it in isotonic calibration so the
output is a genuinely calibrated probability (not just a ranking score),
and checks it against acceptance thresholds before saving.
"""

import sys
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score, brier_score_loss, log_loss, classification_report,
)
from xgboost import XGBClassifier

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.services.ml.feature_builder import FEATURE_ORDER

AUC_THRESHOLD = 0.75
BRIER_THRESHOLD = 0.20


def train(csv_path: str = None, model_out_path: str = "threat_model.joblib"):
    from ml.datasets.generate_dataset import generate

    if csv_path is None or not os.path.exists(csv_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        csv_path = os.path.join(base_dir, "datasets", "training_data.csv")

    if not os.path.exists(csv_path):
        df = generate(n_samples=5000)
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        df.to_csv(csv_path, index=False)
        print(f"Generated synthetic training data at {csv_path}")
    else:
        df = pd.read_csv(csv_path)
        if len(df) < 50:
            print(f"Loaded dataset has only {len(df)} rows. Generating 5000 synthetic samples for robust training...")
            df = generate(n_samples=5000)
            os.makedirs(os.path.dirname(csv_path), exist_ok=True)
            df.to_csv(csv_path, index=False)

    X = df[FEATURE_ORDER]
    y = df["incident"]

    # Stratified split preserves the incident/no-incident ratio in both sets.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    pos = int(y_train.sum())
    neg = int(len(y_train) - pos)
    scale_pos_weight = (neg / pos) if pos else 1.0
    cv_folds = max(2, min(5, pos, neg))

    base_model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=3,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
    )

    # Isotonic calibration wraps raw model so predict_proba() is a true probability
    calibrated_model = CalibratedClassifierCV(base_model, method="isotonic", cv=cv_folds)
    calibrated_model.fit(X_train, y_train)

    probs = calibrated_model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    auc = roc_auc_score(y_test, probs)
    brier = brier_score_loss(y_test, probs)
    logloss = log_loss(y_test, probs)

    print(f"ROC-AUC:     {auc:.4f}  (threshold: >= {AUC_THRESHOLD})")
    print(f"Brier score: {brier:.4f}  (threshold: <= {BRIER_THRESHOLD})")
    print(f"Log loss:    {logloss:.4f}")
    print("\nClassification report:")
    print(classification_report(y_test, preds))

    if auc < AUC_THRESHOLD or brier > BRIER_THRESHOLD:
        msg = (
            f"[BLOCKED] Model does not meet acceptance thresholds. "
            f"AUC={auc:.4f} (need >={AUC_THRESHOLD}), "
            f"Brier={brier:.4f} (need <={BRIER_THRESHOLD}). Not saving."
        )
        print(f"\n{msg}")
        raise RuntimeError(msg)

    # Save the model AND the feature order together — guardrail against silent drift
    os.makedirs(os.path.dirname(os.path.abspath(model_out_path)), exist_ok=True)
    joblib.dump({
        "model": calibrated_model,
        "feature_order": FEATURE_ORDER,
    }, model_out_path)
    print(f"\n[OK] Saved calibrated model to {model_out_path}")
    return calibrated_model


if __name__ == "__main__":
    csv_arg = sys.argv[1] if len(sys.argv) > 1 else None
    out_arg = sys.argv[2] if len(sys.argv) > 2 else "threat_model.joblib"
    train(csv_arg, out_arg)
