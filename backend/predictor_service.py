"""
Predictor Service
-----------------
Loads the saved calibrated model once at startup. Exposes exactly one
method: given a validated feature vector, return (probability, confidence).
"""

from app.services.ml.predictor import PredictorService

if __name__ == "__main__":
    service = PredictorService("threat_model.joblib")
    example_vector = {
        "cvss_score": 8.1,
        "exploitability": 0.9,
        "known_exploited": 1,
        "vulnerability_age_days": 45,
        "internet_exposed": 1,
        "asset_criticality": 8,
        "attack_path_reachable": 1,
        "attack_path_length": 2,
        "path_strength": 0.7,
        "control_coverage": 0.4,
        "control_maturity": 0.3,
        "threat_activity": 0.6,
    }
    print(service.predict(example_vector))
