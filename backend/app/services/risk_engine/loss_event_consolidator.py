# app/services/risk_engine/loss_event_consolidator.py

import logging
from typing import Dict, Any, List, Optional
from app.services.monte_carlo.simulator import run_monte_carlo_simulation

logger = logging.getLogger(__name__)


def consolidate_scenarios_into_loss_events(
    quantified_scenarios: List[Dict[str, Any]],
    data_dir: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Consolidates raw technical risk scenarios (Asset x Vulnerability x Threat) into
    higher-level Business Impact Loss Events (Business Service x Threat Event).

    Hierarchy:
    Threat Event / Business Service
       │
       ├── Attack Path 1 / Vuln 1 (Technical Scenario 1)
       ├── Attack Path 2 / Vuln 2 (Technical Scenario 2)
       └── Attack Path 3 / Vuln 3 (Technical Scenario 3)
              ↓
         One Business Impact Event

    Noisy-OR Probability Formulation:
      P_event = 1 - Prod(1 - P_j) across all technical scenarios j for this event.
      Capped at 0.95 maximum to preserve realistic probabilistic modeling.
    """
    grouped: Dict[str, List[Dict[str, Any]]] = {}

    for scenario in quantified_scenarios:
        service_id = scenario.get("business_service_id") or scenario.get("service_id") or "S_GENERIC"
        threat_id = scenario.get("threat_id", "T001")

        # Group key: Service + Threat Event
        key = f"{service_id}|{threat_id}"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(scenario)

    loss_events: List[Dict[str, Any]] = []

    for idx, (group_key, scenarios) in enumerate(grouped.items(), start=1):
        sample = scenarios[0]
        service_id = sample.get("business_service_id") or sample.get("service_id", "S_GENERIC")
        threat_id = sample.get("threat_id", "T001")

        # Resolve threat name cleanly
        full_scen_name = sample.get("scenario_name", "")
        threat_name = sample.get("threat_name")
        if not threat_name:
            threat_name = full_scen_name.split(" on ")[0] if " on " in full_scen_name else "Cyber Threat"

        service_name = sample.get("service_name") or sample.get("asset_name") or "Enterprise Service"

        # 1. Business-event probability = max across contributing route probabilities.
        #    Routes to the same business loss event are ALTERNATIVE attack paths,
        #    not independent events. Using max(P_j) selects the most likely route
        #    without compounding probabilities additively.
        #    (Noisy-OR is used only as an ML exploitability feature in the generator.)
        combined_prob = round(
            min(0.95, max((float(s.get("probability", 0.0)) for s in scenarios), default=0.0)),
            4
        )

        # 2. Financial Impact Profile (Single business impact for this service & threat)
        impact_dist = sample.get("impact_triangular", {})
        min_imp = float(impact_dist.get("min", sample.get("impact", 0.0) * 0.5))
        likely_imp = float(impact_dist.get("likely", sample.get("impact", 0.0)))
        max_imp = float(impact_dist.get("max", sample.get("impact", 0.0) * 2.0))

        for s in scenarios:
            imp_d = s.get("impact_triangular", {})
            if float(imp_d.get("likely", 0.0)) > likely_imp:
                likely_imp = float(imp_d.get("likely", 0.0))
                min_imp = float(imp_d.get("min", likely_imp * 0.5))
                max_imp = float(imp_d.get("max", likely_imp * 2.0))

        # 3. Consolidated EAL = Combined Probability * Likely Impact
        consolidated_eal = round(combined_prob * likely_imp, 2)

        # 4. Scenario Monte Carlo simulation for this consolidated event
        mc_res = run_monte_carlo_simulation(
            base_probability=combined_prob,
            min_impact=min_imp,
            likely_impact=likely_imp,
            max_impact=max_imp,
            iterations=10000,
        )

        # 5. Aggregate evidence & contributing technical factors
        contributing_scenarios = [s.get("scenario_id") for s in scenarios if s.get("scenario_id")]
        contributing_cves = list(set(
            s.get("vulnerability_id") or s.get("cve_id")
            for s in scenarios
            if s.get("vulnerability_id") or s.get("cve_id")
        ))
        contributing_assets = list(set(
            s.get("asset_name") or s.get("asset_id")
            for s in scenarios
            if s.get("asset_name") or s.get("asset_id")
        ))

        event_name = f"{threat_name} affecting {service_name}"
        event_id = f"BLE-{idx:03d}"

        loss_events.append({
            "event_id": event_id,
            "event_name": event_name,
            "business_service_id": service_id,
            "service_name": service_name,
            "threat_id": threat_id,
            "threat_name": threat_name,
            "probability": combined_prob,
            "impact": likely_imp,
            "impact_triangular": {
                "min": min_imp,
                "likely": likely_imp,
                "max": max_imp,
            },
            "eal": consolidated_eal,
            "mean_eal": mc_res["mean_eal"],
            "p90": mc_res["p90"],
            "p95": mc_res["p95"],
            "p99": mc_res["p99"],
            "contributing_scenarios_count": len(scenarios),
            "contributing_scenario_ids": contributing_scenarios,
            "contributing_vulnerabilities": contributing_cves,
            "affected_assets": contributing_assets,
            "status": "quantified",
        })

    # Sort loss events by EAL descending
    loss_events.sort(key=lambda e: e["eal"], reverse=True)
    return loss_events
