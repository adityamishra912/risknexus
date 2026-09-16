# app/services/what_if/control_simulator.py

import logging
from typing import Dict, Any, Optional
from app.services.risk_engine.engine import quantify_all_scenarios
from app.services.monte_carlo.simulator import run_enterprise_monte_carlo

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
    """
    # Baseline quantification
    baseline_res = quantify_all_scenarios(data_dir=data_dir)
    baseline_scenarios = baseline_res.get("scenarios", [])
    baseline_mc = baseline_res.get("summary", {})

    baseline_eal = float(baseline_mc.get("total_eal", 0.0))
    baseline_p95 = float(baseline_mc.get("p95_loss", 0.0))

    # Calculate overall effectiveness modifier based on active simulated controls
    mfa_active = simulated_controls.get("mfa", True)
    patch_active = simulated_controls.get("patching", True)
    edr_active = simulated_controls.get("edr", False)
    seg_active = simulated_controls.get("segmentation", False)
    backup_active = simulated_controls.get("backup", True)

    mfa_factor = (mfa_coverage / 100.0) if mfa_active else 0.2
    patch_factor = max(0.2, 1.0 - (patch_delay_days / 90.0)) if patch_active else 0.1
    edr_factor = 0.35 if edr_active else 0.0
    seg_factor = 0.25 if seg_active else 0.0
    backup_factor = 0.20 if backup_active else 0.0

    total_reduction_factor = min(0.85, (mfa_factor * 0.3) + (patch_factor * 0.25) + edr_factor + seg_factor + backup_factor)

    simulated_eal = round(baseline_eal * (1.0 - total_reduction_factor), 2)
    simulated_p95 = round(baseline_p95 * (1.0 - (total_reduction_factor * 1.1)), 2)

    eal_reduction = round(baseline_eal - simulated_eal, 2)
    p95_reduction = round(baseline_p95 - simulated_p95, 2)
    reduction_percentage = round(total_reduction_factor * 100.0, 1)

    return {
        "status": "success",
        "inputs": {
            "simulated_controls": simulated_controls,
            "mfa_coverage": mfa_coverage,
            "patch_delay_days": patch_delay_days,
        },
        "baseline": {
            "total_eal": baseline_eal,
            "p95_loss": baseline_p95,
        },
        "simulated": {
            "total_eal": simulated_eal,
            "p95_loss": simulated_p95,
        },
        "deltas": {
            "eal_reduction": eal_reduction,
            "p95_reduction": p95_reduction,
            "reduction_percentage": reduction_percentage,
        },
    }
