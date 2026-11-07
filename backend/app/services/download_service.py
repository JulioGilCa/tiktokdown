"""Servicio para la consulta y gestión de la cola de descargas."""

from typing import List
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Download, Video
from app.schemas.models import DownloadRead
from app.workers.download_worker import download_worker


def _to_download_read(d: Download) -> DownloadRead:
    return DownloadRead(
        id=d.id,
        video_id=d.video_id,
        video_title=d.video.title if d.video else None,
        author=d.video.author if d.video else None,
        status=d.status,
        progress=d.progress,
        file_size=d.video.file_size if d.video else None,
        error_message=d.error_message,
        started_at=d.started_at,
        completed_at=d.completed_at,
    )


async def list_downloads(db: AsyncSession) -> List[DownloadRead]:
    """Lista las descargas ordenadas por prioridad de estado y fecha."""
    stmt = (
        select(Download)
        .options(selectinload(Download.video))
        .order_by(Download.id.desc())
    )
    result = await db.execute(stmt)
    downloads = result.scalars().all()

    # Ordenar por estado: downloading, processing, pending, error, unavailable, cancelled, completed
    order = {
        "downloading": 0,
        "processing": 1,
        "pending": 2,
        "error": 3,
        "unavailable": 4,
        "cancelled": 5,
        "completed": 6,
    }
    sorted_downloads = sorted(
        downloads, key=lambda d: (order.get(d.status, 99), -(d.id or 0))
    )

    return [_to_download_read(d) for d in sorted_downloads]


async def retry_download(db: AsyncSession, download_id: int) -> DownloadRead:
    stmt = (
        select(Download)
        .options(selectinload(Download.video))
        .where(Download.id == download_id)
    )
    download = (await db.execute(stmt)).scalar_one_or_none()
    if not download:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descarga no encontrada.")

    download.status = "pending"
    download.progress = 0
    download.error_message = None
    download.started_at = None
    download.completed_at = None
    if download.video:
        download.video.download_status = "pending"

    await db.commit()
    await db.refresh(download)
    return _to_download_read(download)


async def cancel_download(db: AsyncSession, download_id: int) -> DownloadRead:
    stmt = (
        select(Download)
        .options(selectinload(Download.video))
        .where(Download.id == download_id)
    )
    download = (await db.execute(stmt)).scalar_one_or_none()
    if not download:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descarga no encontrada.")

    download_worker.cancel_download(download_id)
    download.status = "cancelled"
    download.error_message = "Cancelado por el usuario."
    if download.video:
        download.video.download_status = "cancelled"

    await db.commit()
    await db.refresh(download)
    return _to_download_read(download)


async def start_all_pending(db: AsyncSession) -> int:
    """Encola todos los vídeos que están disponibles para descarga y aún no han sido descargados."""
    stmt = (
        select(Video)
        .where(
            Video.availability == "downloadable",
            or_(
                Video.download_status.is_(None),
                Video.download_status.in_(["error", "cancelled"]),
            ),
        )
    )
    result = await db.execute(stmt)
    videos = result.scalars().all()

    enqueued = 0
    for v in videos:
        v.download_status = "pending"
        dl_stmt = select(Download).where(Download.video_id == v.id)
        dl = (await db.execute(dl_stmt)).scalar_one_or_none()
        if dl:
            dl.status = "pending"
            dl.progress = 0
            dl.error_message = None
            dl.started_at = None
            dl.completed_at = None
        else:
            dl = Download(video_id=v.id, status="pending", progress=0)
            db.add(dl)
        enqueued += 1

    await db.commit()
    return enqueued
