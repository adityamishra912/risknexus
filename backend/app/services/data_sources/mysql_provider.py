import io
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

from app.core.config import settings

DATASET_TABLES: Dict[str, str] = {
    "business_units": "business_units",
    "business_services": "business_services",
    "assets": "assets",
    "asset_relationships": "asset_relationships",
    "vulnerabilities": "vulnerabilities",
    "controls": "controls",
    "control_status": "control_status",
    "control_effectiveness": "control_effectiveness",
    "threat_scenarios": "threat_scenarios",
    "vulnerability_threat_rules": "vulnerability_threat_rules",
}

REQUIRED_COLUMNS: Dict[str, tuple[str, ...]] = {
    "business_units": ("unit_id", "unit_name", "annual_revenue", "criticality"),
    "business_services": ("service_id", "unit_id", "service_name", "criticality", "revenue_dependency", "downtime_cost_per_hour", "data_sensitivity"),
    "assets": ("asset_id", "asset_name", "asset_type", "service_id", "criticality", "internet_exposed", "environment", "owner"),
    "asset_relationships": ("source_asset", "destination_asset", "relationship", "access_type"),
    "vulnerabilities": ("vulnerability_id", "asset_id", "cve_id", "cvss_score", "severity", "exploitability", "known_exploited", "first_seen", "days_open", "patch_available"),
    "controls": ("control_id", "control_name", "category", "cost", "implementation_days", "maintenance_cost"),
    "control_status": ("control_id", "asset_id", "status", "coverage", "maturity", "last_assessed"),
    "control_effectiveness": ("control_id", "threat_id", "effectiveness_base", "evidence_type"),
    "threat_scenarios": ("threat_id", "threat_name", "category", "activity_level", "attack_vector", "intelligence_source", "annual_frequency_low", "annual_frequency_base", "annual_frequency_high", "frequency_unit"),
    "vulnerability_threat_rules": ("rule_id", "threat_id", "source_dataset", "field_name", "operator", "match_value", "relevance_score", "rationale"),
}

MATERIALIZED_TABLES = tuple(DATASET_TABLES.values())
SUPPORTING_TABLES = ("threat_asset_impacts", "relationship_weights", "asset_type_mapping")


def _mysql_engine() -> Engine:
    if not settings.MYSQL_USER or not settings.MYSQL_PASSWORD:
        raise ValueError("MySQL credentials are not configured")
    host = settings.MYSQL_HOST_CONTAINER or settings.MYSQL_HOST
    url = (
        f"mysql+pymysql://{quote_plus(settings.MYSQL_USER)}:{quote_plus(settings.MYSQL_PASSWORD)}"
        f"@{host}:{settings.MYSQL_PORT}/{quote_plus(settings.MYSQL_DATABASE)}"
    )
    return create_engine(url, pool_pre_ping=True, pool_recycle=1800)


def _existing_columns(inspector, table: str) -> list[str]:
    return [column["name"] for column in inspector.get_columns(table)]


def import_dataset(dataset_type: str, content: bytes, filename: str) -> Dict[str, Any]:
    if dataset_type not in DATASET_TABLES:
        raise ValueError(f"Unsupported dataset type: {dataset_type}")
    if not filename.lower().endswith(".csv"):
        raise ValueError("Only CSV uploads are supported currently")
    if not content:
        raise ValueError("Uploaded file is empty")

    try:
        frame = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
    except Exception as exc:
        raise ValueError(f"Unable to parse CSV: {exc}") from exc
    frame.columns = [str(column).strip() for column in frame.columns]
    missing = [column for column in REQUIRED_COLUMNS[dataset_type] if column not in frame.columns]
    if missing:
        raise ValueError(f"Missing required column(s): {', '.join(missing)}")

    table = DATASET_TABLES[dataset_type]
    engine = _mysql_engine()
    try:
        inspector = inspect(engine)
        exists = inspector.has_table(table)
        with engine.begin() as connection:
            if exists:
                columns = _existing_columns(inspector, table)
                unknown = [column for column in frame.columns if column not in columns]
                if unknown:
                    raise ValueError(f"Unexpected column(s) for existing {table} table: {', '.join(unknown)}")
                connection.execute(text(f"DELETE FROM `{table}`"))
                frame.to_sql(table, con=connection, if_exists="append", index=False)
            else:
                frame.to_sql(table, con=connection, if_exists="fail", index=False)
        return {
            "status": "success",
            "dataset_type": dataset_type,
            "table_name": table,
            "filename": filename,
            "rows_received": int(len(frame)),
            "rows_inserted": int(len(frame)),
            "rows_updated": 0,
            "rows_failed": 0,
            "validation_errors": [],
        }
    finally:
        engine.dispose()


def get_mysql_dataset_status() -> Dict[str, Any]:
    engine = _mysql_engine()
    try:
        inspector = inspect(engine)
        tables = []
        with engine.connect() as connection:
            for dataset_type, table in DATASET_TABLES.items():
                exists = inspector.has_table(table)
                count = 0
                if exists:
                    count = int(connection.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar() or 0)
                tables.append({"dataset_type": dataset_type, "table_name": table, "status": "uploaded" if exists else "not_uploaded", "rows": count})
        return {"mode": "mysql", "datasets": tables, "uploaded_count": sum(item["status"] == "uploaded" for item in tables), "required_count": len(DATASET_TABLES)}
    finally:
        engine.dispose()


def materialize_mysql_data_dir() -> str:
    engine = _mysql_engine()
    target = Path(settings.DATA_SOURCE_CACHE_DIR).resolve() / "mysql"
    temporary = target.with_name("mysql.tmp")
    if temporary.exists():
        for child in temporary.iterdir():
            if child.is_dir():
                import shutil
                shutil.rmtree(child)
            else:
                child.unlink()
    temporary.mkdir(parents=True, exist_ok=True)
    try:
        inspector = inspect(engine)
        with engine.connect() as connection:
            for table in MATERIALIZED_TABLES:
                if not inspector.has_table(table):
                    raise ValueError(f"Required MySQL table is missing: {table}")
                frame = pd.read_sql(text(f"SELECT * FROM `{table}`"), connection)
                frame.to_csv(temporary / f"{table}.csv", index=False)
        default_dir = Path(__file__).resolve().parents[3] / "data"
        for table in SUPPORTING_TABLES:
            source = default_dir / f"{table}.csv"
            if source.exists():
                (temporary / source.name).write_bytes(source.read_bytes())
        if target.exists():
            import shutil
            shutil.rmtree(target)
        temporary.rename(target)
        return str(target)
    finally:
        engine.dispose()
        if temporary.exists() and not target.exists():
            import shutil
            shutil.rmtree(temporary)
