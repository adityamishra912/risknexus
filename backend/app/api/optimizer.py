# app/api/optimizer.py

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status

from app.schemas.optimizer import (
    OptimizeInvestmentRequest,
    OptimizeInvestmentResponse,
)
from app.services.optimizer.service import OptimizerService, optimize_investment_portfolio
from app.services.risk_engine.exceptions import MissingOptimizerInputError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["optimizer"])


@router.post("/optimize", response_model=OptimizeInvestmentResponse)
@router.post("/api/v1/optimize", response_model=OptimizeInvestmentResponse)
def run_investment_optimizer(req: OptimizeInvestmentRequest):
    """
    POST /api/v1/optimize

    Determines the combination of candidate security controls that maximizes total
    enterprise risk reduction without exceeding the specified budget using OR-Tools CP-SAT
    knapsack optimization.
    """
    try:
        service = OptimizerService(data_dir=req.data_dir)
        result = service.execute(
            budget=req.budget,
            candidate_control_ids=req.candidate_control_ids,
        )
        return result
    except MissingOptimizerInputError as e:
        logger.warning("Investment optimization bad input: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except FileNotFoundError as e:
        logger.error("Data files not found for optimizer: %s", e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data directory or required files not found: {str(e)}",
        )
    except Exception as e:
        logger.exception("Unexpected error during investment optimization")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}",
        )
