"""Endpoints para la integración con TikTok: importación manual de datos y estado."""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.entities import SessionRecord
from app.schemas.models import ImportResultResponse
from app.services import import_service
from app.services.tiktok_service import tiktok_service
from sqlalchemy import select

router = APIRouter(prefix="/tiktok", tags=["tiktok"])


@router.post("/sync")
async def sync_data_portability(
    session_id: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Inicia la sincronización oficial mediante TikTok Data Portability API."""
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión con TikTok para utilizar la sincronización automática.",
        )

    stmt = select(SessionRecord).where(SessionRecord.id == session_id)
    session_row = (await db.execute(stmt)).scalar_one_or_none()
    if not session_row or not session_row.open_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no válida o no vinculada a una cuenta de TikTok.",
        )

    result = await tiktok_service.request_data_portability(db, session_row.open_id)
    return result


@router.post("/import", response_model=ImportResultResponse)
async def import_tiktok_data(
    file: UploadFile = File(..., description="Archivo ZIP o JSON exportado de TikTok"),
    db: AsyncSession = Depends(get_db),
) -> ImportResultResponse:
    """Importa el archivo ZIP (o JSON) exportado por el usuario desde la aplicación TikTok.

    Extrae automáticamente listas de Me gusta, Favoritos, enlaces, autores y fechas,
    deduplica y registra los vídeos en la biblioteca.
    """
    filename = (file.filename or "").lower()
    if not (filename.endswith(".zip") or filename.endswith(".json")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Debe ser un archivo .zip o .json de datos de TikTok.",
        )

    # Leer contenido (límite razonable de 150 MB en memoria)
    content = await file.read()
    if len(content) > 150 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el tamaño máximo permitido (150 MB).",
        )

    if filename.endswith(".zip"):
        items, errors = import_service.extract_videos_from_zip(content)
    else:
        items = import_service.process_json_content(content, filename)
        errors = []

    if not items and not errors:
        errors.append(
            "No se encontraron listas de Me gusta o Favoritos reconocibles en el archivo. "
            "Asegúrate de solicitar la exportación en formato JSON en TikTok."
        )

    summary = await import_service.save_imported_videos(db, items)
    summary.errors.extend(errors)

    return ImportResultResponse(
        total_found=summary.total_found,
        imported_count=summary.imported_count,
        updated_count=summary.updated_count,
        likes_count=summary.likes_count,
        favorites_count=summary.favorites_count,
        errors=summary.errors,
    )

