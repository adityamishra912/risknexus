# app/services/optimizer/service.py

import os
import copy
import logging
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple

from app.services.attack_graph.graph_builder import resolve_data_dir
from app.services.risk_engine.engine import quantify_all_scenarios
from app.services.monte_carlo.simulator import run_enterprise_monte_carlo
from app.services.risk_engine.exceptions import MissingOptimizerInputError

logger = logging.getLogger(__name__)


def solve_knapsack(
    candidates: List[Dict[str, Any]], budget: float
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]:
    """
    Solves 0/1 Knapsack problem to maximize risk reduction within budget.
    Tries OR-Tools CP-SAT solver first; if C++ binaries fail to load on the OS environment,
    falls back to an exact 0/1 Knapsack solver to ensure robust execution.
    """
    int_budget = int(round(budget))
    int_costs = [int(round(c["cost"])) for c in candidates]
    int_reductions = [int(round(c["risk_reduction"])) for c in candidates]
    n = len(candidates)

    if n == 0:
        return [], [], "FEASIBLE"

    selected_indices = set()

    # Attempt OR-Tools CP-SAT first
    try:
        from ortools.sat.python import cp_model

        model = cp_model.CpModel()
        x = [model.NewBoolVar(f"x_{cand['control_id']}") for cand in candidates]

        model.Add(sum(x[i] * int_costs[i] for i in range(n)) <= int_budget)
        model.Maximize(sum(x[i] * int_reductions[i] for i in range(n)))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5.0
        status_code = solver.Solve(model)

        if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            solver_status = "OPTIMAL" if status_code == cp_model.OPTIMAL else "FEASIBLE"
            for i in range(n):
                if solver.Value(x[i]) == 1:
                    selected_indices.add(i)
            selected_controls = [candidates[i] for i in range(n) if i in selected_indices]
            unselected_controls = [candidates[i] for i in range(n) if i not in selected_indices]
            return selected_controls, unselected_controls, solver_status
    except Exception as exc:
        logger.warning(
            "[Optimizer] OR-Tools solver unavailable (%s). Falling back to exact 0/1 Knapsack solver.",
            exc,
        )

    # Exact 0/1 Knapsack solver fallback
    best_value = -1
    best_combo = 0

    if n <= 25:
        for mask in range(1 << n):
            current_cost = sum(int_costs[j] for j in range(n) if (mask & (1 << j)))
            if current_cost <= int_budget:
                current_value = sum(int_reductions[j] for j in range(n) if (mask & (1 << j)))
                if current_value > best_value:
                    best_value = current_value
                    best_combo = mask

        for j in range(n):
            if best_combo & (1 << j):
                selected_indices.add(j)
    else:
        # Dynamic Programming for larger N
        scale = max(1.0, int_budget / 5000.0)
        scaled_costs = [max(1, int(round(c / scale))) for c in int_costs]
        scaled_budget = int(round(int_budget / scale))

        dp = [[0] * (scaled_budget + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            w = scaled_costs[i - 1]
            v = int_reductions[i - 1]
            for b in range(scaled_budget + 1):
                if w <= b:
                    dp[i][b] = max(dp[i - 1][b], dp[i - 1][b - w] + v)
                else:
                    dp[i][b] = dp[i - 1][b]

        b = scaled_budget
        for i in range(n, 0, -1):
            if dp[i][b] != dp[i - 1][b]:
                selected_indices.add(i - 1)
                b -= scaled_costs[i - 1]

    selected_controls = [candidates[i] for i in range(n) if i in selected_indices]
    unselected_controls = [candidates[i] for i in range(n) if i not in selected_indices]
    return selected_controls, unselected_controls, "OPTIMAL"


def _format_inr_label(val: float) -> str:
    if val >= 10000000:
        return f"₹{val / 10000000:.2f} Cr"
    elif val >= 100000:
        return f"₹{round(val / 100000)}L"
    return f"₹{round(val):,}"


def get_candidate_controls(data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Lightweight function: returns all candidate controls with marginal risk-reduction
    estimates. Uses 500-iteration MC runs per control (suitable for listing pages).
    Does NOT run knapsack optimization — just evaluates each control individually.
    """
    resolved_dir = resolve_data_dir(data_dir)
    controls_path = os.path.join(resolved_dir, "controls.csv")
    effectiveness_path = os.path.join(resolved_dir, "control_effectiveness.csv")
    status_path = os.path.join(resolved_dir, "control_status.csv")

    for path in [controls_path, effectiveness_path, status_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required CSV file not found: {path}")

    df_controls = pd.read_csv(controls_path)
    df_effectiveness = pd.read_csv(effectiveness_path)
    df_status = pd.read_csv(status_path)

    baseline_res = quantify_all_scenarios(data_dir=data_dir)
    scenarios = baseline_res.get("scenarios", [])
    loss_events = baseline_res.get("loss_events", [])
    mc_input = loss_events if loss_events else scenarios

    if not mc_input:
        return []

    baseline_mc = run_enterprise_monte_carlo(mc_input, iterations=500)
    baseline_enterprise_mean_eal = float(baseline_mc.get("mean_eal", 0.0))

    all_control_ids = df_controls["control_id"].astype(str).str.strip().tolist()
    candidates = []

    for cid in all_control_ids:
        try:
            c_rows = df_controls[df_controls["control_id"].astype(str).str.strip() == cid]
            if c_rows.empty:
                continue
            c_row = c_rows.iloc[0]
            if pd.isna(c_row.get("cost")):
                continue

            base_cost = float(c_row["cost"])
            control_name = str(c_row.get("control_name", cid)).strip()
            control_type = str(c_row.get("category", "General")).strip()

            eff_rows = df_effectiveness[df_effectiveness["control_id"].astype(str).str.strip() == cid]
            if eff_rows.empty:
                continue

            stat_rows = df_status[df_status["control_id"].astype(str).str.strip() == cid]
            current_avg_coverage = float(stat_rows["coverage"].mean()) if not stat_rows.empty else 0.0
            coverage_gap = max(0.0, 1.0 - current_avg_coverage)
            real_cost = base_cost * coverage_gap

            threat_eff_map = {}
            source_citations = set()
            for _, r in eff_rows.iterrows():
                t_id = str(r["threat_id"]).strip()
                eff_val = float(r.get("effectiveness_base", r.get("effectiveness_pct", 0.5)))
                threat_eff_map[t_id] = eff_val
                if "evidence_type" in r and pd.notna(r["evidence_type"]):
                    source_citations.add(str(r["evidence_type"]).strip())

            source_citation = ", ".join(source_citations) if source_citations else "Reference Table"
            avg_eff_pct = float(sum(threat_eff_map.values()) / len(threat_eff_map)) if threat_eff_map else 0.0

            hypothetical_input = copy.deepcopy(mc_input)
            for item in hypothetical_input:
                t_id = str(item.get("threat_id", "")).strip()
                if t_id in threat_eff_map:
                    eff_pct = threat_eff_map[t_id]
                    orig_prob = float(item.get("probability", 0.0))
                    item["probability"] = orig_prob * (1.0 - eff_pct)

            hyp_mc = run_enterprise_monte_carlo(hypothetical_input, iterations=500)
            new_eal = float(hyp_mc.get("mean_eal", 0.0))
            risk_reduction = max(0.0, baseline_enterprise_mean_eal - new_eal)
            bcr = (risk_reduction / real_cost) if real_cost > 0 else 0.0

            candidates.append({
                "control_id": cid,
                "control_type": control_type,
                "control_name": control_name,
                "cost": round(real_cost, 2),
                "risk_reduction": round(risk_reduction, 2),
                "effectiveness_pct": round(avg_eff_pct, 4),
                "source_citation": source_citation,
                "benefit_cost_ratio": round(bcr, 4),
            })

        except Exception as exc:
            logger.warning("[Optimizer] Skipping control '%s': %s", cid, exc)
            continue

    # Sort by BCR descending so top ROI controls appear first
    candidates.sort(key=lambda c: c["benefit_cost_ratio"], reverse=True)
    return candidates


def optimize_investment_portfolio(
    budget: float = 10000000.0,
    data_dir: Optional[str] = None,
    candidate_control_ids: Optional[List[str]] = None,
    include_curve: bool = False,
) -> Dict[str, Any]:
    """
    Optimizes security control investment selection given a budget constraint
    to maximize total enterprise risk reduction using OR-Tools CP-SAT / Knapsack solver,
    followed by a joint portfolio Monte Carlo simulation to accurately evaluate combined
    risk reduction without double-counting overlapping control effects.

    Args:
        budget: Maximum budget in INR.
        data_dir: Path to data directory (resolved automatically if None).
        candidate_control_ids: Specific control IDs to evaluate (evaluates all eligible if None).
        include_curve: If True, generates a dynamic investment vs risk-reduction curve across
                       budget steps. Adds ~6 extra Monte Carlo runs; set False for fast responses.
    """
    resolved_dir = resolve_data_dir(data_dir)

    controls_path = os.path.join(resolved_dir, "controls.csv")
    effectiveness_path = os.path.join(resolved_dir, "control_effectiveness.csv")
    status_path = os.path.join(resolved_dir, "control_status.csv")

    for path in [controls_path, effectiveness_path, status_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required CSV file not found: {path}")

    df_controls = pd.read_csv(controls_path)
    df_effectiveness = pd.read_csv(effectiveness_path)
    df_status = pd.read_csv(status_path)

    # Step 1: Baseline Enterprise EAL quantification on FULL scenario set
    baseline_res = quantify_all_scenarios(data_dir=data_dir)
    scenarios = baseline_res.get("scenarios", [])
    loss_events = baseline_res.get("loss_events", [])

    mc_input = loss_events if loss_events else scenarios
    if not mc_input:
        logger.warning("[Optimizer] No quantified scenarios available for baseline.")
        return {
            "baseline_enterprise_mean_eal": 0.0,
            "selected_controls": [],
            "total_cost": 0.0,
            "total_risk_reduction": 0.0,
            "residual_enterprise_mean_eal": 0.0,
            "unselected_controls_considered": [],
            "investment_curve": [],
            "solver_status": "INFEASIBLE",
        }

    baseline_mc = run_enterprise_monte_carlo(mc_input, iterations=3000)
    baseline_enterprise_mean_eal = float(baseline_mc.get("mean_eal", 0.0))

    # Step 2: Determine candidate controls to consider
    all_control_ids = df_controls["control_id"].astype(str).str.strip().tolist()

    if candidate_control_ids:
        requested_ids = [str(cid).strip() for cid in candidate_control_ids]
        candidate_ids = [cid for cid in requested_ids if cid in all_control_ids]
    else:
        # Default: consider controls not already at 100% coverage
        candidate_ids = []
        for cid in all_control_ids:
            c_status = df_status[df_status["control_id"].astype(str).str.strip() == cid]
            if c_status.empty:
                candidate_ids.append(cid)
            else:
                avg_cov = float(c_status["coverage"].mean())
                if avg_cov < 0.999:
                    candidate_ids.append(cid)

    candidates: List[Dict[str, Any]] = []
    candidate_eff_maps: Dict[str, Dict[str, float]] = {}

    # Step 3: What-If per candidate control (500 iterations — fast marginal estimate for solver)
    for cid in candidate_ids:
        try:
            c_rows = df_controls[df_controls["control_id"].astype(str).str.strip() == cid]
            if c_rows.empty:
                raise MissingOptimizerInputError(
                    control_id=cid,
                    missing_field="controls.csv row",
                    reason=f"Control '{cid}' not found in controls.csv",
                )

            c_row = c_rows.iloc[0]
            if pd.isna(c_row.get("cost")):
                raise MissingOptimizerInputError(
                    control_id=cid,
                    missing_field="cost",
                    reason=f"Control '{cid}' has missing cost in controls.csv",
                )
            base_cost = float(c_row["cost"])
            control_name = str(c_row.get("control_name", cid)).strip()
            control_type = str(c_row.get("category", "General")).strip()

            eff_rows = df_effectiveness[df_effectiveness["control_id"].astype(str).str.strip() == cid]
            if eff_rows.empty:
                raise MissingOptimizerInputError(
                    control_id=cid,
                    missing_field="control_effectiveness.csv mapping",
                    reason=f"Control '{cid}' has no effectiveness data in control_effectiveness.csv",
                )

            stat_rows = df_status[df_status["control_id"].astype(str).str.strip() == cid]
            if stat_rows.empty:
                raise MissingOptimizerInputError(
                    control_id=cid,
                    missing_field="control_status.csv entry",
                    reason=f"Control '{cid}' has no status entry in control_status.csv",
                )

            current_avg_coverage = float(stat_rows["coverage"].mean())
            coverage_gap = max(0.0, 1.0 - current_avg_coverage)
            real_cost = base_cost * coverage_gap

            # Build threat effectiveness map: threat_id -> effectiveness_base
            threat_eff_map = {}
            source_citations = set()
            for _, r in eff_rows.iterrows():
                t_id = str(r["threat_id"]).strip()
                eff_val = float(r.get("effectiveness_base", r.get("effectiveness_pct", 0.5)))
                threat_eff_map[t_id] = eff_val
                if "evidence_type" in r and pd.notna(r["evidence_type"]):
                    source_citations.add(str(r["evidence_type"]).strip())

            candidate_eff_maps[cid] = threat_eff_map
            source_citation = ", ".join(source_citations) if source_citations else "Reference Table"
            avg_eff_pct = float(sum(threat_eff_map.values()) / len(threat_eff_map)) if threat_eff_map else 0.0

            # What-If Monte Carlo: 500 iterations (marginal estimate for knapsack value input)
            hypothetical_input = copy.deepcopy(mc_input)
            for item in hypothetical_input:
                t_id = str(item.get("threat_id", "")).strip()
                if t_id in threat_eff_map:
                    eff_pct = threat_eff_map[t_id]
                    orig_prob = float(item.get("probability", 0.0))
                    item["probability"] = orig_prob * (1.0 - eff_pct)

            hypothetical_mc = run_enterprise_monte_carlo(hypothetical_input, iterations=500)
            new_enterprise_mean_eal = float(hypothetical_mc.get("mean_eal", 0.0))

            risk_reduction = max(0.0, baseline_enterprise_mean_eal - new_enterprise_mean_eal)
            bcr = (risk_reduction / real_cost) if real_cost > 0 else 0.0

            candidates.append({
                "control_id": cid,
                "control_type": control_type,
                "control_name": control_name,
                "cost": round(real_cost, 2),
                "risk_reduction": round(risk_reduction, 2),
                "effectiveness_pct": round(avg_eff_pct, 4),
                "source_citation": source_citation,
                "benefit_cost_ratio": round(bcr, 4),
            })

        except MissingOptimizerInputError as e:
            logger.warning("[Optimizer] Excluding candidate control '%s': %s", cid, e)
            continue

    if not candidates:
        logger.warning("[Optimizer] No valid candidate controls available for optimization.")
        return {
            "baseline_enterprise_mean_eal": round(baseline_enterprise_mean_eal, 2),
            "selected_controls": [],
            "total_cost": 0.0,
            "total_risk_reduction": 0.0,
            "residual_enterprise_mean_eal": round(baseline_enterprise_mean_eal, 2),
            "unselected_controls_considered": [],
            "investment_curve": [],
            "solver_status": "FEASIBLE",
        }

    # Step 4: Knapsack 0/1 optimization under user budget
    selected_controls, unselected_controls, solver_status = solve_knapsack(candidates, budget)

    # Step 5: Joint Portfolio Monte Carlo Validation (all selected controls simultaneously)
    def evaluate_combined_portfolio(selected_list: List[Dict[str, Any]], iters: int = 3000) -> Tuple[float, float]:
        if not selected_list:
            return 0.0, baseline_enterprise_mean_eal
        combined_portfolio_input = copy.deepcopy(mc_input)
        selected_eff_maps = [
            candidate_eff_maps[c["control_id"]]
            for c in selected_list
            if c["control_id"] in candidate_eff_maps
        ]
        for item in combined_portfolio_input:
            t_id = str(item.get("threat_id", "")).strip()
            orig_prob = float(item.get("probability", 0.0))
            prob_multiplier = 1.0
            for t_map in selected_eff_maps:
                if t_id in t_map:
                    prob_multiplier *= (1.0 - t_map[t_id])
            item["probability"] = orig_prob * prob_multiplier

        portfolio_mc = run_enterprise_monte_carlo(combined_portfolio_input, iterations=iters)
        res_eal = float(portfolio_mc.get("mean_eal", 0.0))
        red_eal = max(0.0, baseline_enterprise_mean_eal - res_eal)
        return red_eal, res_eal

    # Final portfolio validation: 3,000 iterations (fast + accurate enough for reporting)
    actual_total_risk_reduction, residual_enterprise_mean_eal = evaluate_combined_portfolio(
        selected_controls, iters=3000
    )

    unselected_controls.sort(key=lambda c: c["benefit_cost_ratio"], reverse=True)

    total_cost = round(sum(c["cost"] for c in selected_controls), 2)
    total_risk_reduction = round(actual_total_risk_reduction, 2)
    residual_enterprise_mean_eal = round(residual_enterprise_mean_eal, 2)

    # Step 6 (Optional): Dynamically generate Investment vs Risk Reduction Curve
    investment_curve = []
    if include_curve:
        curve_steps = [0.0]
        step_fractions = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]
        for frac in step_fractions:
            step_b = budget * frac
            if step_b > 0:
                curve_steps.append(step_b)

        seen_costs = set()

        for step_b in curve_steps:
            if step_b == 0.0:
                investment_curve.append({
                    "spend": 0.0,
                    "spend_label": "₹0",
                    "risk_reduction": 0.0,
                    "residual_eal": round(baseline_enterprise_mean_eal, 2),
                    "zone": "Baseline",
                })
                seen_costs.add(0.0)
            else:
                step_sel, _, _ = solve_knapsack(candidates, step_b)
                step_cost = round(sum(c["cost"] for c in step_sel), 2)
                if step_cost not in seen_costs:
                    seen_costs.add(step_cost)
                    # 500 iterations per curve point for speed
                    step_red, step_res = evaluate_combined_portfolio(step_sel, iters=500)
                    zone = "Optimal Zone" if step_b <= budget else "Diminishing Returns"
                    investment_curve.append({
                        "spend": step_cost,
                        "spend_label": _format_inr_label(step_cost),
                        "risk_reduction": round(step_red, 2),
                        "residual_eal": round(step_res, 2),
                        "zone": zone,
                    })

        investment_curve.sort(key=lambda p: p["spend"])

    return {
        "baseline_enterprise_mean_eal": round(baseline_enterprise_mean_eal, 2),
        "selected_controls": selected_controls,
        "total_cost": total_cost,
        "total_risk_reduction": total_risk_reduction,
        "residual_enterprise_mean_eal": residual_enterprise_mean_eal,
        "unselected_controls_considered": unselected_controls,
        "investment_curve": investment_curve,
        "solver_status": solver_status,
    }


class OptimizerService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir

    def execute(
        self,
        budget: float = 10000000.0,
        candidate_control_ids: Optional[List[str]] = None,
        include_curve: bool = False,
    ) -> Dict[str, Any]:
        return optimize_investment_portfolio(
            budget=budget,
            data_dir=self.data_dir,
            candidate_control_ids=candidate_control_ids,
            include_curve=include_curve,
        )
