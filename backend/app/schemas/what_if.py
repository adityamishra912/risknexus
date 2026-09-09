from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.risk import RiskQuantificationSchema, RiskSummarySchema

class ControlOverride(BaseModel):
    control_id: str
    status: Optional[str] = None
    coverage: Optional[float] = None
    maturity: Optional[float] = None

class WhatIfChangeset(BaseModel):
    # asset overrides
    asset_criticality: Optional[int] = Field(None, ge=1, le=10)
    internet_exposed: Optional[bool] = None

    # vulnerability overrides
    cvss_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    known_exploited: Optional[bool] = None
    days_open: Optional[int] = Field(None, ge=0)

    # control overrides
    control_overrides: Optional[List[ControlOverride]] = None
    add_controls: Optional[List[ControlOverride]] = None
    remove_control_ids: Optional[List[str]] = None

    # service overrides
    downtime_cost_per_hour: Optional[float] = Field(None, ge=0.0)

    # threat overrides
    threat_activity: Optional[str] = None

class WhatIfSingleRequest(BaseModel):
    scenario_id: Optional[str] = None
    scenario_data: Optional[Dict[str, Any]] = None
    changes: WhatIfChangeset
    data_dir: Optional[str] = None
    iterations: int = Field(10000, ge=1000, le=100000)

class WhatIfPortfolioRequest(BaseModel):
    changes: WhatIfChangeset
    scope_asset_ids: Optional[List[str]] = None
    data_dir: Optional[str] = None
    iterations: int = Field(10000, ge=1000, le=100000)

class ScenarioDelta(BaseModel):
    baseline: float
    simulated: float
    delta: float
    delta_pct: float

class WhatIfScenarioResult(BaseModel):
    scenario_id: str
    scenario_name: str
    baseline: RiskQuantificationSchema
    simulated: RiskQuantificationSchema
    delta: Dict[str, ScenarioDelta]
    applied_changes: Dict[str, Any]

class WhatIfPortfolioResult(BaseModel):
    baseline_summary: RiskSummarySchema
    simulated_summary: RiskSummarySchema
    portfolio_delta: Dict[str, ScenarioDelta]
    scenario_results: List[WhatIfScenarioResult]
    total_scenarios_simulated: int
