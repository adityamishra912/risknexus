# app/schemas/risk.py

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RiskScenarioEvidenceSchema(BaseModel):
    cvss_score: float
    exploitability: Optional[float] = 0.5
    known_exploited: bool
    vulnerability_age_days: int
    internet_exposed: bool
    asset_criticality: int
    attack_path_reachable: Optional[bool] = True
    attack_path_length: int
    path_strength: Optional[float] = 0.5
    control_coverage: Optional[float] = 0.5
    control_maturity: Optional[float] = 0.5
    threat_activity: Optional[float] = 0.5
    downtime_cost_per_hour: float
    data_sensitivity: str


class RiskQuantificationSchema(BaseModel):
    scenario_id: str
    scenario_name: str
    asset_id: str
    asset_name: str
    vulnerability_id: str
    threat_id: str
    business_service_id: str
    probability: float
    impact: float
    impact_triangular: Optional[Dict[str, Any]] = None
    eal: float
    mean_eal: float
    p90: float
    p95: float
    p99: float
    confidence: float
    evidence: Optional[Dict[str, Any]] = None
    status: Optional[str] = "quantified"
    error: Optional[str] = None


class RiskSummarySchema(BaseModel):
    total_scenarios: int
    total_technical_scenarios: Optional[int] = None
    total_loss_events: Optional[int] = None

    # technical_scenario_exposure = Σ(P × likely_impact) across canonical technical scenarios.
    # This is a point-estimate sum, NOT the Enterprise EAL.
    total_eal: float                            # kept for API compatibility — same value as below
    technical_scenario_exposure: Optional[float] = None  # correctly-labelled alias

    # Enterprise EAL = mean of consolidated Monte Carlo simulation across Business Loss Events.
    # Events are sampled independently (no correlation modeling).
    mean_eal: float

    p90_loss: Optional[float] = 0.0
    p95_loss: float
    p99_loss: float
    high_risk_scenarios_count: int


class RiskEngineResponseSchema(BaseModel):
    summary: RiskSummarySchema
    scenarios: List[RiskQuantificationSchema]
    loss_events: Optional[List[Dict[str, Any]]] = []
    failed: List[Dict[str, Any]] = []


class CustomRiskEvaluateRequestSchema(BaseModel):
    asset_criticality: int = Field(8, ge=1, le=10)
    cvss_score: float = Field(8.5, ge=0.0, le=10.0)
    known_exploited: bool = True
    internet_exposed: bool = True
    mfa_enabled: bool = False
    edr_enabled: bool = True
    downtime_cost_per_hour: float = Field(2500000.0, ge=0.0)
    attack_path_length: int = Field(2, ge=1, le=10)
