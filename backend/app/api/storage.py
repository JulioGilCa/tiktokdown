"""Endpoints para gestión, diagnóstico y sincronización del almacenamiento."""

from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import storage_service

router = APIRouter(prefix="/storage", tags=["storage"])


@router.get("/info")
async def get_storage_info(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Devuelve métricas reales de espacio en disco, volumen NAS y desglose por categorías."""
    return await storage_service.get_storage_diagnostics(db)


@router.post("/scan")
async def scan_storage(db: AsyncSession = Depends(get_db)) -> Dict[str, int]:
    """Escanea la carpeta de almacenamiento y vincula archivos existentes en disco con la base de datos."""
    return await storage_service.scan_and_sync_storage(db)

