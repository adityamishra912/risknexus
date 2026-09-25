from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.data_sources.service import activate_mode, get_active_mode, get_mode_status
from app.services.data_sources.mysql_provider import get_mysql_dataset_status, import_dataset
from app.services.risk_engine.engine import clear_scenario_cache, quantify_all_scenarios
from app.services.attack_graph.graph_builder import build_attack_graph
from app.services.optimizer.service import get_candidate_controls

router = APIRouter(prefix="/data-sources", tags=["data_sources"])


@router.get("/status")
def data_source_status() -> Dict[str, Any]:
    try:
        mysql = get_mysql_dataset_status()
    except Exception as error:
        mysql = {"mode": "mysql", "datasets": [], "uploaded_count": 0, "required_count": 10, "error": str(error)}
    return {"active_mode": get_active_mode(), "modes": [get_mode_status(mode) for mode in ("sample", "mysql", "supabase-primary", "supabase-secondary")], "mysql": mysql}


@router.post("/upload")
async def upload_dataset(dataset_type: str = Form(...), file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        content = await file.read()
        return import_dataset(dataset_type, content, file.filename or "upload.csv")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Unable to import dataset: {error}") from error


@router.post("/run")
def run_mysql_data_source() -> Dict[str, Any]:
    try:
        activated = activate_mode("mysql")
        data_dir = activated["data_dir"]
        clear_scenario_cache()
        quantification = quantify_all_scenarios(data_dir=data_dir, force_refresh=True)
        graph = build_attack_graph(data_dir=data_dir)
        initiatives = get_candidate_controls(data_dir=data_dir)
        return {
            "status": "success",
            "mode": "mysql",
            "data_dir": data_dir,
            "run_id": f"mysql-run-{__import__('uuid').uuid4().hex[:8]}",
            "scenario_count": len(quantification.get("scenarios", [])),
            "loss_event_count": len(quantification.get("loss_events", [])),
            "graph_nodes": graph.number_of_nodes(),
            "graph_edges": graph.number_of_edges(),
            "initiative_count": len(initiatives),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Unable to run MySQL-backed calculations: {error}") from error


