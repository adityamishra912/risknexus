import pytest
import copy
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.what_if import WhatIfChangeset
from app.services.what_if.engine import apply_changes, simulate_scenario, compute_delta
from app.services.risk_engine.scenario_generator import generate_risk_scenarios

client = TestClient(app)

@pytest.fixture
def sample_scenario():
    gen = generate_risk_scenarios()
    scenarios = gen.get("scenarios", [])
    if not scenarios:
        pytest.skip("No scenarios generated from data directory")
    return scenarios[0]

def test_apply_changes_cvss(sample_scenario):
    changes = WhatIfChangeset(cvss_score=4.0)
    original_cvss = sample_scenario.get("cvss_score")
    
    modified = apply_changes(sample_scenario, changes)
    assert modified["cvss_score"] == 4.0
    
    if original_cvss is not None:
        assert sample_scenario["cvss_score"] == original_cvss

def test_apply_changes_empty_changeset(sample_scenario):
    changes = WhatIfChangeset()
    modified = apply_changes(sample_scenario, changes)
    assert modified == sample_scenario

def test_simulate_scenario_real_state_unchanged(sample_scenario):
    original = copy.deepcopy(sample_scenario)
    simulate_scenario(sample_scenario, WhatIfChangeset(cvss_score=2.0))
    assert sample_scenario == original

def test_simulate_scenario_lower_risk_after_patch(sample_scenario):
    sample_scenario["cvss_score"] = 9.8
    sample_scenario["known_exploited"] = True
    
    baseline_result = simulate_scenario(sample_scenario, WhatIfChangeset())
    patched_result = simulate_scenario(sample_scenario, WhatIfChangeset(known_exploited=False, cvss_score=0.0))
    
    assert patched_result.simulated.probability < baseline_result.baseline.probability

def test_what_if_endpoint_single_scenario(sample_scenario):
    response = client.post("/api/v1/what-if/scenario", json={
        "scenario_data": sample_scenario,
        "changes": {"known_exploited": False}
    })
    assert response.status_code == 200

def test_what_if_portfolio_endpoint(sample_scenario):
    asset_id = sample_scenario.get("asset_id")
    response = client.post("/api/v1/what-if/portfolio", json={
        "changes": {"internet_exposed": False},
        "scope_asset_ids": [asset_id]
    })
    assert response.status_code == 200
