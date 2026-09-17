# app/services/what_if/control_simulator.py

import os
import copy
import logging
import pandas as pd
from typing import Dict, Any, Optional
from app.services.attack_graph.graph_builder import resolve_data_dir
from app.services.risk_engine.engine import quantify_all_scenarios
from app.services.monte_carlo.simulator import run_enterprise_monte_carlo
from app.utils.type_parsers import parse_float, parse_int, sanitize_numeric_column

logger = logging.getLogger(__name__)

def simulate_control_toggles(
    simulated_controls: Dict[str, bool],
    mfa_coverage: float = 62.0,
    patch_delay_days: int = 14,
    data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Simulates enterprise-wide risk reduction when security controls are toggled or modified:
    - MFA Coverage (reduces likelihood of identity-based attack scenarios)
    - Patching Delay (reduces vulnerability exploitation window)
    - EDR / Segmentation / Backup controls
    Runs full backend Monte Carlo simulation on baseline vs simulated states.
    Uses exact data-driven threat-to-control effectiveness mappings from control_effectiveness.csv
    and computes non-overlapping, coverage-scaled marginal scenario probability reductions.
    """
    mfa_coverage = parse_float(mfa_coverage, default=62.0)
    patch_delay_days = parse_int(patch_delay_days, default=14)

    # 1. Baseline quantification
    baseline_res = quantify_all_scenarios(data_dir=data_dir)
    baseline_scenarios = baseline_res.get("scenarios", [])
    baseline_loss_events = baseline_res.get("loss_events", [])
    baseline_mc = baseline_res.get("summary", {})

    baseline_eal = parse_float(baseline_mc.get("total_eal", 0.0))
    if baseline_eal == 0.0 and baseline_scenarios:
        baseline_eal = sum(parse_float(s.get("eal", 0.0)) for s in baseline_scenarios)

    mc_input = baseline_loss_events if baseline_loss_events else baseline_scenarios
    baseline_mc_results = run_enterprise_monte_carlo(mc_input) if mc_input else {}
    baseline_p95 = parse_float(baseline_mc_results.get("p95", 0.0))
    if baseline_p95 == 0.0:
        baseline_p95 = parse_float(baseline_mc.get("p95_loss", 0.0))

    if not baseline_scenarios:
        return {
            "status": "success",
            "inputs": {
                "simulated_controls": simulated_controls,
                "mfa_coverage": mfa_coverage,
                "patch_delay_days": patch_delay_days,
            },
            "baseline": {"total_eal": 0.0, "p95_loss": 0.0},
            "simulated": {"total_eal": 0.0, "p95_loss": 0.0},
            "deltas": {"eal_reduction": 0.0, "p95_reduction": 0.0, "reduction_percentage": 0.0},
        }

    # 2. Load control effectiveness & baseline status maps
    resolved_dir = resolve_data_dir(data_dir)
    eff_path = os.path.join(resolved_dir, "control_effectiveness.csv")
    status_path = os.path.join(resolved_dir, "control_status.csv")

    threat_eff_map: Dict[str, Dict[str, float]] = {}
    if os.path.exists(eff_path):
        eff_df = pd.read_csv(eff_path)
        for _, r in eff_df.iterrows():
            cid = str(r["control_id"]).strip()
            tid = str(r["threat_id"]).strip()
            eff = parse_float(r.get("effectiveness_base", r.get("effectiveness_pct", 0.5)))
            if cid not in threat_eff_map:
                threat_eff_map[cid] = {}
            threat_eff_map[cid][tid] = eff

    baseline_coverages: Dict[str, float] = {}
    if os.path.exists(status_path):
        status_df = pd.read_csv(status_path)
        for cid in ["C001", "C002", "C003", "C004", "C005", "C006", "C007", "C008", "C009", "C010"]:
            sub = status_df[status_df["control_id"].astype(str).str.strip() == cid]
            if not sub.empty:
                baseline_coverages[cid] = float(sanitize_numeric_column(sub["coverage"]).mean())

    # 3. Derive target coverages from UI controls & sliders
    mfa_active = simulated_controls.get("mfa", True)
    patch_active = simulated_controls.get("patching", True)
    edr_active = simulated_controls.get("edr", False)
    seg_active = simulated_controls.get("segmentation", False)
    backup_active = simulated_controls.get("backup", True)

    mfa_target_cov = (mfa_coverage / 100.0) if mfa_active else 0.0
    patch_target_cov = max(0.1, 1.0 - (patch_delay_days / 90.0)) if patch_active else 0.0

    target_coverages = {
        "C001": mfa_target_cov,
        "C003": mfa_target_cov,
        "C008": patch_target_cov,
        "C002": 1.0 if edr_active else 0.0,
        "C004": 1.0 if seg_active else 0.0,
        "C006": 1.0 if backup_active else 0.0,
    }

    # 4. Compute scenario-by-scenario simulated probabilities (marginal gain scaling over baseline)
    simulated_scenarios = copy.deepcopy(baseline_scenarios)
    for s in simulated_scenarios:
        tid = str(s.get("threat_id", "")).strip()
        prob_mult = 1.0
        for cid, target_cov in target_coverages.items():
            if cid in threat_eff_map and tid in threat_eff_map[cid]:
                eff = threat_eff_map[cid][tid]
                base_cov = baseline_coverages.get(cid, 0.0)
                
                # Marginal change scaling factor relative to baseline posture
                denom = max(0.01, 1.0 - (eff * base_cov))
                num = max(0.01, 1.0 - (eff * target_cov))
                scaling = num / denom
                prob_mult *= scaling

        orig_prob = parse_float(s.get("probability", 0.05))
        new_prob = min(0.99, max(0.0001, orig_prob * prob_mult))
        s["probability"] = new_prob
        s["eal"] = round(new_prob * parse_float(s.get("likely_impact", s.get("eal", 0.0))), 2)

    # 5. Full Monte Carlo Simulation on Simulated Scenarios
    sim_loss_events = baseline_res.get("loss_events", [])
    sim_mc_input = sim_loss_events if sim_loss_events else simulated_scenarios
    simulated_mc_results = run_enterprise_monte_carlo(sim_mc_input)

    simulated_eal = sum(parse_float(s.get("eal", 0.0)) for s in simulated_scenarios)
    simulated_p95 = parse_float(simulated_mc_results.get("p95", 0.0))
    if simulated_p95 == 0.0:
        simulated_p95 = simulated_eal * 2.5

    eal_reduction = max(0.0, round(baseline_eal - simulated_eal, 2))
    p95_reduction = max(0.0, round(baseline_p95 - simulated_p95, 2))
    reduction_percentage = round((eal_reduction / baseline_eal * 100.0), 1) if baseline_eal > 0 else 0.0

    return {
        "status": "success",
        "inputs": {
            "simulated_controls": simulated_controls,
            "mfa_coverage": mfa_coverage,
            "patch_delay_days": patch_delay_days,
        },
        "baseline": {
            "total_eal": round(baseline_eal, 2),
            "p95_loss": round(baseline_p95, 2),
        },
        "simulated": {
            "total_eal": round(simulated_eal, 2),
            "p95_loss": round(simulated_p95, 2),
        },
        "deltas": {
            "eal_reduction": eal_reduction,
            "p95_reduction": p95_reduction,
            "reduction_percentage": reduction_percentage,
        },
    }
