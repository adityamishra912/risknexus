# app/api/what_if.py

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.schemas.what_if import (
    WhatIfSingleRequest,
    WhatIfPortfolioRequest,
    WhatIfScenarioResult,
    WhatIfPortfolioResult,
)
from app.services.what_if.engine import simulate_scenario
from app.services.what_if.portfolio_simulator import simulate_portfolio
from app.services.what_if.control_simulator import simulate_control_toggles
from app.services.risk_engine.exceptions import MissingLinkedRecordError
from app.services.risk_engine.scenario_generator import generate_risk_scenarios

router = APIRouter(prefix="/what-if", tags=["what_if"])


class ControlSimulationRequest(BaseModel):
    simulated_controls: Dict[str, bool] = Field(
        default_factory=lambda: {"mfa": True, "patching": True, "edr": False, "segmentation": False, "backup": True}
    )
    mfa_coverage: float = Field(default=62.0, ge=0.0, le=100.0)
    patch_delay_days: int = Field(default=14, ge=0)
    data_dir: Optional[str] = None


@router.get("/")
def what_if_info():
    return {"status": "ok", "endpoints": ["POST /what-if/scenario", "POST /what-if/portfolio", "POST /what-if/simulate-controls"]}


@router.post("/scenario", response_model=WhatIfScenarioResult)
def what_if_scenario(req: WhatIfSingleRequest):
    scenario_data = req.scenario_data
    if scenario_data is None:
        if req.scenario_id:
            gen = generate_risk_scenarios(data_dir=req.data_dir)
            target = next((s for s in gen.get("scenarios", []) if s.get("scenario_id") == req.scenario_id), None)
            if not target:
                raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found.")
            scenario_data = target
        else:
            raise HTTPException(status_code=422, detail="scenario_data or scenario_id required")
            
    try:
        return simulate_scenario(scenario_data, req.changes, req.data_dir)
    except MissingLinkedRecordError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio", response_model=WhatIfPortfolioResult)
def what_if_portfolio(req: WhatIfPortfolioRequest):
    try:
        return simulate_portfolio(
            changes=req.changes,
            scope_asset_ids=req.scope_asset_ids or None,
            data_dir=req.data_dir,
            iterations=req.iterations,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate-controls")
def what_if_simulate_controls(req: ControlSimulationRequest):
    """
    Simulates enterprise risk reduction when control toggles, MFA coverage,
    or patching delay slider values are modified by the user on the frontend.
    """
    try:
        return simulate_control_toggles(
            simulated_controls=req.simulated_controls,
            mfa_coverage=req.mfa_coverage,
            patch_delay_days=req.patch_delay_days,
            data_dir=req.data_dir,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
