"""Pruebas del almacenamiento y streaming HTTP Range."""

from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from app.database import SessionLocal
from app.main import app
from app.models.entities import Video


@pytest.mark.asyncio
async def test_storage_info_and_scan():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        info_res = await ac.get("/api/storage/info")
        assert info_res.status_code == 200
        data = info_res.json()
        assert "storage_root" in data
        assert "disk_total_bytes" in data
        assert "disk_free_bytes" in data
        assert "library_bytes" in data

        scan_res = await ac.post("/api/storage/scan")
        assert scan_res.status_code == 200
        assert "scanned_files" in scan_res.json()


@pytest.mark.asyncio
async def test_video_streaming_range(tmp_path: Path):
    # Crear un archivo de vídeo simulado en disco
    dummy_video_file = tmp_path / "sample_video.mp4"
    dummy_content = b"TEST_MP4_BINARY_DATA_FOR_RANGE_STREAMING_0123456789"
    dummy_video_file.write_bytes(dummy_content)

    async with SessionLocal() as db:
        video = Video(
            tiktok_id="7776665554443332221",
            original_url="https://www.tiktok.com/@creator/video/7776665554443332221",
            title="Vídeo para test de streaming",
            local_path=str(dummy_video_file.as_posix()),
            download_status="completed",
            file_size=len(dummy_content),
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)
        video_id = video.id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Petición con cabecera Range solicitando los primeros 10 bytes
        res = await ac.get(
            f"/api/videos/{video_id}/stream",
            headers={"Range": "bytes=0-9"},
        )
        assert res.status_code == 206
        assert res.headers["content-range"].startswith("bytes 0-9/")
        assert res.headers["content-type"] == "video/mp4"
        assert len(res.content) == 10
        assert res.content == dummy_content[:10]

