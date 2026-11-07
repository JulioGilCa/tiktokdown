"""Servicio para procesar e importar archivos ZIP (y JSON) exportados de TikTok.

Estructuras habituales en la exportación de TikTok:
- JSON unificado (user_data.json) con claves:
  - Activity -> Like List -> ItemFavoriteList: [{ date: ..., link: ... }]
  - Activity -> Favorite Videos -> FavoriteVideoList: [{ Date: ..., Link: ... }]
- Archivos individuales dentro del ZIP:
  - Activity/Like List.json
  - Activity/Favorite Videos.json
  - Activity/Video Browsing History.json
"""

import json
import re
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Category, Video, VideoInteraction


@dataclass
class ExtractedVideoItem:
    tiktok_id: str
    original_url: str
    interaction_type: str  # "like" | "favorite"
    published_or_interacted_at: Optional[datetime] = None
    author: Optional[str] = None
    title: Optional[str] = None


@dataclass
class ImportSummary:
    total_found: int = 0
    imported_count: int = 0
    updated_count: int = 0
    likes_count: int = 0
    favorites_count: int = 0
    errors: List[str] = field(default_factory=list)


TIKTOK_URL_REGEX = re.compile(
    r"https?://(?:www\.)?tiktok\.com/(?:@(?P<author>[a-zA-Z0-9_\.\-]+)/video/(?P<id1>\d+)|v/(?P<id2>\d+))",
    re.IGNORECASE,
)
GENERIC_ID_REGEX = re.compile(r"/video/(?P<id>\d+)")


def extract_tiktok_info_from_url(url: str) -> Tuple[Optional[str], Optional[str]]:
    """Extrae (tiktok_id, author) a partir de la URL de TikTok."""
    if not url or not isinstance(url, str):
        return None, None

    url = url.strip()
    match = TIKTOK_URL_REGEX.search(url)
    if match:
        author = match.group("author")
        tiktok_id = match.group("id1") or match.group("id2")
        return tiktok_id, author

    # Si la URL tiene un formato variante como /video/12345
    gen_match = GENERIC_ID_REGEX.search(url)
    if gen_match:
        return gen_match.group("id"), None

    return None, None


def parse_date(date_str: Any) -> Optional[datetime]:
    """Intenta parsear diferentes formatos de fecha que emite TikTok."""
    if not date_str or not isinstance(date_str, str):
        return None

    date_str = date_str.strip()
    # Formatos habituales: "2024-03-12 14:22:10", "2024-03-12T14:22:10Z", etc.
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S UTC",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(date_str)
    except Exception:
        return None


def find_items_in_structure(data: Any, interaction_hint: Optional[str] = None) -> List[ExtractedVideoItem]:
    """Recorre recursivamente diccionarios y listas para encontrar listas de vídeos de TikTok."""
    items: List[ExtractedVideoItem] = []

    if isinstance(data, dict):
        for key, value in data.items():
            key_lower = str(key).lower()
            current_hint = interaction_hint
            # En exportaciones de TikTok, "ItemFavoriteList" bajo "Like List" corresponde a LIKES
            if "like" in key_lower:
                current_hint = "like"
            elif "favorite" in key_lower:
                if current_hint != "like":
                    current_hint = "favorite"

            # Detectar lista de elementos con link/url
            if isinstance(value, list):
                for elem in value:
                    if isinstance(elem, dict):
                        # Buscar link/url en el elemento
                        link = (
                            elem.get("link")
                            or elem.get("Link")
                            or elem.get("url")
                            or elem.get("Url")
                            or elem.get("video_link")
                            or elem.get("VideoLink")
                        )
                        date_val = (
                            elem.get("date")
                            or elem.get("Date")
                            or elem.get("created_at")
                            or elem.get("time")
                        )
                        if link:
                            t_id, author = extract_tiktok_info_from_url(str(link))
                            if t_id:
                                items.append(
                                    ExtractedVideoItem(
                                        tiktok_id=t_id,
                                        original_url=str(link).strip(),
                                        interaction_type=current_hint or "like",
                                        published_or_interacted_at=parse_date(date_val),
                                        author=author,
                                    )
                                )
                    elif isinstance(elem, (dict, list)):
                        items.extend(find_items_in_structure(elem, current_hint))
            elif isinstance(value, (dict, list)):
                items.extend(find_items_in_structure(value, current_hint))

    elif isinstance(data, list):
        for elem in data:
            if isinstance(elem, (dict, list)):
                items.extend(find_items_in_structure(elem, interaction_hint))

    return items


def process_json_content(content_bytes: bytes, filename: str = "") -> List[ExtractedVideoItem]:
    """Parsea un contenido JSON y extrae los vídeos."""
    try:
        data = json.loads(content_bytes.decode("utf-8", errors="replace"))
    except Exception as e:
        return []

    hint = None
    fn_lower = filename.lower()
    if "like" in fn_lower:
        hint = "like"
    elif "favorite" in fn_lower:
        hint = "favorite"

    return find_items_in_structure(data, hint)


def extract_videos_from_zip(zip_bytes: bytes) -> Tuple[List[ExtractedVideoItem], List[str]]:
    """Abre el archivo ZIP de forma segura y analiza todos los archivos JSON internos."""
    extracted: List[ExtractedVideoItem] = []
    errors: List[str] = []

    try:
        with zipfile.ZipFile(BytesIO(zip_bytes), "r") as zf:
            for zip_info in zf.infolist():
                # Evitar ataques de Zip Slip (path traversal)
                if zip_info.filename.startswith("/") or ".." in zip_info.filename:
                    continue
                # Limitar tamaño descompreso por fichero (máx 50MB por JSON para seguridad)
                if zip_info.file_size > 50 * 1024 * 1024:
                    errors.append(f"El archivo {zip_info.filename} excede el límite de tamaño seguro.")
                    continue

                if zip_info.filename.lower().endswith(".json"):
                    try:
                        raw = zf.read(zip_info.filename)
                        items = process_json_content(raw, zip_info.filename)
                        extracted.extend(items)
                    except Exception as e:
                        errors.append(f"Error procesando {zip_info.filename}: {str(e)}")

    except zipfile.BadZipFile:
        errors.append("El archivo suministrado no es un archivo ZIP válido.")
    except Exception as e:
        errors.append(f"Error al descomprimir: {str(e)}")

    return extracted, errors


async def save_imported_videos(db: AsyncSession, items: List[ExtractedVideoItem]) -> ImportSummary:
    """Persiste los vídeos e interacciones en la base de datos deduplicando por tiktok_id."""
    summary = ImportSummary(total_found=len(items))

    # Obtener categoría "Otros" por defecto
    otros_stmt = select(Category).where(Category.slug == "otros")
    otros = (await db.execute(otros_stmt)).scalar_one_or_none()

    # Agrupar por tiktok_id para consolidar interacciones del mismo archivo
    grouped: Dict[str, List[ExtractedVideoItem]] = {}
    for item in items:
        if item.tiktok_id not in grouped:
            grouped[item.tiktok_id] = []
        grouped[item.tiktok_id].append(item)

    for tiktok_id, group in grouped.items():
        first = group[0]
        # Comprobar si ya existe en BD
        v_stmt = (
            select(Video)
            .options(selectinload(Video.categories), selectinload(Video.interactions))
            .where(Video.tiktok_id == tiktok_id)
        )
        existing_video = (await db.execute(v_stmt)).scalar_one_or_none()

        if existing_video:
            # Vídeo existente: comprobar si hay nuevos datos
            summary.updated_count += 1
            if first.author and not existing_video.author:
                existing_video.author = first.author
            video_ref = existing_video
            existing_interactions = {i.interaction_type for i in video_ref.interactions}
        else:
            # Nuevo vídeo
            summary.imported_count += 1
            video_ref = Video(
                tiktok_id=tiktok_id,
                original_url=first.original_url,
                title=f"Vídeo de TikTok {tiktok_id}",
                author=first.author,
                published_at=first.published_or_interacted_at,
                availability="downloadable",
            )
            if otros:
                video_ref.categories = [otros]
            db.add(video_ref)
            await db.flush()  # Para obtener el ID
            existing_interactions = set()
        for g in group:
            itype = g.interaction_type
            if itype == "like":
                summary.likes_count += 1
            elif itype == "favorite":
                summary.favorites_count += 1

            if itype not in existing_interactions:
                interaction = VideoInteraction(
                    video_id=video_ref.id,
                    interaction_type=itype,
                    created_at=g.published_or_interacted_at or datetime.now(),
                )
                db.add(interaction)
                existing_interactions.add(itype)

    await db.commit()
    return summary
