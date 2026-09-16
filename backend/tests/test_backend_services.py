import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_vulnerabilities_endpoint():
    response = client.get("/api/v1/vulnerabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "vulnerabilities" in data
    assert isinstance(data["vulnerabilities"], list)

def test_optimization_endpoints():
    response = client.get("/api/v1/optimization/initiatives")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["initiatives"]) > 0

    eval_resp = client.post(
        "/api/v1/optimization/evaluate",
        json={
            "selected_initiative_ids": ["INIT-01", "INIT-02"],
            "budget": 10000000.0,
            "objective": "max_reduction",
        },
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["status"] == "success"
    assert "portfolio_rosi" in eval_data
    assert "residual_eal" in eval_data

def test_what_if_simulate_controls():
    sim_resp = client.post(
        "/api/v1/what-if/simulate-controls",
        json={
            "simulated_controls": {"mfa": True, "patching": True, "edr": True},
            "mfa_coverage": 80.0,
            "patch_delay_days": 7,
        },
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["status"] == "success"
    assert "deltas" in sim_data
    assert "eal_reduction" in sim_data["deltas"]

def test_ingestion_list():
    resp = client.get("/api/v1/ingestion")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "datasets" in data
