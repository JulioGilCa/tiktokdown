"""Endpoints para gestión de categorías."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.models import CategoryCreate, CategoryUpdate, CategoryWithCount
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryWithCount])
async def list_categories(db: AsyncSession = Depends(get_db)) -> List[CategoryWithCount]:
    """Obtiene el listado de categorías junto con el número de vídeos asociados."""
    return await category_service.list_categories(db)


@router.post("", response_model=CategoryWithCount, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate, db: AsyncSession = Depends(get_db)
) -> CategoryWithCount:
    """Crea una nueva categoría."""
    return await category_service.create_category(db, data)


@router.patch("/{category_id}", response_model=CategoryWithCount)
async def update_category(
    category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)
) -> CategoryWithCount:
    """Modifica una categoría existente."""
    return await category_service.update_category(db, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    """Elimina una categoría."""
    await category_service.delete_category(db, category_id)

