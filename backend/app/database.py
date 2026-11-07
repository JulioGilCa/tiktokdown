"""Motor de base de datos y sesiones asíncronas de SQLAlchemy.

Se usa SQLAlchemy 2.0 en modo async: SQLite (aiosqlite) por defecto y
PostgreSQL (asyncpg) cambiando únicamente ``DATABASE_URL``.
Los modelos se añadirán en la Fase 3.
"""

from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM."""


def _ensure_sqlite_dir(database_url: str) -> None:
    """Crea la carpeta del archivo SQLite si no existe."""
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)


_settings = get_settings()
_ensure_sqlite_dir(_settings.database_url)

_url = make_url(_settings.database_url)
connect_args = {"timeout": 30} if _url.get_backend_name() == "sqlite" else {}

engine = create_async_engine(_settings.database_url, echo=False, future=True, connect_args=connect_args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Configura WAL mode y busy_timeout en SQLite para soportar concurrencia sin bloqueos."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()
    except Exception:
        pass


async def get_db() -> AsyncIterator[AsyncSession]:
    """Dependencia de FastAPI que entrega una sesión por petición."""
    async with SessionLocal() as session:
        yield session

