"""Servicio para calcular métricas y estadísticas del Dashboard."""

from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Category, Download, Video, VideoInteraction, video_categories
from app.schemas.models import (
    ActivityItem,
    CategoryWithCount,
    DashboardStats,
    DownloadRead,
    TopCategoryItem,
)
from app.services.video_service import to_video_read


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    # 1. Conteos principales
    total_videos = (await db.execute(select(func.count(Video.id)))).scalar() or 0
    downloaded = (
        await db.execute(
            select(func.count(Video.id)).where(Video.download_status == "completed")
        )
    ).scalar() or 0

    favorites = (
        await db.execute(
            select(func.count(VideoInteraction.id)).where(
                VideoInteraction.interaction_type == "favorite"
            )
        )
    ).scalar() or 0

    likes = (
        await db.execute(
            select(func.count(VideoInteraction.id)).where(
                VideoInteraction.interaction_type == "like"
            )
        )
    ).scalar() or 0

    pending_downloads = (
        await db.execute(
            select(func.count(Download.id)).where(
                Download.status.in_(["pending", "processing", "downloading"])
            )
        )
    ).scalar() or 0

    failed_downloads = (
        await db.execute(
            select(func.count(Download.id)).where(Download.status == "error")
        )
    ).scalar() or 0

    storage_bytes = (
        await db.execute(select(func.coalesce(func.sum(Video.file_size), 0)))
    ).scalar() or 0

    categories_count = (await db.execute(select(func.count(Category.id)))).scalar() or 0

    # 2. Últimos vídeos añadidos (máx 6)
    recent_videos_stmt = (
        select(Video)
        .options(selectinload(Video.categories), selectinload(Video.interactions))
        .order_by(Video.imported_at.desc())
        .limit(6)
    )
    recent_videos = [
        to_video_read(v)
        for v in (await db.execute(recent_videos_stmt)).scalars().unique().all()
    ]

    # 3. Últimas descargas completadas (máx 5)
    recent_downloads_stmt = (
        select(Download)
        .options(selectinload(Download.video))
        .where(Download.status == "completed")
        .order_by(Download.completed_at.desc().nullslast(), Download.id.desc())
        .limit(5)
    )
    recent_downloads = [
        DownloadRead(
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
        for d in (await db.execute(recent_downloads_stmt)).scalars().all()
    ]

    # 4. Categorías más utilizadas
    top_cat_stmt = (
        select(
            Category,
            func.count(video_categories.c.video_id).label("video_count"),
        )
        .join(video_categories, Category.id == video_categories.c.category_id)
        .group_by(Category.id)
        .order_by(func.count(video_categories.c.video_id).desc())
        .limit(6)
    )
    top_categories = []
    for cat, count in (await db.execute(top_cat_stmt)).all():
        c_with_count = CategoryWithCount(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            color=cat.color,
            created_at=cat.created_at,
            video_count=count,
        )
        top_categories.append(TopCategoryItem(category=c_with_count, count=count))

    # 5. Actividad reciente
    # Construir actividad a partir de importaciones y descargas recientes
    activity: List[ActivityItem] = []

    # Importaciones recientes
    for v in recent_videos[:4]:
        activity.append(
            ActivityItem(
                id=f"imp-{v.id}",
                kind="import",
                message=f"Importado «{v.title or 'Sin título'}»",
                at=v.imported_at,
            )
        )

    # Descargas recientes (completadas y con error)
    activity_downloads_stmt = (
        select(Download)
        .options(selectinload(Download.video))
        .where(Download.status.in_(["completed", "error"]))
        .order_by(Download.id.desc())
        .limit(4)
    )
    for d in (await db.execute(activity_downloads_stmt)).scalars().all():
        kind = "download_completed" if d.status == "completed" else "download_error"
        msg = (
            f"Descarga completada: «{d.video.title or 'Sin título'}»"
            if d.status == "completed"
            else f"Error al descargar «{d.video.title or 'Sin título'}»"
        )
        dt = d.completed_at or d.started_at or func.now()
        activity.append(
            ActivityItem(
                id=f"dl-{d.id}",
                kind=kind,
                message=msg,
                at=dt if isinstance(dt, datetime) else datetime.now(),
            )
        )

    activity.sort(key=lambda a: a.at, reverse=True)

    return DashboardStats(
        total_videos=total_videos,
        downloaded=downloaded,
        favorites=favorites,
        likes=likes,
        pending_downloads=pending_downloads,
        failed_downloads=failed_downloads,
        storage_bytes=storage_bytes,
        categories_count=categories_count,
        recent_videos=recent_videos,
        recent_downloads=recent_downloads,
        top_categories=top_categories,
        activity=activity[:8],
    )

