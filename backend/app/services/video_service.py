"""Servicio para la gestión y consulta de vídeos."""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.entities import Category, Download, Video, VideoInteraction, video_categories
from app.schemas.models import CategoryRead, VideoPageResponse, VideoRead


def to_video_read(v: Video) -> VideoRead:
    """Convierte un modelo ORM Video a su esquema Pydantic VideoRead."""
    interactions = [i.interaction_type for i in v.interactions] if v.interactions else []
    categories = [
        CategoryRead(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            color=c.color,
            created_at=c.created_at,
        )
        for c in v.categories
    ] if v.categories else []

    return VideoRead(
        id=v.id,
        tiktok_id=v.tiktok_id,
        original_url=v.original_url,
        title=v.title,
        description=v.description,
        author=v.author,
        thumbnail=v.thumbnail,
        duration=v.duration,
        published_at=v.published_at,
        imported_at=v.imported_at,
        local_path=v.local_path,
        download_status=v.download_status,
        file_size=v.file_size,
        availability=v.availability,
        sound_name=v.sound_name,
        hashtags=v.hashtags,
        internal_favorite=v.internal_favorite,
        categories=categories,
        interactions=interactions,
    )


async def get_video_entity(db: AsyncSession, video_id: int) -> Video:
    stmt = (
        select(Video)
        .options(selectinload(Video.categories), selectinload(Video.interactions))
        .where(Video.id == video_id)
    )
    result = await db.execute(stmt)
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vídeo no encontrado.")
    return v


async def get_video(db: AsyncSession, video_id: int) -> VideoRead:
    v = await get_video_entity(db, video_id)
    return to_video_read(v)


async def list_videos(
    db: AsyncSession,
    q: Optional[str] = None,
    interaction: Optional[str] = None,
    category_slug: Optional[str] = None,
    author: Optional[str] = None,
    downloaded: Optional[str] = None,
    internal_favorite: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort: Optional[str] = "imported_desc",
    page: int = 1,
    page_size: int = 24,
) -> VideoPageResponse:
    """Consulta vídeos aplicando filtros, búsqueda y paginación."""
    stmt = select(Video).options(
        selectinload(Video.categories),
        selectinload(Video.interactions),
    )

    # Filtro de búsqueda textual
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Video.title.ilike(term),
                Video.description.ilike(term),
                Video.author.ilike(term),
                Video.sound_name.ilike(term),
                Video.hashtags_raw.ilike(term),
            )
        )

    # Filtro por tipo de interacción (like / favorite)
    if interaction:
        stmt = stmt.join(Video.interactions).where(VideoInteraction.interaction_type == interaction)

    # Filtro por categoría
    if category_slug:
        stmt = stmt.join(Video.categories).where(Category.slug == category_slug)

    # Filtro por autor
    if author:
        stmt = stmt.where(Video.author == author)

    # Filtro de descarga
    if downloaded == "yes":
        stmt = stmt.where(Video.download_status == "completed")
    elif downloaded == "no":
        stmt = stmt.where(or_(Video.download_status != "completed", Video.download_status.is_(None)))

    # Favorito interno
    if internal_favorite is not None:
        stmt = stmt.where(Video.internal_favorite == internal_favorite)

    # Rango de fechas de publicación
    if date_from:
        try:
            d_from = datetime.fromisoformat(f"{date_from}T00:00:00")
            stmt = stmt.where(Video.published_at >= d_from)
        except ValueError:
            pass

    if date_to:
        try:
            d_to = datetime.fromisoformat(f"{date_to}T23:59:59")
            stmt = stmt.where(Video.published_at <= d_to)
        except ValueError:
            pass

    # Conteo total (sin paginación ni joins de ordenamiento complejo)
    subq = stmt.order_by(None).subquery()
    count_stmt = select(func.count()).select_from(subq)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Ordenamiento
    if sort == "imported_asc":
        stmt = stmt.order_by(Video.imported_at.asc())
    elif sort == "published_desc":
        stmt = stmt.order_by(Video.published_at.desc().nullslast())
    elif sort == "published_asc":
        stmt = stmt.order_by(Video.published_at.asc().nullslast())
    elif sort == "title_asc":
        stmt = stmt.order_by(Video.title.asc().nullslast())
    elif sort == "title_desc":
        stmt = stmt.order_by(Video.title.desc().nullslast())
    else:  # imported_desc por defecto
        stmt = stmt.order_by(Video.imported_at.desc())

    # Paginación
    offset = max(0, (page - 1) * page_size)
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    videos = result.scalars().unique().all()

    return VideoPageResponse(
        items=[to_video_read(v) for v in videos],
        total=total,
        page=page,
        page_size=page_size,
    )


async def update_video_categories(
    db: AsyncSession, video_id: int, category_ids: List[int]
) -> VideoRead:
    v = await get_video_entity(db, video_id)

    # Si la lista viene vacía, asignamos a "Otros"
    if not category_ids:
        otros_stmt = select(Category).where(Category.slug == "otros")
        otros = (await db.execute(otros_stmt)).scalar_one_or_none()
        v.categories = [otros] if otros else []
    else:
        cats_stmt = select(Category).where(Category.id.in_(category_ids))
        cats = (await db.execute(cats_stmt)).scalars().all()
        v.categories = list(cats)

    await db.commit()
    await db.refresh(v)
    return to_video_read(v)


async def toggle_internal_favorite(db: AsyncSession, video_id: int) -> VideoRead:
    v = await get_video_entity(db, video_id)
    v.internal_favorite = not v.internal_favorite
    await db.commit()
    await db.refresh(v)
    return to_video_read(v)


async def request_download(db: AsyncSession, video_id: int) -> VideoRead:
    v = await get_video_entity(db, video_id)
    if v.availability != "downloadable":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este vídeo no se puede descargar: no es accesible o solo está disponible mediante enlace.",
        )
    if v.download_status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El vídeo ya está descargado.",
        )

    v.download_status = "pending"

    # Actualizar o crear registro en Downloads
    dl_stmt = select(Download).where(Download.video_id == v.id)
    dl = (await db.execute(dl_stmt)).scalar_one_or_none()
    if dl:
        dl.status = "pending"
        dl.progress = 0
        dl.error_message = None
        dl.started_at = None
        dl.completed_at = None
    else:
        dl = Download(
            video_id=v.id,
            status="pending",
            progress=0,
            started_at=None,
        )
        db.add(dl)

    await db.commit()
    await db.refresh(v)
    return to_video_read(v)


async def delete_local_file(db: AsyncSession, video_id: int) -> VideoRead:
    v = await get_video_entity(db, video_id)
    v.local_path = None
    v.file_size = None
    v.download_status = None

    # Eliminar de la cola de descargas
    dl_stmt = select(Download).where(Download.video_id == v.id)
    dl = (await db.execute(dl_stmt)).scalar_one_or_none()
    if dl:
        await db.delete(dl)

    await db.commit()
    await db.refresh(v)
    return to_video_read(v)


async def list_authors(db: AsyncSession) -> List[str]:
    stmt = (
        select(Video.author)
        .where(Video.author.is_not(None), Video.author != "")
        .distinct()
        .order_by(Video.author.asc())
    )
    result = await db.execute(stmt)
    return [a for a in result.scalars().all() if a]
