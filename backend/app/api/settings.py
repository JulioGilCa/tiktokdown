"""Endpoints para lectura y actualización de ajustes del sistema."""

from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.entities import Setting
from app.schemas.models import SettingRead, SettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=Dict[str, str])
async def get_settings(db: AsyncSession = Depends(get_db)) -> Dict[str, str]:
    """Obtiene todos los ajustes almacenados."""
    stmt = select(Setting)
    result = await db.execute(stmt)
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.put("/{key}", response_model=SettingRead)
async def update_setting(
    key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)
) -> SettingRead:
    """Actualiza o crea un parámetro de configuración."""
    stmt = select(Setting).where(Setting.key == key)
    setting = (await db.execute(stmt)).scalar_one_or_none()
    if setting:
        setting.value = data.value
    else:
        setting = Setting(key=key, value=data.value)
        db.add(setting)

    await db.commit()
    await db.refresh(setting)
    return SettingRead(id=setting.id, key=setting.key, value=setting.value)

