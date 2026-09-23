import logging
import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings

router = APIRouter(prefix="/glpi", tags=["glpi"])
logger = logging.getLogger(__name__)
_IDENTIFIER = re.compile(r"^[A-Za-z0-9_]+$")


def _connection():
    if not settings.MYSQL_USER or not settings.MYSQL_PASSWORD:
        raise HTTPException(status_code=503, detail="GLPI MySQL is not configured; run cybernexus configure")
    try:
        import pymysql
        mysql_host = settings.MYSQL_HOST_CONTAINER or settings.MYSQL_HOST
        return pymysql.connect(
            host=mysql_host,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            database=settings.MYSQL_DATABASE,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10,
        )
    except Exception as exc:
        logger.exception("GLPI MySQL connection failed for %s:%s/%s", mysql_host, settings.MYSQL_PORT, settings.MYSQL_DATABASE)
        raise HTTPException(status_code=503, detail="Unable to connect to the configured GLPI database") from exc


def _tables(connection) -> list[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = %s ORDER BY table_name",
            (settings.MYSQL_DATABASE,),
        )
        return [row["table_name"] for row in cursor.fetchall()]


@router.get("/tables")
def list_tables() -> dict[str, Any]:
    started = time.perf_counter()
    connection = _connection()
    try:
        tables = _tables(connection)
        return {"database": settings.MYSQL_DATABASE, "tables": tables, "count": len(tables)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list GLPI tables")
        raise HTTPException(status_code=500, detail="Failed to inspect GLPI tables") from exc
    finally:
        connection.close()
        logger.info("GET /glpi/tables completed in %.0fms", (time.perf_counter() - started) * 1000)


@router.get("/tables/{table_name}")
def read_table(
    table_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    if not _IDENTIFIER.fullmatch(table_name):
        raise HTTPException(status_code=400, detail="Invalid table name")
    started = time.perf_counter()
    connection = _connection()
    try:
        if table_name not in _tables(connection):
            raise HTTPException(status_code=404, detail=f"GLPI table {table_name!r} was not found")
        offset = (page - 1) * limit
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM `{table_name}`")
            total = cursor.fetchone()["total"]
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT %s OFFSET %s", (limit, offset))
            rows = cursor.fetchall()
        columns = list(rows[0].keys()) if rows else []
        return {"table": table_name, "page": page, "limit": limit, "total": total, "columns": columns, "rows": rows}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to read GLPI table %s page=%s limit=%s", table_name, page, limit)
        raise HTTPException(status_code=500, detail="Failed to read the GLPI table") from exc
    finally:
        connection.close()
        logger.info("GET /glpi/tables/%s completed in %.0fms", table_name, (time.perf_counter() - started) * 1000)


@router.get("/computers")
def computers(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500)):
    return read_table("glpi_computers", page, limit)


@router.get("/softwares")
def softwares(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500)):
    return read_table("glpi_softwares", page, limit)


@router.get("/software-versions")
def software_versions(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500)):
    return read_table("glpi_softwareversions", page, limit)
