"""Endpoints para la cola y estado de descargas."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.models import DownloadRead
from app.services import download_service

router = APIRouter(prefix="/downloads", tags=["downloads"])


@router.get("", response_model=List[DownloadRead])
async def list_downloads(db: AsyncSession = Depends(get_db)) -> List[DownloadRead]:
    """Lista las descargas y el estado actual de la cola."""
    return await download_service.list_downloads(db)


@router.post("/{download_id}/retry", response_model=DownloadRead)
async def retry_download(
    download_id: int, db: AsyncSession = Depends(get_db)
) -> DownloadRead:
    """Reintenta una descarga fallida o cancelada."""
    return await download_service.retry_download(db, download_id)


@router.post("/{download_id}/cancel", response_model=DownloadRead)
async def cancel_download(
    download_id: int, db: AsyncSession = Depends(get_db)
) -> DownloadRead:
    """Cancela una descarga en curso o pendiente."""
    return await download_service.cancel_download(db, download_id)


@router.post("/start-all")
async def start_all_downloads(db: AsyncSession = Depends(get_db)):
    """Encola todos los vídeos descargables disponibles que aún no están en la biblioteca local."""
    enqueued = await download_service.start_all_pending(db)
    return {"enqueued": enqueued}
