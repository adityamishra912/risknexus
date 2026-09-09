from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional

from app.schemas.what_if import (
    WhatIfSingleRequest,
    WhatIfPortfolioRequest,
    WhatIfScenarioResult,
    WhatIfPortfolioResult,
)
from app.services.what_if.engine import simulate_scenario
from app.services.what_if.portfolio_simulator import simulate_portfolio
from app.services.risk_engine.exceptions import MissingLinkedRecordError
from app.services.risk_engine.scenario_generator import generate_risk_scenarios

router = APIRouter(prefix="/what-if", tags=["what_if"])

@router.get("/")
def what_if_info():
    return {"status": "ok", "endpoints": ["POST /what-if/scenario", "POST /what-if/portfolio"]}

@router.post("/scenario", response_model=WhatIfScenarioResult)
def what_if_scenario(req: WhatIfSingleRequest):
    scenario_data = req.scenario_data
    if scenario_data is None:
        if req.scenario_id:
            # Load from generator if inline data isn't provided
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
