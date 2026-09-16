# tests/test_ml.py

import os
import pytest
import numpy as np
import pandas as pd
from app.services.ml.feature_builder import (
    FEATURE_ORDER,
    EXPLOITABILITY_MAP,
    RawRecords,
    FeatureBuildError,
    build_feature_vector,
    vector_to_ordered_list,
)
from app.services.ml.predictor import PredictorService, predictor_service
from ml.datasets.generate_dataset import generate as generate_dataset
from ml.training.train import train as train_model


def test_feature_order_contract():
    """Verify that FEATURE_ORDER contains exact 12 expected features."""
    expected = [
        "cvss_score", "exploitability", "known_exploited", "vulnerability_age_days",
        "internet_exposed", "asset_criticality", "attack_path_reachable",
        "attack_path_length", "path_strength", "control_coverage",
        "control_maturity", "threat_activity"
    ]
    assert FEATURE_ORDER == expected


def test_feature_builder_vector_ordering():
    """Verify build_feature_vector and vector_to_ordered_list return features in contract order."""
    vec = build_feature_vector(
        asset_data={"criticality": 8, "internet_exposed": True},
        vuln_data={"cvss_score": 7.5, "exploitability": "High", "known_exploited": True, "days_open": 30},
        control_status_list=[{"control_id": "C1", "status": "Implemented", "coverage": 0.8, "maturity": 4.0}],
        threat_data={"activity_level": "High"},
        attack_path_info={"reachable": True, "length": 2, "strength": 0.75},
    )
    assert len(vec) == 12
    assert set(vec.keys()) == set(FEATURE_ORDER)

    ordered_list = vector_to_ordered_list(vec)
    assert len(ordered_list) == 12
    assert ordered_list[0] == 7.5  # cvss_score
    assert ordered_list[2] == 1    # known_exploited


def test_dataset_generation():
    """Verify synthetic dataset generator produces valid DataFrame with incident target."""
    df = generate_dataset(n_samples=100)
    assert len(df) == 100
    for col in FEATURE_ORDER:
        assert col in df.columns
    assert "incident" in df.columns
    assert set(df["incident"].unique()).issubset({0, 1})


def test_predictor_service_predictions():
    """Verify trained predictor service returns calibrated probability and confidence."""
    high_vector = {
        "cvss_score": 9.5,
        "exploitability": 0.9,
        "known_exploited": 1,
        "vulnerability_age_days": 120,
        "internet_exposed": 1,
        "asset_criticality": 9,
        "attack_path_reachable": 1,
        "attack_path_length": 1,
        "path_strength": 0.85,
        "control_coverage": 0.2,
        "control_maturity": 0.2,
        "threat_activity": 0.9,
    }
    low_vector = {
        "cvss_score": 2.0,
        "exploitability": 0.2,
        "known_exploited": 0,
        "vulnerability_age_days": 5,
        "internet_exposed": 0,
        "asset_criticality": 2,
        "attack_path_reachable": 0,
        "attack_path_length": 5,
        "path_strength": 0.1,
        "control_coverage": 0.9,
        "control_maturity": 0.9,
        "threat_activity": 0.1,
    }

    res_high = predictor_service.predict(high_vector)
    res_low = predictor_service.predict(low_vector)

    assert "probability" in res_high
    assert "confidence" in res_high
    assert 0.0 <= res_high["probability"] <= 1.0
    assert 0.0 <= res_low["probability"] <= 1.0
    assert res_high["probability"] > res_low["probability"]

    prob_tuple, conf_tuple = predictor_service.predict_likelihood(high_vector)
    assert prob_tuple == res_high["probability"]
    assert conf_tuple == res_high["confidence"]


def test_feature_order_mismatch_guardrail(tmp_path):
    """Verify PredictorService raises RuntimeError when feature_order mismatch is detected."""
    import joblib
    fake_model_path = os.path.join(tmp_path, "corrupted_model.joblib")
    joblib.dump({
        "model": predictor_service._model,
        "feature_order": ["wrong", "feature", "list"],
    }, fake_model_path)

    with pytest.raises(RuntimeError, match="Feature order mismatch"):
        PredictorService(fake_model_path)
