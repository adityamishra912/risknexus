# app/api/ingestion.py

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.ingestion.service import save_customer_dataset, list_datasets

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.get("")
@router.get("/")
def get_ingestion_data():
    """Lists available ingested datasets on the backend."""
    try:
        datasets = list_datasets()
        return {"status": "success", "count": len(datasets), "datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
def upload_customer_dataset(files: List[UploadFile] = File(...)):
    """
    Accepts customer uploaded CSV files or ZIP archives, validates schemas,
    stores them under backend/data/uploads/{dataset_id}/, and makes them available for quantification.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    try:
        res = save_customer_dataset(files)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
