"""Esquemas Pydantic para validación y serialización de la API REST."""

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------------------
# Categorías
# -------------------------------------------------------------------------

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#7C5CFC", max_length=20)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    created_at: Optional[datetime] = None


class CategoryWithCount(CategoryRead):
    video_count: int = 0


# -------------------------------------------------------------------------
# Vídeos
# -------------------------------------------------------------------------

InteractionType = Literal["like", "favorite"]
DownloadStatus = Literal[
    "pending", "processing", "downloading", "completed", "error", "unavailable", "cancelled"
]
Availability = Literal["downloadable", "link_only", "private", "deleted", "error", "unknown"]


class VideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tiktok_id: str
    original_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    published_at: Optional[datetime] = None
    imported_at: datetime
    local_path: Optional[str] = None
    download_status: Optional[str] = None
    file_size: Optional[int] = None
    availability: str = "downloadable"
    sound_name: Optional[str] = None
    hashtags: List[str] = []
    internal_favorite: bool = False
    categories: List[CategoryRead] = []
    interactions: List[str] = []


class VideoPageResponse(BaseModel):
    items: List[VideoRead]
    total: int
    page: int
    page_size: int


class VideoCategoriesUpdate(BaseModel):
    category_ids: List[int]


class VideoFavoriteUpdate(BaseModel):
    internal_favorite: bool


# -------------------------------------------------------------------------
# Descargas
# -------------------------------------------------------------------------

class DownloadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_id: int
    video_title: Optional[str] = None
    author: Optional[str] = None
    status: str
    progress: int = 0
    file_size: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# -------------------------------------------------------------------------
# Dashboard & Actividad
# -------------------------------------------------------------------------

class ActivityItem(BaseModel):
    id: str
    kind: Literal["import", "download_completed", "download_error", "classification"]
    message: str
    at: datetime


class TopCategoryItem(BaseModel):
    category: CategoryWithCount
    count: int


class DashboardStats(BaseModel):
    total_videos: int
    downloaded: int
    favorites: int
    likes: int
    pending_downloads: int
    failed_downloads: int
    storage_bytes: int
    categories_count: int
    recent_videos: List[VideoRead]
    recent_downloads: List[DownloadRead]
    top_categories: List[TopCategoryItem]
    activity: List[ActivityItem]


# -------------------------------------------------------------------------
# Importación
# -------------------------------------------------------------------------

class ImportResultResponse(BaseModel):
    total_found: int
    imported_count: int
    updated_count: int
    likes_count: int
    favorites_count: int
    errors: List[str] = []


# -------------------------------------------------------------------------
# Ajustes (Settings)
# -------------------------------------------------------------------------

class SettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    value: str


class SettingUpdate(BaseModel):
    value: str

