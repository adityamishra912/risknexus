import copy
from typing import Dict, Any, Optional

from app.schemas.what_if import WhatIfChangeset, WhatIfScenarioResult, ScenarioDelta
from app.services.risk_engine.engine import quantify_scenario
from app.services.risk_engine.exceptions import MissingImpactDataError
from app.schemas.risk import RiskQuantificationSchema

def _apply_control_changes(modified: Dict[str, Any], changes: WhatIfChangeset, is_nested: bool) -> None:
    controls_key = "control_status_list" if is_nested else "active_controls"
    
    if is_nested:
        controls_list = modified.get(controls_key, [])
        if changes.control_overrides:
            for override in changes.control_overrides:
                for control in controls_list:
                    if control.get("control_id") == override.control_id:
                        if override.status is not None:
                            control["status"] = override.status
                        if override.coverage is not None:
                            control["coverage"] = override.coverage
                        if override.maturity is not None:
                            control["maturity"] = override.maturity
                            
        if changes.add_controls:
            for new_control in changes.add_controls:
                modified.setdefault(controls_key, []).append(
                    new_control.model_dump(exclude_none=True)
                )
                
        if changes.remove_control_ids:
            modified[controls_key] = [
                c for c in modified.get(controls_key, [])
                if c.get("control_id") not in changes.remove_control_ids
            ]
    else:
        # Flat structure: active_controls is just a list of strings
        controls_list = modified.get(controls_key, [])
        if changes.add_controls:
            for new_control in changes.add_controls:
                if new_control.control_id not in controls_list:
                    controls_list.append(new_control.control_id)
        if changes.remove_control_ids:
            controls_list = [c for c in controls_list if c not in changes.remove_control_ids]
        modified[controls_key] = controls_list

def apply_changes(
    scenario_data: Dict[str, Any],
    changes: WhatIfChangeset,
) -> Dict[str, Any]:
    modified = copy.deepcopy(scenario_data)
    is_nested = "scenario_row" in modified or "asset_data" in modified
    
    # helper for nested vs flat
    def set_val(nested_key, flat_key, val):
        if val is not None:
            if is_nested:
                modified.setdefault(nested_key, {})[flat_key] = val
            else:
                modified[flat_key] = val

    # apply asset overrides
    set_val("asset_data", "criticality", changes.asset_criticality)
    if is_nested:
        set_val("asset_data", "internet_exposed", changes.internet_exposed)
    else:
        set_val("asset_data", "internet_exposed", changes.internet_exposed)
        
    # apply vulnerability overrides
    set_val("vuln_data", "cvss_score", changes.cvss_score)
    set_val("vuln_data", "known_exploited", changes.known_exploited)
    set_val("vuln_data", "days_open", changes.days_open)
        
    # apply control overrides
    _apply_control_changes(modified, changes, is_nested)
    
    # apply service overrides
    set_val("service_data", "downtime_cost_per_hour", changes.downtime_cost_per_hour)
        
    # apply threat overrides
    if is_nested:
        set_val("threat_data", "activity_level", changes.threat_activity)
    else:
        set_val("threat_data", "threat_activity", changes.threat_activity)
        
    return modified

from app.utils.type_parsers import parse_float

def compute_delta(
    baseline: Dict[str, Any],
    simulated: Dict[str, Any],
) -> Dict[str, ScenarioDelta]:
    metrics = ["probability", "eal", "mean_eal", "p90", "p95", "p99"]
    delta = {}
    for m in metrics:
        b = parse_float(baseline.get(m, 0.0))
        s = parse_float(simulated.get(m, 0.0))
        d = round(s - b, 4)
        pct = round((d / b * 100), 2) if b != 0.0 else 0.0
        delta[m] = ScenarioDelta(baseline=b, simulated=s, delta=d, delta_pct=pct)
    return delta

def _describe_applied_changes(changes: WhatIfChangeset) -> Dict[str, Any]:
    return changes.model_dump(exclude_none=True)

def simulate_scenario(
    scenario_data: Dict[str, Any],
    changes: WhatIfChangeset,
    data_dir: Optional[str] = None,
) -> WhatIfScenarioResult:
    baseline = quantify_scenario(scenario_data, data_dir=data_dir)
    modified = apply_changes(scenario_data, changes)
    
    try:
        simulated = quantify_scenario(modified, data_dir=data_dir)
    except MissingImpactDataError as e:
        simulated = {**baseline, "status": "impact_data_missing", "error": str(e)}
        
    delta = compute_delta(baseline, simulated)
    applied = _describe_applied_changes(changes)
    
    return WhatIfScenarioResult(
        scenario_id=baseline["scenario_id"],
        scenario_name=baseline["scenario_name"],
        baseline=RiskQuantificationSchema(**baseline),
        simulated=RiskQuantificationSchema(**simulated),
        delta=delta,
        applied_changes=applied,
    )
