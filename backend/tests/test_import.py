"""Pruebas de la importación de archivos ZIP y JSON de TikTok."""

import io
import json
import random
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient

from app.db_init import init_db
from app.main import app


def build_sample_tiktok_zip(unique_prefix: str) -> bytes:
    """Genera un archivo ZIP con la estructura representativa de la exportación de TikTok."""
    id1 = f"73111222{unique_prefix}1"
    id2 = f"73999888{unique_prefix}2"
    user_data = {
        "Activity": {
            "Like List": {
                "ItemFavoriteList": [
                    {
                        "date": "2024-05-10 18:30:00",
                        "link": f"https://www.tiktok.com/@techguru/video/{id1}",
                    }
                ]
            },
            "Favorite Videos": {
                "FavoriteVideoList": [
                    {
                        "Date": "2024-05-11 12:00:00",
                        "Link": f"https://www.tiktok.com/@coderpro/video/{id2}",
                    }
                ]
            },
        }
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("user_data.json", json.dumps(user_data))
    return buf.getvalue()


@pytest.mark.asyncio
async def test_import_zip_flow():
    unique_prefix = str(random.randint(100000, 999999))
    zip_bytes = build_sample_tiktok_zip(unique_prefix)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Primera importación: debe crear 2 vídeos nuevos
        res = await ac.post(
            "/api/tiktok/import",
            files={"file": ("tiktok_export.zip", zip_bytes, "application/zip")},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_found"] == 2
        assert data["imported_count"] == 2
        assert data["likes_count"] == 1
        assert data["favorites_count"] == 1

        # 2. Verificar que los vídeos ahora aparecen en /api/videos
        v_res = await ac.get("/api/videos")
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert v_data["total"] >= 2
        tiktok_ids = [item["tiktok_id"] for item in v_data["items"]]
        assert f"73111222{unique_prefix}1" in tiktok_ids
        assert f"73999888{unique_prefix}2" in tiktok_ids

        # 3. Segunda importación: deduplicación (debe actualizar, no duplicar)
        res_dup = await ac.post(
            "/api/tiktok/import",
            files={"file": ("tiktok_export.zip", zip_bytes, "application/zip")},
        )
        assert res_dup.status_code == 200
        dup_data = res_dup.json()
        assert dup_data["imported_count"] == 0
        assert dup_data["updated_count"] == 2


@pytest.mark.asyncio
async def test_import_invalid_format():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.post(
            "/api/tiktok/import",
            files={"file": ("invalido.txt", b"hola mundo", "text/plain")},
        )
        assert res.status_code == 400
