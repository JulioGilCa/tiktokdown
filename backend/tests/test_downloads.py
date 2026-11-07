"""Pruebas para el sistema y cola de descargas."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal
from app.main import app
from app.models.entities import Download, Video


@pytest.mark.asyncio
async def test_download_queue_lifecycle():
    # 1. Crear un vídeo de prueba en la base de datos
    async with SessionLocal() as db:
        video = Video(
            tiktok_id="9998887776665554443",
            original_url="https://www.tiktok.com/@creator/video/9998887776665554443",
            title="Vídeo de prueba para descargas",
            availability="downloadable",
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)
        video_id = video.id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 2. Solicitar descarga del vídeo
        req_res = await ac.post(f"/api/videos/{video_id}/download")
        assert req_res.status_code == 200
        assert req_res.json()["download_status"] == "pending"

        # 3. Listar descargas y verificar que está en la cola
        list_res = await ac.get("/api/downloads")
        assert list_res.status_code == 200
        downloads = list_res.json()
        target = next((d for d in downloads if d["video_id"] == video_id), None)
        assert target is not None
        download_id = target["id"]

        # 4. Cancelar la descarga
        cancel_res = await ac.post(f"/api/downloads/{download_id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # 5. Reintentar la descarga
        retry_res = await ac.post(f"/api/downloads/{download_id}/retry")
        assert retry_res.status_code == 200
        assert retry_res.json()["status"] == "pending"

        # 6. Probar encolar todas
        all_res = await ac.post("/api/downloads/start-all")
        assert all_res.status_code == 200
        assert "enqueued" in all_res.json()

