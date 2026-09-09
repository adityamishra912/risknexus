import pytest
from app.services.monte_carlo.simulator import run_monte_carlo_simulation, SimulatorService

def test_monte_carlo_simulation():
    """Verify PERT/Lognormal Monte Carlo simulator generates valid percentile distributions."""
    base_prob = 0.15
    min_impact = 2000000.0
    likely_impact = 10000000.0  # 10M INR
    max_impact = 20000000.0

    res = run_monte_carlo_simulation(
        base_probability=base_prob,
        min_impact=min_impact,
        likely_impact=likely_impact,
        max_impact=max_impact,
        iterations=5000,
        seed=123,
    )

    assert "mean_eal" in res
    assert "std_eal" in res
    assert "p50" in res
    assert "p90" in res
    assert "p95" in res
    assert "p99" in res
    assert "max_loss" in res

    assert res["mean_eal"] > 0
    assert res["p50"] <= res["p90"] <= res["p95"] <= res["p99"] <= res["max_loss"]


def test_simulator_service_wrapper():
    """Verify SimulatorService class interface."""
    svc = SimulatorService(iterations=2000)
    res = svc.execute(
        base_probability=0.20,
        min_impact=1000000.0,
        likely_impact=5000000.0,
        max_impact=10000000.0,
    )
    assert res["mean_eal"] > 0
