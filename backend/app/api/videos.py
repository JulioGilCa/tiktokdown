"""Endpoints REST para vídeos."""

import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.models import (
    VideoCategoriesUpdate,
    VideoFavoriteUpdate,
    VideoPageResponse,
    VideoRead,
)
from app.services import video_service

router = APIRouter(prefix="/videos", tags=["videos"])


@router.get("", response_model=VideoPageResponse)
async def list_videos(
    q: Optional[str] = Query(None, description="Búsqueda por texto o #hashtag"),
    interaction: Optional[str] = Query(None, description="like | favorite"),
    category: Optional[str] = Query(None, description="Slug de categoría"),
    author: Optional[str] = Query(None, description="Nombre de autor"),
    downloaded: Optional[str] = Query(None, description="yes | no"),
    fav: Optional[bool] = Query(None, description="Solo favoritos internos"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sort: Optional[str] = Query("imported_desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> VideoPageResponse:
    """Consulta la biblioteca de vídeos con filtros combinados, búsqueda y paginación."""
    return await video_service.list_videos(
        db=db,
        q=q,
        interaction=interaction,
        category_slug=category,
        author=author,
        downloaded=downloaded,
        internal_favorite=fav,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/authors", response_model=List[str])
async def list_authors(db: AsyncSession = Depends(get_db)) -> List[str]:
    """Lista todos los autores con vídeos en la biblioteca."""
    return await video_service.list_authors(db)


@router.post("/classify-all")
async def classify_all_videos(db: AsyncSession = Depends(get_db)):
    """Ejecuta el motor de clasificación automática sobre toda la biblioteca."""
    from app.services.classification_service import classification_service
    return await classification_service.classify_all(db)


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(
    video_id: int, db: AsyncSession = Depends(get_db)
) -> VideoRead:
    """Detalle completo y metadatos de un vídeo."""
    return await video_service.get_video(db, video_id)


@router.get("/{video_id}/stream")
async def stream_video(
    video_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Reproducción integrada MP4 con soporte de cabeceras HTTP Range (206 Partial Content)."""
    video = await video_service.get_video_entity(db, video_id)
    if not video.local_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El vídeo no dispone de archivo descargado localmente.",
        )

    file_path = Path(video.local_path)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo multimedia no se encuentra en el disco o NAS.",
        )

    file_size = file_path.stat().st_size
    range_header = request.headers.get("Range")

    if range_header:
        # Formato: "bytes=0-1024"
        try:
            h_val = range_header.replace("bytes=", "")
            parts = h_val.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            if end >= file_size:
                end = file_size - 1
        except Exception:
            start = 0
            end = file_size - 1

        content_length = (end - start) + 1

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_to_read = min(remaining, 65536)
                    data = f.read(chunk_to_read)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iterfile(), status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)

    return FileResponse(file_path, media_type="video/mp4")


@router.patch("/{video_id}/categories", response_model=VideoRead)
async def update_video_categories(
    video_id: int,
    data: VideoCategoriesUpdate,
    db: AsyncSession = Depends(get_db),
) -> VideoRead:
    """Asigna categorías a un vídeo."""
    return await video_service.update_video_categories(db, video_id, data.category_ids)


@router.patch("/{video_id}/favorite", response_model=VideoRead)
async def toggle_favorite(
    video_id: int, db: AsyncSession = Depends(get_db)
) -> VideoRead:
    """Alterna el favorito interno de un vídeo."""
    return await video_service.toggle_internal_favorite(db, video_id)


@router.post("/{video_id}/download", response_model=VideoRead)
async def request_download(
    video_id: int, db: AsyncSession = Depends(get_db)
) -> VideoRead:
    """Encola la descarga de un vídeo disponible."""
    return await video_service.request_download(db, video_id)


@router.delete("/{video_id}/file", response_model=VideoRead)
async def delete_local_file(
    video_id: int, db: AsyncSession = Depends(get_db)
) -> VideoRead:
    """Elimina el archivo descargado manteniendo el registro del vídeo."""
    return await video_service.delete_local_file(db, video_id)


@router.post("/{video_id}/classify", response_model=VideoRead)
async def classify_video(
    video_id: int, db: AsyncSession = Depends(get_db)
) -> VideoRead:
    """Clasifica automáticamente un vídeo según sus metadatos (palabras clave y hashtags)."""
    from app.services.classification_service import classification_service
    await classification_service.classify_video(db, video_id)
    return await video_service.get_video(db, video_id)

