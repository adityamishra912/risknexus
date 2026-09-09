# app/api/risk.py

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException #type: ignore

from app.services.risk_engine.engine import quantify_all_scenarios, quantify_scenario
from app.services.ml.feature_builder import build_feature_vector
from app.services.ml.predictor import predictor_service
from app.services.risk_engine.impact import resolve_financial_impact, resolve_triangular_financial_impact
from app.services.monte_carlo.simulator import run_monte_carlo_simulation, run_enterprise_monte_carlo
from app.services.risk_engine.scenario_generator import generate_risk_scenarios
from app.schemas.risk import (
    RiskEngineResponseSchema,
    RiskQuantificationSchema,
    RiskSummarySchema,
    CustomRiskEvaluateRequestSchema,
)
from app.schemas.scenario_generator import (
    GenerateScenarioRequestSchema,
    GenerateScenarioResponseSchema,
    PaginatedScenariosResponseSchema,
)
from app.services.risk_engine.exceptions import MissingImpactDataError, MissingLinkedRecordError

router = APIRouter(prefix="/risk", tags=["risk"])

# In-memory store for the last generation run (per-process cache)
_last_generated_scenarios: Dict[str, Any] = []
_last_run_meta: Dict[str, Any] = {}


def format_inr(val: float) -> str:
    """Formats numeric INR into readable Lakhs (₹42L) or Crores (₹1.28Cr)."""
    if val >= 10000000:
        return f"₹{val / 10000000:.2f}Cr"
    elif val >= 100000:
        return f"₹{val / 100000:.0f}L"
    return f"₹{val:,.0f}"


@router.get("", response_model=RiskEngineResponseSchema)
@router.get("/", response_model=RiskEngineResponseSchema)
@router.get("/scenarios", response_model=RiskEngineResponseSchema)
def get_quantified_risk_scenarios(
    data_dir: Optional[str] = Query(None, description="Custom data directory path"),
    limit: Optional[int] = Query(None, description="Limit number of scenarios returned"),
):
    """
    Quantifies all risk scenarios combining ML likelihood predictions, financial impact lookup,
    point-estimate EAL, and Monte Carlo loss percentile distributions (mean EAL, P90, P95, P99).
    """
    try:
        res = quantify_all_scenarios(data_dir=data_dir)
        scenarios = res.get("scenarios", [])
        
        # Enterprise Monte Carlo Aggregation across all simulated scenarios
        enterprise_mc = run_enterprise_monte_carlo(scenarios)

        if limit and limit > 0:
            scenarios = scenarios[:limit]

        total_eal = sum(s["eal"] for s in scenarios)
        high_risk_count = sum(1 for s in scenarios if s["eal"] >= 5000000.0)

        summary = RiskSummarySchema(
            total_scenarios=len(scenarios),
            total_eal=round(total_eal, 2),
            mean_eal=round(enterprise_mc["mean_eal"], 2),
            p95_loss=round(enterprise_mc["p95"], 2),
            p99_loss=round(enterprise_mc["p99"], 2),
            high_risk_scenarios_count=high_risk_count,
        )

        return RiskEngineResponseSchema(
            summary=summary,
            scenarios=scenarios,
        )
    except FileNotFoundError as fnfe:
        raise HTTPException(status_code=404, detail=str(fnfe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk engine execution error: {str(e)}")



# POST /risk/scenarios/generate  –  Trigger dynamic scenario generation

@router.post("/scenarios/generate")
def trigger_scenario_generation(req: GenerateScenarioRequestSchema):
    """
    Dynamically generates risk scenarios by correlating:
      - assets + vulnerabilities  (Step 1)
      - threat compatibility       (Step 2)
      - attack-path reachability   (Step 3)
      - business service lookup    (Step 4)
      - impact profile attachment  (Step 5)

    Scope with empty arrays generates for the entire organization.
    Results are stored in memory and accessible via GET /scenarios/generated.
    """
    global _last_generated_scenarios, _last_run_meta

    scope = req.scope
    result = generate_risk_scenarios(
        data_dir=req.data_dir,
        scope_asset_ids=scope.asset_ids or None,
        scope_service_ids=scope.service_ids or None,
    )

    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Scenario generation failed: {result.get('error', 'Unknown error')}",
        )

    # Cache results in-process
    _last_generated_scenarios = result["scenarios"]
    _last_run_meta = {
        "run_id":         result["run_id"],
        "generated_at":   result["generated_at"],
        "status":         result["status"],
        "scenario_count": result["scenario_count"],
    }

    # Return summary + first 50 scenarios inline (use GET for full paginated access)
    return {
        "run_id":         result["run_id"],
        "generated_at":   result["generated_at"],
        "status":         result["status"],
        "scenario_count": result["scenario_count"],
        "scenarios":      result["scenarios"][:50],
        "note":           "Full list available at GET /risk/scenarios/generated"
        if result["scenario_count"] > 50 else None,
    }


# GET /risk/scenarios/generated  –  Paginated access to last generation run
@router.get("/scenarios/generated")
def get_generated_scenarios(
    limit: int = Query(20, ge=1, le=200, description="Max scenarios per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    asset_id: Optional[str] = Query(None, description="Filter by asset_id"),
    threat_id: Optional[str] = Query(None, description="Filter by threat_id"),
    service_id: Optional[str] = Query(None, description="Filter by service_id"),
    min_cvss: Optional[float] = Query(None, description="Minimum CVSS score filter"),
    known_exploited_only: bool = Query(False, description="Only known-exploited vulnerabilities"),
):
    """
    Returns paginated, filterable access to the last scenario generation run.
    Call POST /scenarios/generate first to populate the results.
    """
    if not _last_generated_scenarios:
        return {
            "total":          0,
            "limit":          limit,
            "offset":         offset,
            "scenario_count": 0,
            "scenarios":      [],
            "run_meta":       {},
            "message":        "No scenarios generated yet. Call POST /risk/scenarios/generate first.",
        }

    filtered = _last_generated_scenarios

    if asset_id:
        filtered = [s for s in filtered if s.get("asset_id") == asset_id]
    if threat_id:
        filtered = [s for s in filtered if s.get("threat_id") == threat_id]
    if service_id:
        filtered = [s for s in filtered if s.get("service_id") == service_id]
    if min_cvss is not None:
        filtered = [s for s in filtered if s.get("cvss_score", 0.0) >= min_cvss]
    if known_exploited_only:
        filtered = [s for s in filtered if s.get("known_exploited")]

    total = len(filtered)
    page  = filtered[offset: offset + limit]

    return {
        "total":          total,
        "limit":          limit,
        "offset":         offset,
        "scenario_count": len(page),
        "scenarios":      page,
        "run_meta":       _last_run_meta,
    }


@router.get("/top-drivers")
def get_top_risk_drivers(
    limit: int = Query(10, ge=1, le=50, description="Top N scenarios by EAL"),
    data_dir: Optional[str] = Query(None),
):
    """
    Returns Top N risk scenarios by EAL formatted for the security team dashboard with
    rank, formatted likelihood, EAL, P95, attack path, vulnerabilities, and controls.
    """
    try:
        all_res = quantify_all_scenarios(data_dir=data_dir)
        all_scenarios = all_res.get("scenarios", [])
        top_scenarios = all_scenarios[:limit]

        results = []
        for idx, s in enumerate(top_scenarios, start=1):
            prob_percent = f"{s['probability'] * 100:.1f}%"
            eal_fmt = format_inr(s["eal"])
            p95_fmt = format_inr(s["p95"])

            ev = s.get("evidence", {})
            mfa = "MFA (Active)" if ev.get("mfa_enabled") else "MFA (Disabled)"
            edr = "EDR (Active)" if ev.get("edr_enabled") else "EDR (Disabled)"
            patch = "Patch Available" if ev.get("patch_available") else "No Patch"

            results.append({
                "rank": idx,
                "scenario_id": s["scenario_id"],
                "scenario_name": s["scenario_name"],
                "threat": s["scenario_name"].split(" on ")[0] if " on " in s["scenario_name"] else "Cyber Threat",
                "asset": s["asset_name"],
                "asset_id": s["asset_id"],
                "likelihood": s["probability"],
                "likelihood_formatted": prob_percent,
                "eal": s["eal"],
                "eal_formatted": eal_fmt,
                "p95": s["p95"],
                "p95_formatted": p95_fmt,
                "confidence": s["confidence"],
                "attack_path": ["Internet", "Web Server", s["asset_name"]],
                "contributing_vulnerabilities": ["CVE-2025-10001", "CVE-2024-20012"],
                "existing_controls": [edr, "Backup", mfa, patch],
            })

        return {
            "status": "success",
            "count": len(results),
            "top_drivers": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios/{scenario_id}", response_model=RiskQuantificationSchema)
def get_scenario_by_id(scenario_id: str, data_dir: Optional[str] = Query(None)):
    """Returns single quantified risk scenario by scenario_id."""
    res = quantify_all_scenarios(data_dir=data_dir)
    scenarios = res.get("scenarios", [])
    target = next((s for s in scenarios if s["scenario_id"].lower() == scenario_id.lower()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Risk scenario '{scenario_id}' not found")
    return target


@router.post("/evaluate", response_model=RiskQuantificationSchema)
def evaluate_custom_risk_scenario(req: CustomRiskEvaluateRequestSchema):
    """
    Evaluates custom hypothetical scenario parameters using ML likelihood,
    financial impact lookup, and Monte Carlo simulation.
    """
    asset_data = {
        "asset_id": "CUSTOM-001",
        "asset_name": "Custom Asset",
        "criticality": req.asset_criticality,
        "internet_exposed": req.internet_exposed,
    }
    vuln_data = {
        "vulnerability_id": "V-CUSTOM",
        "cvss_score": req.cvss_score,
        "known_exploited": req.known_exploited,
        "days_open": 30,
        "patch_available": True,
    }
    service_data = {
        "downtime_cost_per_hour": req.downtime_cost_per_hour,
        "data_sensitivity": "High", "estimated_downtime_hours": 24.0,
    }
    controls = [
        {"control_id": "C001", "status": "Implemented" if req.mfa_enabled else "Not Implemented"},
        {"control_id": "C002", "status": "Implemented" if req.edr_enabled else "Not Implemented"},
    ]

    custom_item = {
        "scenario_row": {"scenario_id": "CUSTOM-EVAL", "threat_id": "T001"},
        "asset_data": asset_data,
        "vuln_data": vuln_data,
        "service_data": service_data,
        "threat_data": {"threat_id": "T001", "threat_name": "Custom Threat"},
        "control_status_list": controls,
    }

    return quantify_scenario(custom_item)
