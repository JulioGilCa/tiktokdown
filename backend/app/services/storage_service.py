"""Servicio de gestión y diagnóstico del almacenamiento multimedia.

Soporta almacenamiento local y montajes de red (Synology NAS vía NFS/SMB).
"""

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.entities import Category, Video


def get_disk_usage(path: Path) -> Dict[str, int]:
    """Obtiene el espacio total, usado y libre del volumen que contiene la ruta."""
    try:
        usage = shutil.disk_usage(path)
        return {
            "total_bytes": usage.total,
            "used_bytes": usage.used,
            "free_bytes": usage.free,
        }
    except Exception:
        return {"total_bytes": 0, "used_bytes": 0, "free_bytes": 0}


async def get_storage_diagnostics(db: AsyncSession) -> Dict[str, Any]:
    """Calcula el uso real de espacio de la biblioteca y del disco."""
    settings = get_settings()
    root_path = Path(settings.storage_root).resolve()
    root_path.mkdir(parents=True, exist_ok=True)

    disk = get_disk_usage(root_path)

    # Medir bytes ocupados en la carpeta de vídeos
    videos_dir = root_path / "videos"
    videos_dir.mkdir(parents=True, exist_ok=True)

    library_bytes = 0
    file_count = 0
    categories_breakdown: List[Dict[str, Any]] = []

    # Recorrer subcarpetas de categorías
    for cat_dir in videos_dir.iterdir():
        if cat_dir.is_dir():
            cat_size = 0
            cat_files = 0
            for file_path in cat_dir.glob("*.mp4"):
                if file_path.is_file():
                    sz = file_path.stat().st_size
                    cat_size += sz
                    cat_files += 1
            library_bytes += cat_size
            file_count += cat_files
            categories_breakdown.append({
                "category_slug": cat_dir.name,
                "file_count": cat_files,
                "size_bytes": cat_size,
            })

    # Conteos en base de datos
    total_videos_db = (
        await db.execute(select(Video).where(Video.local_path.is_not(None)))
    ).scalars().all()

    return {
        "storage_root": str(root_path),
        "disk_total_bytes": disk["total_bytes"],
        "disk_free_bytes": disk["free_bytes"],
        "disk_used_bytes": disk["used_bytes"],
        "library_bytes": library_bytes,
        "media_files_count": file_count,
        "db_downloaded_count": len(total_videos_db),
        "categories_breakdown": categories_breakdown,
    }


async def scan_and_sync_storage(db: AsyncSession) -> Dict[str, int]:
    """Escanea la carpeta de almacenamiento para vincular vídeos existentes con la base de datos."""
    settings = get_settings()
    videos_dir = Path(settings.storage_root).resolve() / "videos"
    if not videos_dir.exists():
        return {"scanned_files": 0, "synced_videos": 0}

    scanned = 0
    synced = 0

    # Recorrer archivos *.mp4
    for mp4_file in videos_dir.rglob("*.mp4"):
        if not mp4_file.is_file():
            continue
        scanned += 1
        tiktok_id = mp4_file.stem  # El nombre del archivo es el tiktok_id

        # Buscar el vídeo en la base de datos
        stmt = select(Video).where(Video.tiktok_id == tiktok_id)
        video = (await db.execute(stmt)).scalar_one_or_none()
        if video and (not video.local_path or video.download_status != "completed"):
            video.local_path = str(mp4_file.as_posix())
            video.file_size = mp4_file.stat().st_size
            video.download_status = "completed"
            synced += 1

    if synced > 0:
        await db.commit()

    return {"scanned_files": scanned, "synced_videos": synced}

