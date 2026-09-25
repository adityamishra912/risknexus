import sys
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import glpi
from app.main import app

client = TestClient(app)


class FakeCursor:
    def __init__(self, rows=None, error=None):
        self.rows = rows or []
        self.error = error
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, args=None):
        self.executed.append((query, args))
        if self.error:
            raise self.error

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0]


class FakeConnection:
    def __init__(self, rows=None):
        self.cursor_instance = FakeCursor(rows)
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def test_tables_maps_information_schema_alias(monkeypatch):
    connection = FakeConnection([{"table_name": "glpi_computers"}, {"table_name": "glpi_configs"}])
    monkeypatch.setattr(glpi, "_connection", lambda: connection)

    response = client.get("/api/v1/glpi/tables")

    assert response.status_code == 200
    assert response.json() == {
        "database": glpi.settings.MYSQL_DATABASE,
        "tables": ["glpi_computers", "glpi_configs"],
        "count": 2,
    }
    query, args = connection.cursor_instance.executed[0]
    assert "TABLE_NAME AS table_name" in query
    assert "TABLE_TYPE = 'BASE TABLE'" in query
    assert args == (glpi.settings.MYSQL_DATABASE,)


def test_read_table_returns_paginated_data(monkeypatch):
    connection = FakeConnection([{"id": 1, "name": "server-1"}])
    monkeypatch.setattr(glpi, "_connection", lambda: connection)
    monkeypatch.setattr(glpi, "_tables", lambda ignored: ["glpi_computers"])

    response = client.get("/api/v1/glpi/tables/glpi_computers?page=2&limit=25")

    assert response.status_code == 200
    assert response.json() == {
        "table": "glpi_computers",
        "page": 2,
        "limit": 25,
        "total": 1,
        "columns": ["id", "name"],
        "rows": [{"id": 1, "name": "server-1"}],
    }


def test_invalid_table_name_is_rejected(monkeypatch):
    monkeypatch.setattr(glpi, "_connection", lambda: AssertionError("must not connect"))

    response = client.get("/api/v1/glpi/tables/glpi_computers;DROP TABLE users")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid table name"


def test_missing_table_returns_404(monkeypatch):
    connection = FakeConnection()
    monkeypatch.setattr(glpi, "_connection", lambda: connection)
    monkeypatch.setattr(glpi, "_tables", lambda ignored: ["glpi_configs"])

    response = client.get("/api/v1/glpi/tables/glpi_missing")

    assert response.status_code == 404
    assert "was not found" in response.json()["detail"]


def test_database_connection_failure_is_safe(monkeypatch):
    monkeypatch.setattr(glpi, "_connection", lambda: (_ for _ in ()).throw(RuntimeError("secret database detail")))

    response = client.get("/api/v1/glpi/tables")

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to inspect GLPI tables"
    assert "secret database detail" not in response.text


def test_connection_prefers_container_mysql_host(monkeypatch):
    calls = {}

    class FakePyMySQL:
        class cursors:
            DictCursor = object()

        @staticmethod
        def connect(**kwargs):
            calls.update(kwargs)
            return object()

    monkeypatch.setitem(sys.modules, "pymysql", FakePyMySQL)
    monkeypatch.setattr(glpi.settings, "MYSQL_USER", "glpi_user")
    monkeypatch.setattr(glpi.settings, "MYSQL_PASSWORD", "password")
    monkeypatch.setattr(glpi.settings, "MYSQL_HOST", "127.0.0.1")
    monkeypatch.setattr(glpi.settings, "MYSQL_HOST_CONTAINER", "host.docker.internal")

    glpi._connection()

    assert calls["host"] == "host.docker.internal"
