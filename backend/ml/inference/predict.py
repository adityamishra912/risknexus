# ml/inference/predict.py

from app.services.ml.predictor import predictor_service
from app.services.ml.feature_builder import build_feature_vector


def predict_likelihood(cvss=5.0, criticality=5, internet_facing=False, exploit_active=False, incidents=0):
    features = build_feature_vector(
        asset_data={"criticality": criticality, "internet_exposed": internet_facing},
        vuln_data={"cvss_score": cvss, "known_exploited": exploit_active},
    )
    prob, conf = predictor_service.predict_likelihood(features)
    return prob
