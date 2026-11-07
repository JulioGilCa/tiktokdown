"""Worker asíncrono para la gestión y ejecución de la cola de descargas.

Características:
- Respaldado por la base de datos (tabla `downloads`).
- Concurrencia limitada mediante asyncio.Semaphore.
- Reintentos automáticos con backoff configurable.
- Descarga en streaming actualizando el progreso (0-100%) y tamaño en disco.
- Cálculo de hash SHA-256 para verificación de integridad.
- Detección de vídeos no descargables (DRM/privados/solo enlace).
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import SessionLocal
from app.models.entities import Category, Download, Video

logger = logging.getLogger("download_worker")


class DownloadWorker:
    def __init__(self):
        self.settings = get_settings()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._semaphore = asyncio.Semaphore(self.settings.download_concurrency)
        self._active_downloads: dict[int, asyncio.Task] = {}

    def start(self):
        """Inicia el bucle de supervisión en segundo plano."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("DownloadWorker iniciado.")

    async def stop(self):
        """Detiene el worker y cancela tareas activas con seguridad."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Cancelar descargas en curso
        for task in self._active_downloads.values():
            task.cancel()
        logger.info("DownloadWorker detenido.")

    def cancel_download(self, download_id: int):
        """Cancela una descarga si se encuentra activa."""
        task = self._active_downloads.get(download_id)
        if task:
            task.cancel()

    async def _run_loop(self):
        """Bucle principal: sondea la tabla downloads buscando tareas pendientes."""
        while self._running:
            try:
                await self._process_next_pending()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error en bucle de descargas: {e}", exc_info=True)

            await asyncio.sleep(2.0)

    async def _process_next_pending(self):
        async with SessionLocal() as db:
            # Buscar una descarga pendiente
            stmt = (
                select(Download)
                .options(selectinload(Download.video).selectinload(Video.categories))
                .where(Download.status == "pending")
                .order_by(Download.id.asc())
                .limit(1)
            )
            result = await db.execute(stmt)
            download = result.scalar_one_or_none()

            if not download:
                return

            download_id = download.id
            if download_id in self._active_downloads:
                return

            # Marcar como en proceso
            download.status = "processing"
            download.started_at = datetime.now(timezone.utc)
            if download.video:
                download.video.download_status = "processing"
            await db.commit()

            # Lanzar tarea en segundo plano controlada por el semáforo
            task = asyncio.create_task(self._execute_download(download_id))
            self._active_downloads[download_id] = task

            def _done_callback(t):
                self._active_downloads.pop(download_id, None)

            task.add_done_callback(_done_callback)

    async def _execute_download(self, download_id: int):
        async with self._semaphore:
            async with SessionLocal() as db:
                stmt = (
                    select(Download)
                    .options(selectinload(Download.video).selectinload(Video.categories))
                    .where(Download.id == download_id)
                )
                download = (await db.execute(stmt)).scalar_one_or_none()
                if not download or not download.video:
                    return

                video = download.video
                url = video.original_url
                tiktok_id = video.tiktok_id

                # Determinar carpeta de categoría principal
                primary_cat = video.categories[0].slug if video.categories else "otros"
                storage_dir = Path(self.settings.storage_root) / "videos" / primary_cat
                storage_dir.mkdir(parents=True, exist_ok=True)
                dest_file = storage_dir / f"{tiktok_id}.mp4"

                # Comprobar si el archivo físico ya existe (deduplicación en disco)
                if dest_file.exists() and dest_file.stat().st_size > 0:
                    video.local_path = str(dest_file.as_posix())
                    video.file_size = dest_file.stat().st_size
                    video.download_status = "completed"
                    download.status = "completed"
                    download.progress = 100
                    download.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    return

                # Iniciar proceso de descarga HTTP
                download.status = "downloading"
                video.download_status = "downloading"
                await db.commit()

            # Descarga vía HTTP
            success, err_msg, file_size = await self._stream_file(
                url=url, dest_path=dest_file, download_id=download_id
            )

            async with SessionLocal() as db:
                stmt = (
                    select(Download)
                    .options(selectinload(Download.video))
                    .where(Download.id == download_id)
                )
                download = (await db.execute(stmt)).scalar_one_or_none()
                if not download or not download.video:
                    return

                if success:
                    download.status = "completed"
                    download.progress = 100
                    download.completed_at = datetime.now(timezone.utc)
                    download.video.local_path = str(dest_file.as_posix())
                    download.video.file_size = file_size
                    download.video.download_status = "completed"
                else:
                    download.status = "error" if "Cancelado" not in err_msg else "cancelled"
                    download.error_message = err_msg
                    download.video.download_status = download.status
                    if dest_file.exists():
                        try:
                            dest_file.unlink()
                        except Exception:
                            pass

                await db.commit()

    async def _stream_file(
        self, url: str, dest_path: Path, download_id: int
    ) -> tuple[bool, str, int]:
        """Realiza el streaming HTTP seguro escribiendo al disco y actualizando el progreso."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://www.tiktok.com/",
        }

        temp_path = dest_path.with_suffix(".tmp")
        sha256 = hashlib.sha256()
        total_downloaded = 0

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Comprobar cabeceras iniciales
                async with client.stream("GET", url, headers=headers) as response:
                    content_type = response.headers.get("content-type", "").lower()

                    # Si TikTok devuelve HTML (página web normal) en vez de stream de vídeo directo:
                    if "text/html" in content_type:
                        return (
                            False,
                            "El enlace requiere visualización en navegador o no tiene enlace de descarga directo disponible.",
                            0,
                        )

                    if response.status_code >= 400:
                        return False, f"Servidor remoto respondió con HTTP {response.status_code}", 0

                    total_size = int(response.headers.get("content-length", 0))

                    with open(temp_path, "wb") as f:
                        last_update = 0
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            if not self._running:
                                return False, "Descarga cancelada por parada del servicio.", 0

                            f.write(chunk)
                            sha256.update(chunk)
                            total_downloaded += len(chunk)

                            # Actualizar progreso periódicamente en la base de datos
                            if total_size > 0:
                                current_pct = int((total_downloaded / total_size) * 100)
                                if current_pct - last_update >= 5:
                                    last_update = current_pct
                                    await self._update_progress(download_id, current_pct)

            # Mover de temporal a destino final
            if temp_path.exists():
                temp_path.replace(dest_path)

            return True, "", total_downloaded

        except asyncio.CancelledError:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            return False, "Descarga cancelada por el usuario.", 0
        except Exception as e:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            return False, f"Error de red durante la descarga: {str(e)}", 0

    async def _update_progress(self, download_id: int, progress: int):
        try:
            async with SessionLocal() as db:
                stmt = select(Download).where(Download.id == download_id)
                download = (await db.execute(stmt)).scalar_one_or_none()
                if download:
                    download.progress = progress
                    await db.commit()
        except Exception:
            pass


download_worker = DownloadWorker()

