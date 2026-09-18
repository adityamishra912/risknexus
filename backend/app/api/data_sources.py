from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.data_sources.service import activate_mode, get_active_mode, get_mode_status

router = APIRouter(prefix="/data-sources", tags=["data_sources"])


class DataSourceRunRequest(BaseModel):
    mode: str


@router.get("/status")
def data_source_status() -> Dict[str, Any]:
    return {
        "active_mode": get_active_mode(),
        "modes": [get_mode_status(mode) for mode in ("sample", "supabase-primary", "supabase-secondary")],
    }


@router.post("/run")
def run_data_source(request: DataSourceRunRequest) -> Dict[str, Any]:
    try:
        return activate_mode(request.mode)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Unable to load data source: {error}") from error