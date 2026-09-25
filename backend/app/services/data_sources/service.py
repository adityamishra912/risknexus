import json
import logging
import os
import shutil
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy import create_engine, inspect, text

from app.core.config import settings
from app.services.attack_graph.graph_builder import resolve_data_dir

logger = logging.getLogger(__name__)

DATA_SOURCE_MODES = {
    "sample": "sample",
    "mysql": "mysql",
    "supabase-primary": "supabase-primary",
    "supabase-secondary": "supabase-secondary",
}
REQUIRED_TABLES = (
    "assets",
    "vulnerabilities",
    "asset_relationships",
    "business_services",
    "control_status",
    "risk_scenarios",
    "threat_scenarios",
)
_activation_lock = Lock()
_active_mode = "sample"
_materialized_paths: Dict[str, Path] = {}


def get_active_mode() -> str:
    return _active_mode


def get_mode_status(mode: str) -> Dict[str, Any]:
    if mode not in DATA_SOURCE_MODES:
        raise ValueError(f"Unsupported data source mode: {mode}")

    if mode == "sample":
        return {"mode": mode, "status": "ready", "data_dir": resolve_data_dir()}

    path = _materialized_paths.get(mode)
    return {
        "mode": mode,
        "status": "ready" if path and path.exists() else "not_configured",
        "data_dir": str(path) if path and path.exists() else None,
    }


def activate_mode(mode: str) -> Dict[str, Any]:
    global _active_mode

    if mode not in DATA_SOURCE_MODES:
        raise ValueError(f"Unsupported data source mode: {mode}")
    with _activation_lock:
        if mode == "mysql":
            from app.services.data_sources.mysql_provider import materialize_mysql_data_dir
            _materialized_paths[mode] = Path(materialize_mysql_data_dir())
        elif mode != "sample":
            _materialize_supabase_mode(mode)
        _active_mode = mode
    return get_mode_status(mode)


def _get_database_url(mode: str) -> Optional[str]:
    if mode == "supabase-primary":
        return settings.SUPABASE_PRIMARY_DATABASE_URL
    return settings.SUPABASE_SECONDARY_DATABASE_URL


def _materialize_supabase_mode(mode: str) -> None:
    database_url = _get_database_url(mode)
    if not database_url:
        raise ValueError(f"Database URL is not configured for {mode}")

    engine = create_engine(database_url, pool_pre_ping=True)
    inspector = inspect(engine)
    available_tables = set(inspector.get_table_names(schema="public"))
    missing_tables = [table for table in REQUIRED_TABLES if table not in available_tables]
    if missing_tables:
        raise ValueError(
            f"Supabase source is missing canonical tables: {', '.join(missing_tables)}"
        )

    target = _get_materialized_path(mode)
    temporary_target = target.with_name(f"{target.name}.tmp")
    if temporary_target.exists():
        shutil.rmtree(temporary_target)
    temporary_target.mkdir(parents=True, exist_ok=True)

    try:
        with engine.connect() as connection:
            for table in REQUIRED_TABLES:
                frame = pd.read_sql(text(f'SELECT * FROM "{table}"'), connection)
                frame.to_csv(temporary_target / f"{table}.csv", index=False)
        metadata = {"mode": mode, "tables": list(REQUIRED_TABLES)}
        (temporary_target / "source.json").write_text(json.dumps(metadata), encoding="utf-8")
        if target.exists():
            shutil.rmtree(target)
        temporary_target.rename(target)
        _materialized_paths[mode] = target
    except Exception:
        if temporary_target.exists():
            shutil.rmtree(temporary_target)
        raise
    finally:
        engine.dispose()


def _get_materialized_path(mode: str) -> Path:
    base_path = Path(settings.DATA_SOURCE_CACHE_DIR).resolve()
    return base_path / mode


def get_active_data_dir() -> Optional[str]:
    if _active_mode == "sample":
        return None
    path = _materialized_paths.get(_active_mode)
    if not path or not path.exists():
        raise ValueError(f"Active data source has not been loaded: {_active_mode}")
    return str(path)