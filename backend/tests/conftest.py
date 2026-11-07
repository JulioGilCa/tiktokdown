"""Configuración compartida de pytest para el backend."""

import asyncio
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

TEST_DB_PATH = Path("./data/test_library.db")
if TEST_DB_PATH.exists():
    try:
        TEST_DB_PATH.unlink()
    except Exception:
        pass

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./data/test_library.db"

import app.database as db_module
from app.db_init import init_db

test_engine = create_async_engine(
    "sqlite+aiosqlite:///./data/test_library.db",
    echo=False,
    connect_args={"timeout": 30},
)
db_module.engine = test_engine
db_module.SessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


def pytest_sessionstart(session):
    """Inicializa la base de datos de test antes de ejecutar las pruebas."""
    asyncio.run(init_db())


def pytest_sessionfinish(session, exitstatus):
    """Limpia el archivo de test al finalizar la sesión."""
    asyncio.run(test_engine.dispose())
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass
