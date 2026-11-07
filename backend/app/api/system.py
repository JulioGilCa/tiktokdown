"""Endpoints de sistema: salud y estado de configuración.

No exponen secretos: solo indican si ciertas piezas están configuradas.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import Settings, get_settings

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    version: str


class SystemStatus(BaseModel):
    environment: str
    tiktok_credentials_configured: bool
    token_encryption_configured: bool


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Comprobación de vida del servicio."""
    return HealthResponse(status="ok", version="0.1.0")


@router.get("/system/status", response_model=SystemStatus)
async def system_status(settings: Settings = Depends(get_settings)) -> SystemStatus:
    """Estado de la configuración (sin revelar valores sensibles)."""
    return SystemStatus(
        environment=settings.app_env,
        tiktok_credentials_configured=settings.tiktok_configured,
        token_encryption_configured=settings.token_encryption_key is not None,
    )

