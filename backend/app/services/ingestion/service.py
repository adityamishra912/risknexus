# app/services/ingestion/service.py

import os
import shutil
import uuid
import zipfile
import logging
from typing import Dict, Any, List, Optional
from fastapi import UploadFile

logger = logging.getLogger(__name__)

DATA_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
UPLOADS_DIR = os.path.join(DATA_BASE_DIR, "uploads")

REQUIRED_CSV_FILES = [
    "assets.csv",
    "vulnerabilities.csv",
    "asset_relationships.csv",
    "controls.csv",
    "threat_scenarios.csv",
]


def save_customer_dataset(files: List[UploadFile]) -> Dict[str, Any]:
    """
    Saves uploaded customer CSV files into a new dataset folder under backend/data/uploads/{dataset_id}/.
    Validates presence of required schema files and returns dataset summary metadata.
    """
    dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
    target_dir = os.path.join(UPLOADS_DIR, dataset_id)
    os.makedirs(target_dir, exist_ok=True)

    saved_files = []
    for file in files:
        filename = os.path.basename(file.filename)
        dest_path = os.path.join(target_dir, filename)

        if filename.endswith(".zip"):
            # Handle zip upload
            temp_zip = os.path.join(target_dir, "temp.zip")
            with open(temp_zip, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            with zipfile.ZipFile(temp_zip, "r") as zip_ref:
                zip_ref.extractall(target_dir)
            os.remove(temp_zip)
            saved_files.append(filename)
        elif filename.endswith(".csv"):
            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(filename)

    # Check extracted/saved files
    existing_files = os.listdir(target_dir)
    missing_required = [f for f in REQUIRED_CSV_FILES if f not in existing_files]

    status = "ready" if not missing_required else "partially_valid"

    return {
        "status": "success",
        "dataset_id": dataset_id,
        "dataset_path": target_dir,
        "saved_files": saved_files,
        "all_files": existing_files,
        "missing_required": missing_required,
        "ingestion_status": status,
    }


def list_datasets() -> List[Dict[str, Any]]:
    """Lists all ingested datasets available on the backend."""
    datasets = [
        {
            "dataset_id": "default",
            "name": "Default Ground Truth Dataset",
            "path": DATA_BASE_DIR,
            "is_default": True,
        }
    ]

    if os.path.exists(UPLOADS_DIR):
        for sub in os.listdir(UPLOADS_DIR):
            full_p = os.path.join(UPLOADS_DIR, sub)
            if os.path.isdir(full_p):
                datasets.append({
                    "dataset_id": sub,
                    "name": f"Customer Dataset ({sub})",
                    "path": full_p,
                    "is_default": False,
                })
    return datasets
