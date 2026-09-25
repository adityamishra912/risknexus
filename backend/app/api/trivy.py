import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings

router = APIRouter(prefix="/trivy", tags=["trivy"])
logger = logging.getLogger(__name__)


def _connection():
    if not settings.MYSQL_USER or not settings.MYSQL_PASSWORD:
        raise HTTPException(status_code=503, detail="Trivy MySQL is not configured; run cybernexus configure")
    mysql_host = settings.MYSQL_HOST_CONTAINER or settings.MYSQL_HOST
    try:
        import pymysql
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
        logger.exception("Trivy MySQL connection failed for %s:%s/%s", mysql_host, settings.MYSQL_PORT, settings.MYSQL_DATABASE)
        raise HTTPException(status_code=503, detail="Unable to connect to the configured MySQL database") from exc


@router.get("")
@router.get("/")
def list_trivy_vulnerabilities(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    connection = None
    try:
        connection = _connection()
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = %s AND table_name = 'trivy_vulnerabilities'",
                (settings.MYSQL_DATABASE,),
            )
            if cursor.fetchone()["total"] == 0:
                return {"page": page, "limit": limit, "total": 0, "count": 0, "records": []}

            offset = (page - 1) * limit
            cursor.execute(
                "SELECT * FROM trivy_vulnerabilities ORDER BY collected_at DESC, id DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            rows = cursor.fetchall()
            cursor.execute("SELECT COUNT(*) AS total FROM trivy_vulnerabilities")
            total = cursor.fetchone()["total"]
        return {
            "page": page,
            "limit": limit,
            "total": total,
            "count": len(rows),
            "records": rows,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to read Trivy vulnerabilities")
        raise HTTPException(status_code=500, detail="Failed to read Trivy vulnerabilities") from exc
    finally:
        if connection is not None:
            connection.close()
