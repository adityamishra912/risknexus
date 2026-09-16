# app/services/monte_carlo/simulator.py

import logging
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from app.services.monte_carlo.distributions import sample_triangular_impact, sample_probability_bernoulli
from app.services.monte_carlo.metrics import summarize_losses

logger = logging.getLogger(__name__)


def run_monte_carlo_simulation(
    base_probability: float,
    min_impact: float,
    likely_impact: float,
    max_impact: float,
    iterations: int = 10000,
    seed: Optional[int] = 42,
) -> Dict[str, float]:
    """
    Runs scenario-level Monte Carlo simulation:
    - ML probability -> Bernoulli attack/no-attack trial
    - Triangular distribution (min, likely, max) -> sampled impact
    """
    if iterations <= 0:
        raise ValueError("iterations must be > 0")

    rng = np.random.default_rng(seed)

    attack_occurs = sample_probability_bernoulli(rng, base_probability, iterations)
    sampled_impacts = sample_triangular_impact(
        rng, min_impact, likely_impact, max_impact, iterations
    )

    losses = np.where(attack_occurs, sampled_impacts, 0.0)
    return summarize_losses(losses)


def run_enterprise_monte_carlo(
    scenarios: List[Dict[str, Any]],
    iterations: int = 10000,
    seed: Optional[int] = 42,
    include_raw: bool = False,
) -> Dict[str, Any]:
    """
    Enterprise-level Monte Carlo loss aggregation across consolidated Business Loss Events.

    Each iteration i samples all events independently:
        Enterprise_Loss[i] = Σ_k ( Bernoulli(P_k) × Triangular(min_k, likely_k, max_k) )

    IMPORTANT: Events are sampled independently — this model does NOT capture
    correlated failures, systemic shocks, or cascading breach scenarios
    (e.g., a single attacker simultaneously compromising multiple services).
    Dependency/correlation modeling (copulas, shared threat-actor latent variables)
    is reserved for future scope.

    Args:
        scenarios:   List of consolidated Business Loss Event dicts.
        iterations:  Number of Monte Carlo iterations (default 10,000).
        seed:        RNG seed for reproducibility.
        include_raw: Pass through to summarize_losses — returns raw loss array
                     when True (used by /risk/loss-distribution endpoint).
    """
    if not scenarios:
        return {
            "mean_eal": 0.0,
            "std_eal": 0.0,
            "p50": 0.0,
            "p90": 0.0,
            "p95": 0.0,
            "p99": 0.0,
            "max_loss": 0.0,
            "total_scenarios": 0,
        }

    rng = np.random.default_rng(seed)
    enterprise_losses = np.zeros(iterations, dtype=np.float64)

    for scen in scenarios:
        prob = float(scen.get("probability", 0.0))
        impact_dist = scen.get("impact_triangular", {})
        min_imp = float(impact_dist.get("min", scen.get("impact", 0.0) * 0.4))
        likely_imp = float(impact_dist.get("likely", scen.get("impact", 0.0)))
        max_imp = float(impact_dist.get("max", scen.get("impact", 0.0) * 2.0))

        attack_occurs = sample_probability_bernoulli(rng, prob, iterations)
        sampled_impacts = sample_triangular_impact(rng, min_imp, likely_imp, max_imp, iterations)
        scen_losses = np.where(attack_occurs, sampled_impacts, 0.0)

        # Vectorized addition of scenario losses to enterprise total array
        enterprise_losses += scen_losses

    metrics = summarize_losses(enterprise_losses, include_raw=include_raw)
    metrics["total_scenarios"] = len(scenarios)
    return metrics


class SimulatorService:
    def __init__(self, iterations: int = 10000):
        self.iterations = iterations

    def execute(
        self,
        base_probability: float,
        min_impact: float,
        likely_impact: float,
        max_impact: float,
        *args,
        **kwargs,
    ) -> Dict[str, float]:
        return run_monte_carlo_simulation(
            base_probability=base_probability,
            min_impact=min_impact,
            likely_impact=likely_impact,
            max_impact=max_impact,
            iterations=self.iterations,
        )