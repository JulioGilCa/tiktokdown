"""Pruebas para los endpoints de la API REST."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.db_init import init_db
from app.main import app


@pytest.mark.asyncio
async def test_categories_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/categories")
        assert res.status_code == 200
        cats = res.json()
        assert len(cats) >= 16
        names = [c["name"] for c in cats]
        assert "Tecnología" in names
        assert "Programación" in names
        assert "Otros" in names


@pytest.mark.asyncio
async def test_dashboard_stats_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/dashboard/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_videos" in data
        assert "categories_count" in data
        assert data["categories_count"] >= 16


@pytest.mark.asyncio
async def test_videos_empty_list():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/videos")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 0
        assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_settings_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Actualizar un ajuste
        put_res = await ac.put("/api/settings/test_key", json={"value": "hello_world"})
        assert put_res.status_code == 200
        assert put_res.json()["value"] == "hello_world"

        # Leer ajustes
        get_res = await ac.get("/api/settings")
        assert get_res.status_code == 200
        assert get_res.json().get("test_key") == "hello_world"

