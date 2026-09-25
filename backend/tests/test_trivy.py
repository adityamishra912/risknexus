import sys
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import trivy
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
        return {"total": len(self.rows)}


class FakeConnection:
    def __init__(self, rows=None):
        self.cursor_instance = FakeCursor(rows)
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def test_trivy_endpoint_returns_records(monkeypatch):
    rows = [{
        "id": 1,
        "target": "ubuntu:22.04",
        "vulnerability_id": "CVE-2024-0001",
        "package_name": "openssl",
        "installed_version": "3.0.0",
        "severity": "HIGH",
        "title": "openssl issue",
    }]
    connection = FakeConnection(rows)
    monkeypatch.setattr(trivy, "_connection", lambda: connection)

    response = client.get("/api/v1/trivy?page=1&limit=25")

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["records"][0]["vulnerability_id"] == "CVE-2024-0001"


def test_trivy_endpoint_rejects_invalid_page(monkeypatch):
    monkeypatch.setattr(trivy, "_connection", lambda: (_ for _ in ()).throw(RuntimeError("must not hit DB")))

    response = client.get("/api/v1/trivy?page=0")

    assert response.status_code == 422
