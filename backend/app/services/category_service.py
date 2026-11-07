"""Servicio para la gestión de categorías."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db_init import slugify
from app.models.entities import Category, video_categories
from app.schemas.models import CategoryCreate, CategoryUpdate, CategoryWithCount


async def list_categories(db: AsyncSession) -> List[CategoryWithCount]:
    """Lista todas las categorías con el conteo de vídeos asociados."""
    # Subconsulta de conteo por categoría
    count_subq = (
        select(
            video_categories.c.category_id,
            func.count(video_categories.c.video_id).label("video_count"),
        )
        .group_by(video_categories.c.category_id)
        .subquery()
    )

    stmt = (
        select(
            Category,
            func.coalesce(count_subq.c.video_count, 0).label("video_count"),
        )
        .outerjoin(count_subq, Category.id == count_subq.c.category_id)
        .order_by(Category.name.asc())
    )

    result = await db.execute(stmt)
    categories_with_count = []
    for cat, count in result.all():
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "color": cat.color,
            "created_at": cat.created_at,
            "video_count": count,
        }
        categories_with_count.append(CategoryWithCount(**cat_dict))

    return categories_with_count


async def get_category(db: AsyncSession, category_id: int) -> Category:
    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada.")
    return cat


async def create_category(db: AsyncSession, data: CategoryCreate) -> CategoryWithCount:
    # Verificar nombre duplicado
    stmt = select(Category).where(Category.name == data.name)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una categoría con el nombre '{data.name}'.",
        )

    slug = data.slug or slugify(data.name)
    # Verificar slug duplicado
    stmt_slug = select(Category).where(Category.slug == slug)
    if (await db.execute(stmt_slug)).scalar_one_or_none():
        slug = f"{slug}-{int(func.now())}"

    category = Category(
        name=data.name,
        slug=slug,
        description=data.description,
        color=data.color or "#7C5CFC",
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return CategoryWithCount(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        color=category.color,
        created_at=category.created_at,
        video_count=0,
    )


async def update_category(db: AsyncSession, category_id: int, data: CategoryUpdate) -> CategoryWithCount:
    category = await get_category(db, category_id)

    if data.name is not None and data.name != category.name:
        stmt = select(Category).where(Category.name == data.name, Category.id != category_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe otra categoría con el nombre '{data.name}'.",
            )
        category.name = data.name
        if not data.slug:
            category.slug = slugify(data.name)

    if data.slug is not None:
        category.slug = data.slug
    if data.description is not None:
        category.description = data.description
    if data.color is not None:
        category.color = data.color

    await db.commit()
    await db.refresh(category)

    # Conteo
    count_stmt = select(func.count()).select_from(video_categories).where(video_categories.c.category_id == category_id)
    count = (await db.execute(count_stmt)).scalar() or 0

    return CategoryWithCount(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        color=category.color,
        created_at=category.created_at,
        video_count=count,
    )


async def delete_category(db: AsyncSession, category_id: int) -> None:
    category = await get_category(db, category_id)
    if category.slug == "otros":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la categoría base 'Otros'.",
        )
    await db.delete(category)
    await db.commit()

