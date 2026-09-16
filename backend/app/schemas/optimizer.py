# app/schemas/optimizer.py

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class OptimizeInvestmentRequest(BaseModel):
    budget: float = Field(default=10000000.0, description="Security investment budget in INR")
    data_dir: Optional[str] = Field(default=None, description="Custom data directory path")
    candidate_control_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of control IDs to consider. Defaults to controls with coverage < 100%",
    )


class SelectedControlSchema(BaseModel):
    control_id: str
    control_type: str
    control_name: Optional[str] = None
    cost: float
    risk_reduction: float
    effectiveness_pct: float
    source_citation: str
    benefit_cost_ratio: Optional[float] = None


class CurvePointSchema(BaseModel):
    spend: float
    spend_label: str
    risk_reduction: float
    residual_eal: float
    zone: Optional[str] = None


class OptimizeInvestmentResponse(BaseModel):
    baseline_enterprise_mean_eal: float
    selected_controls: List[SelectedControlSchema]
    total_cost: float
    total_risk_reduction: float
    residual_enterprise_mean_eal: float
    unselected_controls_considered: List[SelectedControlSchema]
    investment_curve: List[CurvePointSchema] = Field(default_factory=list)
    solver_status: str
