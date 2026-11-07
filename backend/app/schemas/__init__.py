"""Esquemas Pydantic de entrada/salida para la API REST."""

from app.schemas.models import (
    ActivityItem,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    CategoryWithCount,
    DashboardStats,
    DownloadRead,
    ImportResultResponse,
    SettingRead,
    SettingUpdate,
    TopCategoryItem,
    VideoCategoriesUpdate,
    VideoFavoriteUpdate,
    VideoPageResponse,
    VideoRead,
)

__all__ = [
    "ActivityItem",
    "CategoryCreate",
    "CategoryRead",
    "CategoryUpdate",
    "CategoryWithCount",
    "DashboardStats",
    "DownloadRead",
    "ImportResultResponse",
    "SettingRead",
    "SettingUpdate",
    "TopCategoryItem",
    "VideoCategoriesUpdate",
    "VideoFavoriteUpdate",
    "VideoPageResponse",
    "VideoRead",
]
