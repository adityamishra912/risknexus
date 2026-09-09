from typing import List, Optional

from app.schemas.what_if import WhatIfChangeset, WhatIfPortfolioResult
from app.services.risk_engine.scenario_generator import generate_risk_scenarios
from app.services.what_if.engine import simulate_scenario, compute_delta
from app.services.monte_carlo.simulator import run_enterprise_monte_carlo
from app.schemas.risk import RiskSummarySchema

def _build_summary(quantified_list: List[dict], mc_results: dict) -> RiskSummarySchema:
    total_eal = sum(s.get("eal", 0.0) for s in quantified_list)
    high_risk_count = sum(1 for s in quantified_list if s.get("eal", 0.0) >= 5000000.0)
    
    return RiskSummarySchema(
        total_scenarios=len(quantified_list),
        total_eal=round(total_eal, 2),
        mean_eal=round(mc_results.get("mean_eal", 0.0), 2),
        p95_loss=round(mc_results.get("p95", 0.0), 2),
        p99_loss=round(mc_results.get("p99", 0.0), 2),
        high_risk_scenarios_count=high_risk_count,
    )

def simulate_portfolio(
    changes: WhatIfChangeset,
    scope_asset_ids: Optional[List[str]] = None,
    data_dir: Optional[str] = None,
    iterations: int = 10000,
) -> WhatIfPortfolioResult:
    gen = generate_risk_scenarios(
        data_dir=data_dir,
        scope_asset_ids=scope_asset_ids,
    )
    scenarios = gen.get("scenarios", [])
    
    baseline_quantified = []
    simulated_quantified = []
    scenario_results = []
    
    for s in scenarios:
        result = simulate_scenario(s, changes, data_dir=data_dir)
        scenario_results.append(result)
        baseline_quantified.append(result.baseline.model_dump())
        if result.simulated.status != "impact_data_missing":
            simulated_quantified.append(result.simulated.model_dump())
            
    baseline_mc = run_enterprise_monte_carlo(baseline_quantified, iterations=iterations)
    simulated_mc = run_enterprise_monte_carlo(simulated_quantified, iterations=iterations)
    
    baseline_summary = _build_summary(baseline_quantified, baseline_mc)
    simulated_summary = _build_summary(simulated_quantified, simulated_mc)
    
    portfolio_delta = compute_delta(
        {"eal": baseline_summary.total_eal, "p95": baseline_summary.p95_loss, "mean_eal": baseline_summary.mean_eal, "p99": baseline_summary.p99_loss},
        {"eal": simulated_summary.total_eal, "p95": simulated_summary.p95_loss, "mean_eal": simulated_summary.mean_eal, "p99": simulated_summary.p99_loss},
    )
    
    return WhatIfPortfolioResult(
        baseline_summary=baseline_summary,
        simulated_summary=simulated_summary,
        portfolio_delta=portfolio_delta,
        scenario_results=scenario_results,
        total_scenarios_simulated=len(scenarios),
    )
