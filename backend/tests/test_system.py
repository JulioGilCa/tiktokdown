from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_system_status_does_not_leak_secrets() -> None:
    response = client.get("/api/system/status")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "environment",
        "tiktok_credentials_configured",
        "token_encryption_configured",
    }

