# tests/test_risk_engine.py

from fastapi.testclient import TestClient
from app.main import app

from app.services.ml.feature_builder import build_feature_vector
from app.services.ml.predictor import predictor_service
from app.services.risk_engine.impact import resolve_financial_impact
from app.services.risk_engine.engine import quantify_scenario, quantify_all_scenarios

client = TestClient(app)


def test_feature_builder():
    """Verify feature builder extracts all required ML feature fields."""
    asset_data = {"asset_id": "A001", "criticality": 9, "internet_exposed": "Yes"}
    vuln_data = {"cvss_score": 9.8, "known_exploited": "Yes", "days_open": 45}
    controls = [
        {"control_id": "C001", "status": "Implemented"},
        {"control_id": "C002", "status": "Not Implemented"},
    ]

    features = build_feature_vector(
        asset_data=asset_data,
        vuln_data=vuln_data,
        control_status_list=controls,
        attack_path_length=2,
    )

    required_keys = [
        "cvss_score", "exploitability", "known_exploited", "vulnerability_age_days",
        "internet_exposed", "asset_criticality", "attack_path_reachable",
        "attack_path_length", "path_strength", "control_coverage",
        "control_maturity", "threat_activity"
    ]
    for key in required_keys:
        assert key in features

    assert features["cvss_score"] == 9.8
    assert features["known_exploited"] == 1
    assert features["internet_exposed"] == 1
    assert features["asset_criticality"] == 9


def test_ml_predictor_interface():
    """Verify ML Predictor interface returns single calibrated probability and confidence."""
    high_risk_features = {
        "cvss_score": 9.8, "exploitability": 1.0, "known_exploited": 1,
        "internet_exposed": 1, "asset_criticality": 9, "vulnerability_age_days": 60,
    }
    low_risk_features = {
        "cvss_score": 3.0, "exploitability": 0.2, "known_exploited": 0,
        "internet_exposed": 0, "asset_criticality": 3, "vulnerability_age_days": 5,
    }

    prob_high, conf_high = predictor_service.predict_likelihood(high_risk_features)
    prob_low, conf_low = predictor_service.predict_likelihood(low_risk_features)

    assert 0.0 < prob_high < 1.0
    assert 0.0 < prob_low < 1.0
    assert prob_high > prob_low, "High risk feature vector must yield higher probability than low risk vector"
    assert conf_high > 0.5


def test_financial_impact_resolution():
    """Verify financial impact resolution from business service downtime cost."""
    service_data = {"downtime_cost_per_hour": 2500000.0, "revenue_dependency": 0.8, "estimated_downtime_hours": 24.0}
    threat_data = {"activity_level": "high", "threat_id": "T001"}
    scenario_row = {"scenario_id": "RS0001", "financial_impact": 2500000.0 * 24.0 * 1.8}
    
    impact = resolve_financial_impact(service_data=service_data, threat_data=threat_data, scenario_row=scenario_row)
    assert impact > 0
    assert impact == 2500000.0 * 24.0 * 1.8


def test_scenario_quantification():
    """Verify full risk scenario quantification pipeline (features -> ML prob -> impact -> EAL -> Monte Carlo)."""
    sample_scenario = {
        "scenario_row": {"scenario_id": "RS0001", "threat_id": "T001"},
        "asset_data": {"asset_id": "A001", "asset_name": "IDENTITY-SERVER-001", "criticality": 9, "internet_exposed": "No"},
        "vuln_data": {"vulnerability_id": "V0001", "cvss_score": 9.9, "known_exploited": "Yes", "days_open": 47},
        "service_data": {"service_id": "S007", "downtime_cost_per_hour": 2200000.0, "estimated_downtime_hours": 24.0},
        "threat_data": {"threat_id": "T001", "threat_name": "Ransomware"},
        "control_status_list": [{"control_id": "C001", "status": "Implemented"}],
    }

    res = quantify_scenario(sample_scenario)

    assert res["scenario_id"] == "RS0001"
    assert "probability" in res
    assert "impact" in res
    assert "eal" in res
    assert "mean_eal" in res
    assert "p90" in res
    assert "p95" in res
    assert "p99" in res
    assert "evidence" in res

    # Verify point-estimate math
    expected_eal = round(res["probability"] * res["impact"], 2)
    assert res["eal"] == expected_eal
    # Verify Monte Carlo loss ordering
    assert res["p50"] if "p50" in res else True
    assert res["p90"] <= res["p95"] <= res["p99"]


def test_quantify_all_scenarios():
    """Verify quantifying all risk scenarios from dataset."""
    results = quantify_all_scenarios()
    scenarios = results["scenarios"]
    assert len(scenarios) > 0, "Should quantify at least 1 risk scenario from CSV dataset"
    assert scenarios[0]["eal"] >= scenarios[-1]["eal"], "Results should be sorted descending by EAL"


def test_fastapi_risk_endpoints():
    """Verify FastAPI /api/v1/risk/scenarios endpoint."""
    response = client.get("/api/v1/risk/scenarios?limit=5")
    assert response.status_code == 200

    data = response.json()
    assert "summary" in data
    assert "scenarios" in data
    assert len(data["scenarios"]) <= 5
    assert data["summary"]["total_scenarios"] > 0
    assert data["summary"]["total_eal"] > 0


def test_fastapi_custom_evaluate_endpoint():
    """Verify FastAPI POST /api/v1/risk/evaluate endpoint."""
    payload = {
        "asset_criticality": 9,
        "cvss_score": 9.5,
        "known_exploited": True,
        "internet_exposed": True,
        "mfa_enabled": False,
        "edr_enabled": True,
        "downtime_cost_per_hour": 3000000.0,
        "estimated_downtime_hours": 24.0,
        "attack_path_length": 2,
    }
    response = client.post("/api/v1/risk/evaluate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["scenario_id"] == "CUSTOM-EVAL"
    assert data["probability"] > 0.0
    assert data["impact"] > 0.0
    assert data["eal"] > 0.0
    assert data["p95"] >= data["mean_eal"]


def test_missing_linked_record_error():
    """Verify MissingLinkedRecordError is raised when linked asset data is missing."""
    import pytest
    from app.services.risk_engine.exceptions import MissingLinkedRecordError

    bad_scenario = {
        "scenario_row": {"scenario_id": "RS9999", "threat_id": "T001"},
        "asset_data": {},  # missing asset_id
        "vuln_data": {"vulnerability_id": "V001"},
        "service_data": {"downtime_cost_per_hour": 1000.0, "estimated_downtime_hours": 24.0},
        "threat_data": {"threat_id": "T001"},
    }
    with pytest.raises(MissingLinkedRecordError):
        quantify_scenario(bad_scenario)


def test_missing_impact_data_error():
    """Verify MissingImpactDataError is raised when financial impact cannot be resolved."""
    import pytest
    from app.services.risk_engine.exceptions import MissingImpactDataError

    scenario_no_impact = {
        "scenario_row": {"scenario_id": "RS8888", "threat_id": "T001"},
        "asset_data": {"asset_id": "A001", "asset_name": "Server 1"},
        "vuln_data": {"vulnerability_id": "V001", "cvss_score": 8.0},
        "service_data": {},  # no downtime_cost_per_hour
        "threat_data": {"threat_id": "T001", "threat_name": "Threat 1"},
    }
    with pytest.raises(MissingImpactDataError):
        quantify_scenario(scenario_no_impact)
