"""Inicialización y siembra (seeding) de la base de datos."""

import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, engine
from app.models.entities import Category

INITIAL_CATEGORIES = [
    {"name": "Tecnología", "color": "#38bdf8", "description": "Gadgets, novedades y reviews."},
    {"name": "Programación", "color": "#22c55e", "description": "Código, trucos y desarrollo."},
    {"name": "Inteligencia Artificial", "color": "#a855f7", "description": "IA, modelos y herramientas."},
    {"name": "Informática", "color": "#0ea5e9", "description": "Hardware, sistemas y redes."},
    {"name": "Electrónica", "color": "#f97316", "description": "Arduino, soldadura y circuitos."},
    {"name": "Bricolaje", "color": "#eab308", "description": "Proyectos DIY y reparaciones."},
    {"name": "Hogar", "color": "#14b8a6", "description": "Organización y decoración."},
    {"name": "Cocina", "color": "#ef4444", "description": "Recetas y técnicas."},
    {"name": "Deportes", "color": "#10b981", "description": "Entrenamiento y competición."},
    {"name": "Humor", "color": "#f472b6", "description": "Sketches y comedia."},
    {"name": "Música", "color": "#c084fc", "description": "Covers, instrumentos y producción."},
    {"name": "Educación", "color": "#60a5fa", "description": "Aprendizaje y divulgación."},
    {"name": "Ciencia", "color": "#2dd4bf", "description": "Física, química y espacio."},
    {"name": "Viajes", "color": "#fb923c", "description": "Destinos y consejos."},
    {"name": "Automoción", "color": "#94a3b8", "description": "Coches, motos y mecánica."},
    {"name": "Otros", "color": "#6b7280", "description": "Vídeos sin categoría clara."},
]


def slugify(text: str) -> str:
    text = text.lower()
    replacements = (
        ("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n"), ("ü", "u")
    )
    for orig, repl in replacements:
        text = text.replace(orig, repl)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


async def init_db() -> None:
    """Crea todas las tablas si no existen e inserta las categorías iniciales."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Sembrar categorías iniciales si no existen
    async with AsyncSession(engine) as session:
        result = await session.execute(select(Category))
        existing = {c.name for c in result.scalars().all()}

        for cat in INITIAL_CATEGORIES:
            if cat["name"] not in existing:
                category = Category(
                    name=cat["name"],
                    slug=slugify(cat["name"]),
                    description=cat.get("description"),
                    color=cat.get("color", "#7C5CFC"),
                )
                session.add(category)

        await session.commit()

