# app/services/ml/predictor.py

"""
Predictor Service
-----------------
Loads the saved calibrated XGBoost model once at startup.
Exposes predict(feature_vector) returning {"probability": float, "confidence": float}.
"""

import os
import sys
import joblib
from app.services.ml.feature_builder import FEATURE_ORDER, vector_to_ordered_list

class PredictorService:
    def __init__(self, model_path: str = "threat_model.joblib"):
        self._model_path = model_path
        self._model = None
        self._load_or_train()

    def _load_or_train(self):
        candidate_paths = [
            self._model_path,
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../threat_model.joblib")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/models/threat_model.joblib")),
        ]

        found_path = None
        for p in candidate_paths:
            if os.path.exists(p):
                found_path = p
                break

        if not found_path:
            print("[PredictorService] Model file not found. Auto-generating dataset and training calibrated XGBoost model...")
            target_path = candidate_paths[1]  # backend/threat_model.joblib
            from backend.ml.training import train  # lazy import — only needed when no model exists
            train(model_out_path=target_path)
            found_path = target_path

        self._model_path = found_path
        artifact = joblib.load(self._model_path)
        self._model = artifact["model"]
        saved_order = artifact["feature_order"]

        # Guardrail: refuse to run if the feature order expects != trained feature order
        if saved_order != FEATURE_ORDER:
            raise RuntimeError(
                "Feature order mismatch between saved model and current "
                "feature_builder.py — inference would silently be wrong."
            )

    # Safe neutral defaults for every feature (used when callers pass partial vectors)
    _FEATURE_DEFAULTS = {
        "cvss_score": 5.0,
        "exploitability": 0.5,
        "known_exploited": 0,
        "vulnerability_age_days": 30,
        "internet_exposed": 0,
        "asset_criticality": 5,
        "attack_path_reachable": 1,
        "attack_path_length": 2,
        "path_strength": 0.5,
        "control_coverage": 0.5,
        "control_maturity": 0.5,
        "threat_activity": 0.5,
    }

    def predict(self, feature_vector: dict) -> dict:
        """feature_vector: dict from feature_builder.build_feature_vector() or a
        partial dict — missing features are filled with neutral safe defaults.
        Returns {"probability": float, "confidence": float}.
        """
        # Merge defaults under user-supplied values so partial vectors work
        full_vector = {**self._FEATURE_DEFAULTS, **feature_vector}
        ordered = [vector_to_ordered_list(full_vector)]
        probability = float(self._model.predict_proba(ordered)[0, 1])
        confidence = abs(probability - 0.5) * 2  # 0 = maximally uncertain, 1 = maximally decisive
        return {
            "probability": round(probability, 3),
            "confidence": round(confidence, 3),
        }

    def predict_likelihood(self, feature_vector: dict):
        """Helper for risk engine returning (probability, confidence) tuple."""
        res = self.predict(feature_vector)
        return res["probability"], res["confidence"]

    def predict_batch(self, feature_vectors: list) -> list:
        """Batch prediction for multiple feature vectors in a single vectorized XGBoost call."""
        if not feature_vectors:
            return []
        ordered_rows = []
        for fv in feature_vectors:
            full_vector = {**self._FEATURE_DEFAULTS, **fv}
            ordered_rows.append(vector_to_ordered_list(full_vector))
        probs = self._model.predict_proba(ordered_rows)[:, 1]
        results = []
        for p in probs:
            prob = round(float(p), 3)
            conf = round(abs(prob - 0.5) * 2, 3)
            results.append((prob, conf))
        return results


predictor_service = PredictorService()
