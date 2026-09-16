# app/api/assets.py

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException

from app.services.assets.service import (
    get_all_assets_with_risk,
    get_top_risk_assets,
    get_asset_detail_profile,
)

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("")
@router.get("/")
def get_assets_list(
    limit: Optional[int] = Query(None, description="Limit number of assets returned"),
    data_dir: Optional[str] = Query(None, description="Custom data directory path"),
):
    """Returns list of enterprise assets with aggregated financial risk metrics."""
    try:
        assets = get_all_assets_with_risk(data_dir=data_dir)
        if limit and limit > 0:
            assets = assets[:limit]
        return {
            "status": "success",
            "total_assets": len(assets),
            "assets": assets,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-risk")
def get_top_risk_assets_endpoint(
    limit: int = Query(10, ge=1, le=50, description="Top N highest-risk assets"),
    data_dir: Optional[str] = Query(None),
):
    """
    Returns Top N highest-risk assets formatted for the 'Risk by Asset' visual component.
    """
    try:
        top_assets = get_top_risk_assets(limit=limit, data_dir=data_dir)
        max_eal = max((a["total_eal"] for a in top_assets), default=1.0)
        
        # Calculate percentage bar width for UI visualization
        for a in top_assets:
            a["bar_percent"] = round((a["total_eal"] / max(1.0, max_eal)) * 100, 1)

        return {
            "status": "success",
            "count": len(top_assets),
            "top_assets": top_assets,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{asset_id}")
def get_asset_detail(asset_id: str, data_dir: Optional[str] = Query(None)):
    """
    Returns comprehensive profile for asset: metadata, business service, financial exposure,
    vulnerabilities, controls, attack paths, risk scenarios, and top risk drivers.
    """
    try:
        profile = get_asset_detail_profile(asset_id=asset_id, data_dir=data_dir)
        return profile
    except FileNotFoundError as fnfe:
        raise HTTPException(status_code=404, detail=str(fnfe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
