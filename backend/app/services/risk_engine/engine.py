# app/services/risk_engine/engine.py

import logging
from typing import Dict, Any, List, Optional
from app.services.ml.feature_builder import build_feature_vector
from app.services.ml.predictor import predictor_service
from app.services.risk_engine.impact import resolve_triangular_financial_impact
from app.services.monte_carlo.simulator import run_monte_carlo_simulation, run_enterprise_monte_carlo
from app.services.risk_engine.scenario_generator import generate_risk_scenarios
from app.services.risk_engine.loss_event_consolidator import consolidate_scenarios_into_loss_events
from app.services.risk_engine.exceptions import (
    MissingImpactDataError,
    MissingLinkedRecordError,
)

logger = logging.getLogger(__name__)


def quantify_scenario(scenario_data: Dict[str, Any], data_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Quantifies a single risk scenario:
    1. Feature Extraction -> build 12-feature vector
    2. ML Model Access -> predict calibrated probability & confidence
    3. Impact Lookup -> resolve triangular financial loss (min, likely, max)
    4. Point-Estimate EAL -> probability * likely_impact
    5. Monte Carlo Simulation -> Bernoulli trial + Triangular sampling (mean EAL, P90, P95, P99)
    6. Returns structured risk output with evidence
    """
    if "scenario_row" in scenario_data or "asset_data" in scenario_data:
        scen_row = scenario_data.get("scenario_row", {})
        asset_data = scenario_data.get("asset_data", {})
        vuln_data = scenario_data.get("vuln_data", {})
        service_data = scenario_data.get("service_data", {})
        threat_data = scenario_data.get("threat_data", {})
        control_list = scenario_data.get("control_status_list", [])
        path_len = int(scenario_data.get("attack_path_length", 2))
        path_info = scenario_data.get("attack_path_info", {})
    else:
        scen_row = scenario_data
        asset_data = {
            "asset_id": scenario_data.get("asset_id"),
            "asset_name": scenario_data.get("asset_name"),
            "asset_type": scenario_data.get("asset_type", "Server"),
            "criticality": scenario_data.get("asset_criticality", 5),
            "internet_exposed": scenario_data.get("internet_exposed", False),
            "service_id": scenario_data.get("service_id"),
        }
        vuln_data = {
            "vulnerability_id": scenario_data.get("vulnerability_id"),
            "cve_id": scenario_data.get("cve_id"),
            "cvss_score": scenario_data.get("cvss_score", 5.0),
            "known_exploited": scenario_data.get("known_exploited", False),
            "days_open": scenario_data.get("days_open", 30),
            "exploitability": scenario_data.get("exploitability", "Medium"),
        }
        service_data = {
            "service_id": scenario_data.get("service_id"),
            "service_name": scenario_data.get("service_name"),
            "downtime_cost_per_hour": scenario_data.get("downtime_cost_per_hour", 50000.0),
            "data_sensitivity": scenario_data.get("data_sensitivity", "Medium"),
        }
        threat_data = {
            "threat_id": scenario_data.get("threat_id"),
            "threat_name": scenario_data.get("threat_name"),
            "activity_level": scenario_data.get("threat_activity", "medium"),
        }
        active_controls = scenario_data.get("active_controls", [])
        control_list = [
            {"control_id": cid, "status": "Implemented", "coverage": 0.85, "maturity": 4.0}
            for cid in active_controls
        ]
        path_len = int(scenario_data.get("attack_path_length", 2))
        path_info = {
            "reachable": scenario_data.get("attack_path_reachable", True),
            "length": path_len,
            "strength": scenario_data.get("path_strength", 0.5),
        }

    scen_id = str(scen_row.get("scenario_id", "RS0001")).strip()
    asset_id = str(asset_data.get("asset_id", "")).strip()
    if not asset_id:
        raise MissingLinkedRecordError(
            scenario_id=scen_id,
            record_type="asset",
            record_id=asset_id,
            reason="Missing asset_id in scenario data",
        )

    asset_name = str(asset_data.get("asset_name", asset_id)).strip()
    asset_type = str(asset_data.get("asset_type", "Server")).strip()
    vuln_id = str(vuln_data.get("vulnerability_id", "V0001")).strip()
    threat_id = str(threat_data.get("threat_id", scen_row.get("threat_id", "T001"))).strip()
    threat_name = str(threat_data.get("threat_name", "Cyber Attack")).strip()
    service_id = str(asset_data.get("service_id", service_data.get("service_id", ""))).strip()

    scenario_name = f"{threat_name} on {asset_name}"

    # 1. Standardized 12 ML Feature Extraction
    features = build_feature_vector(
        asset_data=asset_data,
        vuln_data=vuln_data,
        control_status_list=control_list,
        threat_data=threat_data,
        attack_path_info=path_info,
        attack_path_length=path_len,
    )

    # 2. ML Likelihood Model (predicts calibrated breach probability)
    if "precomputed_probability" in scenario_data:
        probability = scenario_data["precomputed_probability"]
        confidence = scenario_data.get("precomputed_confidence", 0.5)
    else:
        probability, confidence = predictor_service.predict_likelihood(features)

    # 3. Triangular Financial Impact Resolution
    impact_dist = resolve_triangular_financial_impact(
        threat_id=threat_id,
        asset_type=asset_type,
        service_data=service_data,
        scenario_row=scen_row,
        data_dir=data_dir,
    )

    min_impact = impact_dist["min"]
    likely_impact = impact_dist["likely"]
    max_impact = impact_dist["max"]

    # 4. Point-Estimate EAL (probability * likely_impact)
    eal = round(probability * likely_impact, 2)

    # 5. Scenario-Level Monte Carlo Simulation (Bernoulli + Triangular)
    mc_results = run_monte_carlo_simulation(
        base_probability=probability,
        min_impact=min_impact,
        likely_impact=likely_impact,
        max_impact=max_impact,
        iterations=500,
    )

    # 6. Structured Evidence Dict
    evidence = {
        "cvss_score": features["cvss_score"],
        "exploitability": features["exploitability"],
        "known_exploited": bool(features["known_exploited"]),
        "vulnerability_age_days": features["vulnerability_age_days"],
        "internet_exposed": bool(features["internet_exposed"]),
        "asset_criticality": features["asset_criticality"],
        "attack_path_reachable": bool(features["attack_path_reachable"]),
        "attack_path_length": features["attack_path_length"],
        "path_strength": features["path_strength"],
        "control_coverage": features["control_coverage"],
        "control_maturity": features["control_maturity"],
        "threat_activity": features["threat_activity"],
        "downtime_cost_per_hour": float(service_data.get("downtime_cost_per_hour", 0.0)),
        "data_sensitivity": str(service_data.get("data_sensitivity", "Medium")),
    }

    return {
        "scenario_id": scen_id,
        "scenario_name": scenario_name,
        "asset_id": asset_id,
        "asset_name": asset_name,
        "vulnerability_id": vuln_id,
        "threat_id": threat_id,
        "business_service_id": service_id,
        "probability": probability,
        "impact": likely_impact,
        "impact_triangular": impact_dist,
        "eal": eal,
        "mean_eal": mc_results["mean_eal"],
        "p90": mc_results["p90"],
        "p95": mc_results["p95"],
        "p99": mc_results["p99"],
        "confidence": confidence,
        "evidence": evidence,
        "status": "quantified",
    }


_quantified_scenarios_cache: Dict[str, Any] = {}


def clear_scenario_cache() -> None:
    """Invalidates the in-memory scenario cache. Call after data changes or force re-run."""
    global _quantified_scenarios_cache
    _quantified_scenarios_cache.clear()
    logger.info("[Engine] Scenario cache cleared.")


def quantify_all_scenarios(data_dir: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Generates and quantifies all canonical risk scenarios (one per asset × threat)
    with in-memory caching. Call clear_scenario_cache() to force a re-run.
    """
    global _quantified_scenarios_cache
    cache_key = data_dir or "default"
    if not force_refresh and cache_key in _quantified_scenarios_cache:
        return _quantified_scenarios_cache[cache_key]

    gen_result = generate_risk_scenarios(data_dir=data_dir)
    if gen_result.get("status") == "error":
        logger.error("Scenario generation error: %s", gen_result.get("error"))
        return {"scenarios": [], "failed": [], "generation_error": gen_result.get("error")}

    scenarios_input = gen_result.get("scenarios", [])

    # Vectorized Batch Prediction across all 2,800+ scenarios in C++ (5ms)
    try:
        feature_list = []
        for item in scenarios_input:
            asset_data = item.get("asset_data", {})
            vuln_data = item.get("vuln_data", {})
            control_list = item.get("control_status_list", [])
            threat_data = item.get("threat_data", {})
            path_info = item.get("attack_path_info", {})
            path_len = int(item.get("attack_path_length", 2))
            f = build_feature_vector(
                asset_data=asset_data,
                vuln_data=vuln_data,
                control_status_list=control_list,
                threat_data=threat_data,
                attack_path_info=path_info,
                attack_path_length=path_len,
            )
            feature_list.append(f)
        
        preds = predictor_service.predict_batch(feature_list)
        for idx, item in enumerate(scenarios_input):
            if idx < len(preds):
                item["precomputed_probability"] = preds[idx][0]
                item["precomputed_confidence"] = preds[idx][1]
    except Exception as exc:
        logger.warning("Batch ML prediction fallback: %s", exc)

    results: List[Dict[str, Any]] = []
    failed: List[Dict[str, Any]] = []

    for item in scenarios_input:
        scen_id = item.get("scenario_id", "UNKNOWN")
        try:
            results.append(quantify_scenario(item, data_dir=data_dir))
        except MissingImpactDataError as e:
            logger.warning("Scenario '%s' skipped — missing impact data: %s", scen_id, e)
            failed.append({"scenario_id": scen_id, "status": "impact_data_missing", "reason": str(e)})
        except MissingLinkedRecordError as e:
            logger.warning("Scenario '%s' skipped — missing linked record: %s", scen_id, e)
            failed.append({"scenario_id": scen_id, "status": "linked_data_missing", "reason": str(e)})
        except Exception as e:
            
            logger.exception("Scenario '%s' failed unexpectedly", scen_id)
            failed.append({"scenario_id": scen_id, "status": "unexpected_error", "reason": str(e)})

    results.sort(key=lambda r: r.get("eal", 0.0), reverse=True)

    # Consolidate raw technical scenarios into non-overlapping Business Loss Events
    loss_events = consolidate_scenarios_into_loss_events(results, data_dir=data_dir)

    if failed:
        logger.warning("%d of %d scenarios could not be quantified (%d succeeded)",
                        len(failed), len(scenarios_input), len(results))

    output = {
        "scenarios": results,
        "loss_events": loss_events,
        "failed": failed,
        "total_generated": len(scenarios_input),
        "total_quantified": len(results),
        "total_loss_events": len(loss_events),
        "total_failed": len(failed),
    }
    _quantified_scenarios_cache[cache_key] = output
    return output

class EngineService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir

    def execute(self, *args, **kwargs) -> Dict[str, Any]:
        return quantify_all_scenarios(self.data_dir)