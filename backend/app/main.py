"""Punto de entrada de la API FastAPI.

Toda la API se expone bajo el prefijo ``/api`` para que frontend y backend
compartan origen detrás de un proxy (Vite en desarrollo, Nginx en producción).
Documentación Swagger: ``/api/docs``.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api import (
    auth,
    categories,
    dashboard,
    downloads,
    settings as settings_api,
    storage,
    system,
    tiktok,
    videos,
)
from app.config import get_settings
from app.db_init import init_db
from app.workers.download_worker import download_worker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de la base de datos y categorías al arrancar
    await init_db()
    # Iniciar el worker de descargas en segundo plano
    download_worker.start()
    try:
        yield
    finally:
        await download_worker.stop()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API privada para gestionar una biblioteca personal de vídeos de TikTok.",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Inclusión de routers bajo /api
app.include_router(auth.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(videos.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(downloads.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(storage.router, prefix="/api")
app.include_router(tiktok.router, prefix="/api")
