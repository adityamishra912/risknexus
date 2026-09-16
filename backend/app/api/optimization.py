# app/api/optimization.py

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from app.services.optimizer.service import (
    OptimizerService,
    optimize_investment_portfolio,
    get_candidate_controls,
)

router = APIRouter(prefix="/optimization", tags=["optimization"])


class PortfolioEvaluateRequest(BaseModel):
    selected_initiative_ids: Optional[List[str]] = None
    budget: float = Field(default=10000000.0, description="Available security budget in INR")
    objective: str = Field(default="max_reduction")
    data_dir: Optional[str] = None
    include_curve: bool = Field(
        default=False,
        description="If true, generates the investment vs risk-reduction curve (slower).",
    )


class PortfolioRecommendRequest(BaseModel):
    budget: float = Field(default=10000000.0, description="Available security budget in INR")
    objective: str = Field(default="max_reduction")
    data_dir: Optional[str] = None
    include_curve: bool = Field(
        default=True,
        description="If true, generates the investment vs risk-reduction curve.",
    )


@router.get("/initiatives")
def get_initiatives_list(data_dir: Optional[str] = Query(None)):
    """
    Returns available security candidate controls with individual marginal risk-reduction
    estimates sorted by Benefit-to-Cost Ratio. Uses lightweight 500-iteration MC runs
    per control — does NOT run knapsack optimization.
    """
    try:
        candidates = get_candidate_controls(data_dir=data_dir)
        return {
            "status": "success",
            "count": len(candidates),
            "initiatives": candidates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate")
def evaluate_portfolio_endpoint(req: PortfolioEvaluateRequest):
    """
    Evaluates a specified set of security controls (or optimizes within budget) and
    computes total investment, joint risk reduction, residual EAL, and remaining budget.
    Set include_curve=true to also receive the investment efficiency curve (slower).
    """
    try:
        res = optimize_investment_portfolio(
            budget=req.budget,
            data_dir=req.data_dir,
            candidate_control_ids=req.selected_initiative_ids,
            include_curve=req.include_curve,
        )
        return {
            "status": "success",
            "budget": req.budget,
            "selected_initiative_ids": [c["control_id"] for c in res.get("selected_controls", [])],
            "selected_initiatives": res.get("selected_controls", []),
            "unselected_initiatives": res.get("unselected_controls_considered", []),
            "total_selected_investment": res.get("total_cost", 0.0),
            "total_expected_risk_reduction": res.get("total_risk_reduction", 0.0),
            "current_eal": res.get("baseline_enterprise_mean_eal", 0.0),
            "residual_eal": res.get("residual_enterprise_mean_eal", 0.0),
            "budget_remaining": max(0.0, req.budget - res.get("total_cost", 0.0)),
            "portfolio_rosi": round(
                res.get("total_risk_reduction", 0.0) / res.get("total_cost", 1.0), 2
            ) if res.get("total_cost", 0.0) > 0 else 0.0,
            "investment_curve": res.get("investment_curve", []),
            "solver_status": res.get("solver_status", "FEASIBLE"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend")
def recommend_optimal_portfolio_endpoint(req: PortfolioRecommendRequest):
    """
    Solves 0/1 Knapsack optimization to find the optimal set of candidate controls
    maximizing risk reduction within the specified budget.
    Set include_curve=true (default) to also receive the investment efficiency curve.
    """
    try:
        res = optimize_investment_portfolio(
            budget=req.budget,
            data_dir=req.data_dir,
            include_curve=req.include_curve,
        )
        return {
            "status": "success",
            "budget": req.budget,
            "selected_initiative_ids": [c["control_id"] for c in res.get("selected_controls", [])],
            "selected_initiatives": res.get("selected_controls", []),
            "unselected_initiatives": res.get("unselected_controls_considered", []),
            "total_selected_investment": res.get("total_cost", 0.0),
            "total_expected_risk_reduction": res.get("total_risk_reduction", 0.0),
            "current_eal": res.get("baseline_enterprise_mean_eal", 0.0),
            "residual_eal": res.get("residual_enterprise_mean_eal", 0.0),
            "budget_remaining": max(0.0, req.budget - res.get("total_cost", 0.0)),
            "portfolio_rosi": round(
                res.get("total_risk_reduction", 0.0) / res.get("total_cost", 1.0), 2
            ) if res.get("total_cost", 0.0) > 0 else 0.0,
            "investment_curve": res.get("investment_curve", []),
            "solver_status": res.get("solver_status", "FEASIBLE"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
