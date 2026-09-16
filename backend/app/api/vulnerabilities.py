# app/api/vulnerabilities.py

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException

from app.services.vulnerabilities.service import get_vulnerabilities_list

router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])


@router.get("")
@router.get("/")
def get_vulnerabilities_endpoint(
    limit: Optional[int] = Query(None, description="Limit number of vulnerabilities returned"),
    data_dir: Optional[str] = Query(None, description="Custom data directory path"),
):
    """
    Returns list of enterprise vulnerabilities with calculated priority scores,
    CVSS ratings, exploitation flags, and estimated financial exposure.
    """
    try:
        vulns = get_vulnerabilities_list(data_dir=data_dir)
        if limit and limit > 0:
            vulns = vulns[:limit]
        return {
            "status": "success",
            "count": len(vulns),
            "vulnerabilities": vulns,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cve_id}")
def get_vulnerability_detail(cve_id: str, data_dir: Optional[str] = Query(None)):
    """Returns detailed profile for a specific CVE."""
    try:
        vulns = get_vulnerabilities_list(data_dir=data_dir)
        target = next((v for v in vulns if v["cve_id"].lower() == cve_id.lower() or v["vulnerability_id"].lower() == cve_id.lower()), None)
        if not target:
            raise HTTPException(status_code=404, detail=f"Vulnerability '{cve_id}' not found")
        return {"status": "success", "vulnerability": target}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
