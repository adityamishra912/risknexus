# app/api/risk.py

import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException  # type: ignore

from app.services.risk_engine.engine import quantify_all_scenarios, quantify_scenario, clear_scenario_cache
from app.services.ml.feature_builder import build_feature_vector
from app.services.ml.predictor import predictor_service
from app.services.risk_engine.impact import resolve_financial_impact, resolve_triangular_financial_impact
from app.services.monte_carlo.simulator import run_monte_carlo_simulation, run_enterprise_monte_carlo
from app.services.risk_engine.scenario_generator import generate_risk_scenarios
from app.services.attack_graph.graph_builder import resolve_data_dir
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

logger = logging.getLogger(__name__)
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
    Quantifies all canonical risk scenarios (one per asset × threat pair).

    Returns:
    - technical_scenario_exposure: Σ(P × likely_impact) across technical scenarios.
      This is a point-estimate sum, NOT the Enterprise EAL.
    - mean_eal: Enterprise EAL — mean of consolidated Monte Carlo simulation
      across Business Loss Events (independent event aggregation).
    - p90, p95, p99: Loss percentiles from the enterprise Monte Carlo.
    """
    try:
        res = quantify_all_scenarios(data_dir=data_dir)
        scenarios = res.get("scenarios", [])
        loss_events = res.get("loss_events", [])

        # Enterprise Monte Carlo aggregation across CONSOLIDATED LOSS EVENTS.
        # Events are sampled independently (no correlation modeling).
        mc_input = loss_events if loss_events else scenarios
        enterprise_mc = run_enterprise_monte_carlo(mc_input)

        # Technical Scenario Exposure = Σ(P × likely_impact) across technical scenarios.
        # Renamed from total_eal to avoid confusion with Enterprise EAL.
        technical_scenario_exposure = sum(s.get("eal", 0.0) for s in scenarios)
        high_risk_count = sum(1 for e in mc_input if e.get("eal", 0.0) >= 5000000.0)

        if limit and limit > 0:
            scenarios = scenarios[:limit]

        summary = RiskSummarySchema(
            total_scenarios=len(scenarios),
            total_technical_scenarios=res.get("total_quantified", len(scenarios)),
            total_loss_events=len(loss_events) if loss_events else len(scenarios),
            # Correctly labeled: sum across technical scenarios, not Enterprise EAL
            total_eal=round(technical_scenario_exposure, 2),
            technical_scenario_exposure=round(technical_scenario_exposure, 2),
            # Enterprise EAL = Monte Carlo mean across consolidated loss events
            mean_eal=round(enterprise_mc["mean_eal"], 2),
            p90_loss=round(enterprise_mc.get("p90", enterprise_mc["mean_eal"] * 1.1), 2),
            p95_loss=round(enterprise_mc["p95"], 2),
            p99_loss=round(enterprise_mc["p99"], 2),
            high_risk_scenarios_count=high_risk_count,
        )

        return RiskEngineResponseSchema(
            summary=summary,
            scenarios=scenarios,
            loss_events=loss_events,
        )
    except FileNotFoundError as fnfe:
        raise HTTPException(status_code=404, detail=str(fnfe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk engine execution error: {str(e)}")


# ---------------------------------------------------------------------------
# POST /risk/scenarios/generate  –  Trigger dynamic scenario generation
# ---------------------------------------------------------------------------
@router.post("/scenarios/generate")
def trigger_scenario_generation(req: GenerateScenarioRequestSchema):
    """
    Dynamically generates canonical risk scenarios (one per asset × threat pair)
    by correlating assets, vulnerabilities (aggregated), threats, attack paths,
    business services, and impact profiles.
    """
    global _last_generated_scenarios, _last_run_meta

    # Invalidate the quantification cache so the next GET re-runs with fresh scenarios
    clear_scenario_cache()

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

    _last_generated_scenarios = result["scenarios"]
    _last_run_meta = {
        "run_id":         result["run_id"],
        "generated_at":   result["generated_at"],
        "status":         result["status"],
        "scenario_count": result["scenario_count"],
    }

    return {
        "run_id":         result["run_id"],
        "generated_at":   result["generated_at"],
        "status":         result["status"],
        "scenario_count": result["scenario_count"],
        "scenarios":      result["scenarios"][:50],
        "note":           "Full list available at GET /risk/scenarios/generated"
        if result["scenario_count"] > 50 else None,
    }


# ---------------------------------------------------------------------------
# GET /risk/scenarios/generated  –  Paginated access to last generation run
# ---------------------------------------------------------------------------
@router.get("/scenarios/generated")
def get_generated_scenarios(
    limit: int = Query(20, ge=1, le=200, description="Max scenarios per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    asset_id: Optional[str] = Query(None),
    threat_id: Optional[str] = Query(None),
    service_id: Optional[str] = Query(None),
    min_cvss: Optional[float] = Query(None),
    known_exploited_only: bool = Query(False),
):
    """Returns paginated, filterable access to the last scenario generation run."""
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


# ---------------------------------------------------------------------------
# GET /risk/top-drivers  –  Top N scenarios by EAL with real contributing CVEs
# ---------------------------------------------------------------------------
@router.get("/top-drivers")
def get_top_risk_drivers(
    limit: int = Query(10, ge=1, le=50),
    data_dir: Optional[str] = Query(None),
):
    """
    Returns Top N risk scenarios by EAL.
    contributing_vulnerabilities lists all CVEs aggregated into each canonical scenario.
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
            controls_list = []
            if ev.get("mfa_enabled"):
                controls_list.append("MFA (Active)")
            else:
                controls_list.append("MFA (Disabled)")
            if ev.get("edr_enabled"):
                controls_list.append("EDR (Active)")
            if ev.get("patch_available"):
                controls_list.append("Patch Available")
            controls_list.append("Backup")

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
                "attack_path": s.get("attack_path", ["Internet", s["asset_name"]]),
                # Real CVEs aggregated into this canonical scenario (not hardcoded)
                "contributing_vulnerabilities": s.get("contributing_vulnerabilities", []),
                "contributing_vuln_count": s.get("contributing_vuln_count", 1),
                "existing_controls": controls_list,
            })

        return {
            "status": "success",
            "count": len(results),
            "top_drivers": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /risk/by-business-unit  –  EAL aggregated from actual scenario data
# ---------------------------------------------------------------------------
@router.get("/by-business-unit")
def get_risk_by_business_unit(data_dir: Optional[str] = Query(None)):
    """
    Returns EAL aggregated by business service, derived from actual quantified
    scenarios. NOT computed from fixed allocation fractions.
    """
    try:
        res = quantify_all_scenarios(data_dir=data_dir)
        scenarios = res.get("scenarios", [])

        bu_totals: Dict[str, float] = {}
        bu_assets:  Dict[str, set]  = {}
        bu_names:   Dict[str, str]  = {}

        for s in scenarios:
            svc_id   = s.get("business_service_id") or s.get("service_id") or "Unknown"
            svc_name = s.get("service_name") or svc_id
            eal_val  = float(s.get("eal", 0.0))

            bu_totals[svc_id] = bu_totals.get(svc_id, 0.0) + eal_val
            bu_names[svc_id]  = svc_name
            if svc_id not in bu_assets:
                bu_assets[svc_id] = set()
            bu_assets[svc_id].add(s.get("asset_id"))

        grand_total = sum(bu_totals.values()) or 1.0

        ranked = sorted(bu_totals.items(), key=lambda x: -x[1])

        return {
            "total_technical_scenario_exposure": round(grand_total, 2),
            "business_units": [
                {
                    "service_id":   svc_id,
                    "service_name": bu_names.get(svc_id, svc_id),
                    "eal":          round(eal, 2),
                    "eal_formatted": format_inr(eal),
                    "percent":      round(eal / grand_total * 100, 1),
                    "asset_count":  len(bu_assets.get(svc_id, set())),
                }
                for svc_id, eal in ranked
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /risk/trend  –  Historical EAL snapshots (returns empty if no history)
# ---------------------------------------------------------------------------
@router.get("/trend")
def get_risk_trend(
    days: int = Query(30, ge=1, le=365),
    data_dir: Optional[str] = Query(None),
):
    """
    Returns historical EAL snapshots for trend visualization.
    Returns empty list if no snapshot history has been recorded yet.

    Snapshots are persisted to /data/risk_snapshots.csv on each engine run.
    If no snapshots exist, the frontend must show an empty/placeholder state —
    not fabricated trend data.
    """
    try:
        data_path = resolve_data_dir(data_dir)
        snapshots_path = os.path.join(data_path, "risk_snapshots.csv")

        if not os.path.exists(snapshots_path):
            return {
                "snapshots": [],
                "has_history": False,
                "message": (
                    "No historical risk snapshots recorded yet. "
                    "Snapshots are written to risk_snapshots.csv on each engine run. "
                    "Re-run the risk engine periodically to build trend history."
                ),
            }

        import pandas as pd
        df = pd.read_csv(snapshots_path)
        if df.empty:
            return {"snapshots": [], "has_history": False, "message": "Snapshot file exists but contains no data."}

        # Expect columns: date, technical_scenario_exposure, enterprise_eal, p95, p99
        if "date" not in df.columns:
            return {"snapshots": [], "has_history": False, "message": "Snapshot file missing 'date' column."}

        df["date"] = pd.to_datetime(df["date"])
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
        df = df[df["date"] >= cutoff].sort_values("date")

        snapshots = []
        for _, row in df.iterrows():
            snapshots.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "enterprise_eal": round(float(row.get("enterprise_eal", 0)), 2),
                "technical_scenario_exposure": round(float(row.get("technical_scenario_exposure", 0)), 2),
                "p95": round(float(row.get("p95", 0)), 2),
                "p99": round(float(row.get("p99", 0)), 2),
            })

        return {
            "snapshots": snapshots,
            "has_history": True,
            "snapshot_count": len(snapshots),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /risk/loss-distribution  –  Empirical exceedance curve from Monte Carlo
# ---------------------------------------------------------------------------
@router.get("/loss-distribution")
def get_loss_distribution(
    data_dir: Optional[str] = Query(None),
    buckets: int = Query(30, ge=5, le=100),
):
    """
    Returns an empirical exceedance probability curve from the enterprise Monte Carlo
    simulation — NOT a parametric approximation or frontend-computed anchors.

    Each point: { loss, exceedance_probability } where exceedance = P(annual loss > loss).
    """
    try:
        res = quantify_all_scenarios(data_dir=data_dir)
        loss_events = res.get("loss_events", []) or res.get("scenarios", [])

        # Run MC with raw_losses so we can build the empirical curve
        mc = run_enterprise_monte_carlo(loss_events, iterations=10000, include_raw=True)

        raw_losses = sorted(mc.get("raw_losses", []))
        n = len(raw_losses)

        if n == 0:
            return {
                "curve": [],
                "eal": 0.0,
                "p90": 0.0,
                "p95": 0.0,
                "p99": 0.0,
                "message": "No loss data available.",
            }

        # Build empirical exceedance curve with `buckets` evenly-spaced quantile points
        step = max(1, n // buckets)
        curve = []
        for i in range(0, n, step):
            loss_val    = raw_losses[i]
            exceedance  = round(1.0 - (i / n), 4)
            curve.append({
                "loss":                   round(loss_val, 0),
                "loss_formatted":         format_inr(loss_val),
                "exceedance_probability": exceedance,
            })

        # Always include the final data point (minimum loss, maximum exceedance)
        if raw_losses:
            curve.append({
                "loss":                   round(raw_losses[-1], 0),
                "loss_formatted":         format_inr(raw_losses[-1]),
                "exceedance_probability": round(1.0 / n, 4),
            })

        return {
            "curve":      curve,
            "mean_eal":   mc["mean_eal"],
            "p90":        mc["p90"],
            "p95":        mc["p95"],
            "p99":        mc["p99"],
            "iterations": 10000,
            "source":     "enterprise_monte_carlo_empirical",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /risk/scenarios/{scenario_id}
# ---------------------------------------------------------------------------
@router.get("/scenarios/{scenario_id}", response_model=RiskQuantificationSchema)
def get_scenario_by_id(scenario_id: str, data_dir: Optional[str] = Query(None)):
    """Returns single quantified risk scenario by scenario_id."""
    res = quantify_all_scenarios(data_dir=data_dir)
    scenarios = res.get("scenarios", [])
    target = next((s for s in scenarios if s["scenario_id"].lower() == scenario_id.lower()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Risk scenario '{scenario_id}' not found")
    return target


# ---------------------------------------------------------------------------
# POST /risk/evaluate  –  Custom hypothetical scenario
# ---------------------------------------------------------------------------
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
        "data_sensitivity": "High",
        "estimated_downtime_hours": 24.0,
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
