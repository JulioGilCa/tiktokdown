"""Modelos SQLAlchemy para la base de datos de TikTok Library.

Tablas:
- users
- categories
- videos
- video_categories (asociación n:m)
- video_interactions (likes, favorites)
- downloads (cola y registro de descargas)
- settings (parámetros clave-valor)
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Tabla intermedia N:M entre Vídeos y Categorías
video_categories = Table(
    "video_categories",
    Base.metadata,
    Column("video_id", Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_by", String(20), default="auto"),  # "manual" | "auto"
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#7C5CFC")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    videos: Mapped[List["Video"]] = relationship(
        "Video", secondary=video_categories, back_populates="categories"
    )


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tiktok_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    thumbnail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    local_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    download_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)  # pending, downloading, completed, etc.
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    availability: Mapped[str] = mapped_column(String(30), default="downloadable")  # downloadable, link_only, private, deleted
    sound_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hashtags_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Separados por coma
    internal_favorite: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    categories: Mapped[List["Category"]] = relationship(
        "Category", secondary=video_categories, back_populates="videos"
    )
    interactions: Mapped[List["VideoInteraction"]] = relationship(
        "VideoInteraction", back_populates="video", cascade="all, delete-orphan"
    )
    downloads: Mapped[List["Download"]] = relationship(
        "Download", back_populates="video", cascade="all, delete-orphan"
    )

    @property
    def hashtags(self) -> List[str]:
        if not self.hashtags_raw:
            return []
        return [h.strip() for h in self.hashtags_raw.split(",") if h.strip()]

    @hashtags.setter
    def hashtags(self, value: List[str]) -> None:
        self.hashtags_raw = ",".join(value) if value else None


class VideoInteraction(Base):
    __tablename__ = "video_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # "like" | "favorite"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    video: Mapped["Video"] = relationship("Video", back_populates="interactions")

    __table_args__ = (
        UniqueConstraint("video_id", "interaction_type", name="uq_video_interaction"),
    )


class Download(Base):
    __tablename__ = "downloads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    video: Mapped["Video"] = relationship("Video", back_populates="downloads")


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(50), default="tiktok", index=True)
    open_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    refresh_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SessionRecord(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # session_id aleatorio
    open_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

