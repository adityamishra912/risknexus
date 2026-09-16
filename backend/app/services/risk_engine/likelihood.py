# app/services/risk_engine/likelihood.py

"""
LikelihoodService
-----------------
Thin wrapper used by the risk engine to compute ML-based likelihood.
Delegates to predictor_service so there is a single source of truth.
"""

from app.services.ml.feature_builder import build_feature_vector
from app.services.ml.predictor import predictor_service


class LikelihoodService:
    """
    Computes calibrated breach likelihood for a given risk scenario.

    Usage:
        svc = LikelihoodService()
        prob, confidence = svc.execute(
            asset_data={...}, vuln_data={...}, threat_data={...}
        )
    """

    def execute(
        self,
        asset_data: dict = None,
        vuln_data: dict = None,
        threat_data: dict = None,
        attack_path_info: dict = None,
        control_status_list: list = None,
        attack_path_length: int = 2,
        **kwargs,
    ) -> dict:
        """
        Full pipeline: raw data -> feature_builder -> XGBoost predictor.
        Returns {"probability": float, "confidence": float, "risk_label": str}.
        """
        features = build_feature_vector(
            asset_data=asset_data or {},
            vuln_data=vuln_data or {},
            threat_data=threat_data,
            attack_path_info=attack_path_info,
            control_status_list=control_status_list,
            attack_path_length=attack_path_length,
        )
        probability, confidence = predictor_service.predict_likelihood(features)

        if probability >= 0.75:
            label = "CRITICAL"
        elif probability >= 0.50:
            label = "HIGH"
        elif probability >= 0.30:
            label = "MEDIUM"
        elif probability >= 0.10:
            label = "LOW"
        else:
            label = "NEGLIGIBLE"

        return {
            "probability": probability,
            "confidence": confidence,
            "risk_label": label,
            "feature_vector": features,
            "status": "success",
        }
