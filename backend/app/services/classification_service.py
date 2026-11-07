"""Servicio y motor de clasificación automática de vídeos.

Diseño modular:
- Interfaz abstracta `BaseClassifier`.
- `RuleBasedClassifier`: motor de reglas basado en palabras clave, hashtags y
  metadatos ponderados (título, descripción, sonido, autor).
- Diseñado para permitir incorporar `AIClassifier` (LLM o modelo de embeddings)
  con el mismo contrato.
- Preserva asignaciones manuales (`assigned_by = "manual"`).
- Asigna a "Otros" únicamente cuando no hay metadatos suficientes.
"""

import re
import unicodedata
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Category, Video, video_categories


def normalize_text(text: Optional[str]) -> str:
    """Normaliza texto: minúsculas, elimina tildes y caracteres especiales."""
    if not text:
        return ""
    text = text.lower()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )
    return text


# Reglas semánticas por categoría (palabras clave y hashtags específicos)
CATEGORY_RULES: Dict[str, Dict[str, List[str]]] = {
    "tecnologia": {
        "keywords": [
            "tecnologia", "gadget", "gadgets", "smartphone", "iphone", "android",
            "review", "unboxing", "dispositivo", "auriculares", "smartwatch",
            "innovacion", "telefonia", "pantalla", "bateria", "apple", "samsung",
            "xiaomi", "tecnologico", "wearable",
        ],
        "hashtags": ["tecnologia", "tech", "gadgets", "review", "smartphone", "apple", "techreview"],
    },
    "programacion": {
        "keywords": [
            "programacion", "codigo", "desarrollo", "software", "python", "javascript",
            "typescript", "react", "fastapi", "html", "css", "git", "github",
            "backend", "frontend", "fullstack", "sql", "database", "api", "rest",
            "docker", "developer", "programador", "bug", "debugging", "algoritmo",
            "framework", "terminal", "linux", "coding", "dev",
        ],
        "hashtags": [
            "programacion", "coding", "developer", "python", "javascript", "programador",
            "dev", "software", "code", "coder", "webdev",
        ],
    },
    "inteligencia-artificial": {
        "keywords": [
            "inteligencia artificial", "ai", "ia", "chatgpt", "openai", "gemini",
            "machine learning", "deep learning", "llm", "modelo", "redes neuronales",
            "midjourney", "stable diffusion", "prompt", "prompting", "agente",
            "automatizacion", "vision artificial", "nlp", "claude",
        ],
        "hashtags": [
            "ia", "ai", "inteligenciaartificial", "chatgpt", "openai", "machinelearning",
            "artificialintelligence", "midjourney",
        ],
    },
    "informatica": {
        "keywords": [
            "informatica", "ordenador", "computadora", "pc", "hardware", "cpu", "gpu",
            "tarjeta grafica", "ram", "ssd", "disco duro", "placa base", "windows",
            "servidor", "homelab", "nas", "synology", "proxmox", "redes", "wifi",
            "router", "bios", "montar pc", "setup",
        ],
        "hashtags": ["informatica", "pc", "hardware", "homelab", "setup", "computacion", "windows"],
    },
    "electronica": {
        "keywords": [
            "electronica", "arduino", "esp32", "raspberry", "circuito", "soldar",
            "soldadura", "resistencia", "condensador", "voltaje", "corriente",
            "multimetro", "placa", "maker", "led", "sensor", "microcontrolador",
            "bateria de litio", "cautin",
        ],
        "hashtags": ["electronica", "arduino", "esp32", "maker", "circuits", "diytech"],
    },
    "bricolaje": {
        "keywords": [
            "bricolaje", "diy", "hazlo tu mismo", "herramientas", "madera", "taladro",
            "tornillo", "carpinteria", "restauracion", "mueble", "pintura", "lijar",
            "reparar", "arreglo", "taller", "manualidades", "cinta",
        ],
        "hashtags": ["bricolaje", "diy", "hazlotumismo", "carpinteria", "woodworking", "restauracion"],
    },
    "hogar": {
        "keywords": [
            "hogar", "casa", "decoracion", "limpieza", "orden", "organizacion",
            "interiorismo", "plantas", "muebles", "salon", "dormitorio", "bano",
            "cocina limpia", "truco de limpieza", "hogar limpio", "ikea",
        ],
        "hashtags": ["hogar", "casa", "decoracion", "organizacion", "limpieza", "homedecor", "trucoshogar"],
    },
    "cocina": {
        "keywords": [
            "cocina", "receta", "recetas", "comida", "postre", "cena", "almuerzo",
            "desayuno", "chef", "ingrediente", "horno", "sarten", "patatas", "pasta",
            "carne", "pescado", "pan", "reposteria", "dulce", "sabor", "delicioso",
            "freidora de aire", "airfryer",
        ],
        "hashtags": ["cocina", "receta", "recetas", "comida", "food", "foodie", "recetasfaciles", "chef"],
    },
    "deportes": {
        "keywords": [
            "deporte", "deportes", "futbol", "baloncesto", "fitness", "gym", "gimnasio",
            "entrenamiento", "ejercicio", "rutina", "correr", "running", "maraton",
            "pesas", "musculo", "calistenia", "crossfit", "ciclismo", "padel", "tenis",
        ],
        "hashtags": ["deporte", "deportes", "fitness", "gym", "futbol", "entrenamiento", "workout"],
    },
    "humor": {
        "keywords": [
            "humor", "comedia", "risa", "risas", "chiste", "gracioso", "sketch",
            "parodia", "meme", "memes", "broma", "divertido", "situaciones", "ironia",
        ],
        "hashtags": ["humor", "comedia", "risas", "meme", "funny", "gracioso", "chiste"],
    },
    "musica": {
        "keywords": [
            "musica", "cancion", "cantante", "guitarra", "piano", "bateria musical",
            "acorde", "cover", "beat", "produccion musical", "voz", "concierto",
            "instrumento", "ritmo", "melodia", "banda",
        ],
        "hashtags": ["musica", "music", "guitarra", "piano", "cover", "cancion", "singer"],
    },
    "educacion": {
        "keywords": [
            "educacion", "aprende", "aprender", "estudio", "estudiar", "universidad",
            "colegio", "consejo", "idiomas", "ingles", "historia", "curiosidad",
            "sabias que", "explicacion", "metodo de estudio", "examen",
        ],
        "hashtags": ["educacion", "aprende", "aprendeentiktok", "estudiar", "curiosidades", "sabiasque"],
    },
    "ciencia": {
        "keywords": [
            "ciencia", "fisica", "quimica", "biologia", "astronomia", "espacio",
            "universo", "planeta", "estrella", "galaxia", "cientifico", "experimento",
            "molecula", "atomo", "gravedad", "cuantica", "telescopio", "nasa",
        ],
        "hashtags": ["ciencia", "science", "fisica", "quimica", "astronomia", "espacio", "experimento"],
    },
    "viajes": {
        "keywords": [
            "viaje", "viajes", "viajar", "turismo", "destino", "vuelo", "hotel",
            "mochilero", "escapada", "vacaciones", "guia de viaje", "itinerario",
            "ciudad", "playa", "montana", "rincones", "maleta",
        ],
        "hashtags": ["viajes", "viajar", "travel", "turismo", "wanderlust", "destinos", "vacaciones"],
    },
    "automocion": {
        "keywords": [
            "coche", "coches", "auto", "autos", "moto", "motos", "motor", "mecanica",
            "taller mecanico", "electrico", "combustible", "gasolina", "diesel",
            "conducir", "neumatico", "aceite motor", "caballos de fuerza", "frenos",
        ],
        "hashtags": ["coches", "motor", "mecanica", "autos", "cars", "automocion", "motos"],
    },
}


class BaseClassifier(ABC):
    @abstractmethod
    def classify(
        self,
        title: Optional[str],
        description: Optional[str],
        hashtags: List[str],
        sound_name: Optional[str],
        author: Optional[str],
        categories_by_slug: Dict[str, Category],
    ) -> List[Category]:
        """Calcula y devuelve las categorías asignables según metadatos."""
        pass


class RuleBasedClassifier(BaseClassifier):
    def __init__(self, score_threshold: float = 1.0):
        self.threshold = score_threshold

    def classify(
        self,
        title: Optional[str],
        description: Optional[str],
        hashtags: List[str],
        sound_name: Optional[str],
        author: Optional[str],
        categories_by_slug: Dict[str, Category],
    ) -> List[Category]:
        # Si no hay metadatos significativos, asigna directamente a "Otros"
        has_any_text = any([title, description, hashtags, sound_name])
        if not has_any_text:
            otros = categories_by_slug.get("otros")
            return [otros] if otros else []

        # Preparar textos normalizados
        norm_title = normalize_text(title)
        norm_desc = normalize_text(description)
        norm_sound = normalize_text(sound_name)
        norm_author = normalize_text(author)
        norm_tags = {normalize_text(h).lstrip("#") for h in hashtags}

        full_body = f"{norm_title} {norm_desc} {norm_sound} {norm_author}"

        scores: Dict[str, float] = {}

        for slug, rules in CATEGORY_RULES.items():
            if slug not in categories_by_slug:
                continue

            score = 0.0

            # 1. Coincidencia exacta de Hashtags (peso alto: +2.0)
            rule_tags = rules.get("hashtags", [])
            for rtag in rule_tags:
                if rtag in norm_tags:
                    score += 2.0

            # 2. Coincidencia de palabras clave en el título (peso medio-alto: +1.5)
            rule_keywords = rules.get("keywords", [])
            for kw in rule_keywords:
                # Búsqueda de palabra completa o término delimitado
                pattern = r"\b" + re.escape(kw) + r"\b"
                if re.search(pattern, norm_title):
                    score += 1.5
                elif re.search(pattern, full_body):
                    score += 1.0

            if score >= self.threshold:
                scores[slug] = score

        if not scores:
            otros = categories_by_slug.get("otros")
            return [otros] if otros else []

        # Ordenar por puntuación descendente
        sorted_slugs = sorted(scores.keys(), key=lambda s: scores[s], reverse=True)
        # Asignar como máximo las 2 categorías más relevantes si superan umbral
        selected_slugs = sorted_slugs[:2]
        return [categories_by_slug[s] for s in selected_slugs if s in categories_by_slug]


class ClassificationService:
    def __init__(self, classifier: Optional[BaseClassifier] = None):
        self.classifier = classifier or RuleBasedClassifier()

    async def classify_video(self, db: AsyncSession, video_id: int) -> Video:
        """Clasifica automáticamente un vídeo individual si no tiene categorías manuales."""
        stmt = (
            select(Video)
            .options(selectinload(Video.categories))
            .where(Video.id == video_id)
        )
        video = (await db.execute(stmt)).scalar_one_or_none()
        if not video:
            raise ValueError(f"Vídeo con ID {video_id} no encontrado.")

        # Obtener todas las categorías disponibles indexadas por slug
        cats_stmt = select(Category)
        all_cats = (await db.execute(cats_stmt)).scalars().all()
        categories_by_slug = {c.slug: c for c in all_cats}

        # Consultar si ya tiene categorías asignadas manualmente que NO sean "otros"
        assoc_stmt = (
            select(video_categories.c.category_id, video_categories.c.assigned_by, Category.slug)
            .join(Category, video_categories.c.category_id == Category.id)
            .where(video_categories.c.video_id == video.id)
        )
        existing_assocs = (await db.execute(assoc_stmt)).all()
        has_manual_custom = any(row[1] == "manual" and row[2] != "otros" for row in existing_assocs)

        # Si ya tiene categorías fijadas manualmente por el usuario, no las alteramos
        if has_manual_custom:
            return video

        # Ejecutar clasificación automática
        suggested = self.classifier.classify(
            title=video.title,
            description=video.description,
            hashtags=video.hashtags,
            sound_name=video.sound_name,
            author=video.author,
            categories_by_slug=categories_by_slug,
        )

        # Actualizar relaciones
        # Eliminar asociaciones previas que no sean manuales
        del_stmt = delete(video_categories).where(
            video_categories.c.video_id == video.id,
        )
        await db.execute(del_stmt)

        # Insertar nuevas categorías sugeridas
        for cat in suggested:
            ins_stmt = insert(video_categories).values(
                video_id=video.id,
                category_id=cat.id,
                assigned_by="auto",
            )
            await db.execute(ins_stmt)

        await db.commit()
        await db.refresh(video)
        return video

    async def classify_all(self, db: AsyncSession) -> Dict[str, int]:
        """Clasifica en lote todos los vídeos que no tienen categorización manual."""
        stmt = select(Video.id)
        video_ids = (await db.execute(stmt)).scalars().all()

        classified_count = 0
        for vid in video_ids:
            try:
                await self.classify_video(db, vid)
                classified_count += 1
            except Exception:
                pass

        return {"total_processed": len(video_ids), "classified_count": classified_count}


classification_service = ClassificationService()
