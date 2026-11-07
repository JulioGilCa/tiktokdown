"""Pruebas del motor y servicio de clasificación automática."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.database import SessionLocal
from app.main import app
from app.models.entities import Category, Video, video_categories
from app.services.classification_service import RuleBasedClassifier


def test_rule_based_classifier_logic():
    classifier = RuleBasedClassifier()

    cat_prog = Category(id=1, name="Programación", slug="programacion")
    cat_ia = Category(id=2, name="Inteligencia Artificial", slug="inteligencia-artificial")
    cat_cocina = Category(id=3, name="Cocina", slug="cocina")
    cat_otros = Category(id=4, name="Otros", slug="otros")

    categories_by_slug = {
        "programacion": cat_prog,
        "inteligencia-artificial": cat_ia,
        "cocina": cat_cocina,
        "otros": cat_otros,
    }

    # 1. Caso Programación
    res_prog = classifier.classify(
        title="3 trucos de Python que te ahorran tiempo",
        description="Aprende desarrollo backend con FastAPI y React",
        hashtags=["python", "coding", "developer"],
        sound_name="chill beat",
        author="codemaster",
        categories_by_slug=categories_by_slug,
    )
    assert any(c.slug == "programacion" for c in res_prog)

    # 2. Caso Inteligencia Artificial
    res_ia = classifier.classify(
        title="Cómo usar ChatGPT y Claude para automatizar",
        description="Novedades de modelos LLM y agentes de IA",
        hashtags=["ia", "chatgpt"],
        sound_name=None,
        author="ai_daily",
        categories_by_slug=categories_by_slug,
    )
    assert any(c.slug == "inteligencia-artificial" for c in res_ia)

    # 3. Caso Cocina
    res_cocina = classifier.classify(
        title="Receta de pasta cremosa en 10 minutos",
        description="Deliciosa cena fácil y rápida con queso e ingredientes caseros",
        hashtags=["receta", "comida", "chef"],
        sound_name=None,
        author="chefencasa",
        categories_by_slug=categories_by_slug,
    )
    assert any(c.slug == "cocina" for c in res_cocina)

    # 4. Caso sin metadatos -> debe ir a "Otros" sin inventar
    res_otros = classifier.classify(
        title=None,
        description=None,
        hashtags=[],
        sound_name=None,
        author=None,
        categories_by_slug=categories_by_slug,
    )
    assert len(res_otros) == 1
    assert res_otros[0].slug == "otros"


@pytest.mark.asyncio
async def test_classification_api_endpoints():
    # Crear un vídeo temático de cocina
    async with SessionLocal() as db:
        video = Video(
            tiktok_id="8889991112223334445",
            original_url="https://www.tiktok.com/@chef/video/8889991112223334445",
            title="Tortilla de patatas perfecta paso a paso",
            description="Receta tradicional de cocina espanola #receta #cocina",
            author="chef_master",
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)
        video_id = video.id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Clasificar automáticamente el vídeo
        res = await ac.post(f"/api/videos/{video_id}/classify")
        assert res.status_code == 200
        data = res.json()
        slugs = [c["slug"] for c in data["categories"]]
        assert "cocina" in slugs

        # Clasificar todos
        all_res = await ac.post("/api/videos/classify-all")
        assert all_res.status_code == 200
        assert "classified_count" in all_res.json()

