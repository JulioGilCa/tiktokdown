# TikTok Library — Arquitectura

Aplicación web **privada y autoalojada** para gestionar una biblioteca personal de
vídeos de TikTok (Me gusta y Favoritos): importación, descarga (cuando esté
permitida), clasificación, organización y reproducción.

---

## 1. Visión general

```
┌─────────────────────────┐        ┌──────────────────────────────────────────┐
│  Navegador              │        │  Backend (FastAPI)                       │
│  React + TS + Vite      │  /api  │                                          │
│  Tailwind, TanStack Q.  │───────▶│  api/  ──▶ services/ ──▶ models/ (ORM)   │
│  Zustand (estado UI)    │ cookie │                │             │           │
└─────────────────────────┘ HttpOnly│                ▼             ▼           │
            ▲                       │          workers/ (cola)   SQLite/PG    │
            │ mismo origen          │                │                         │
   ┌────────┴────────┐              │                ▼                         │
   │ Proxy (Vite dev │              │   Almacenamiento multimedia (local/NAS)  │
   │ / Nginx prod)   │              └──────────────────────────────────────────┘
   └─────────────────┘                               │
                                                     ▼
                                     TikTok Login Kit / Data Portability API
```

### Principios

1. **Mismo origen**: el frontend y la API se sirven bajo el mismo host
   (`/` y `/api`). En desarrollo lo resuelve el proxy de Vite; en producción,
   Nginx. Esto permite cookies `SameSite` restrictivas y evita configurar CORS abierto.
2. **El navegador nunca ve tokens de TikTok**. Solo recibe una cookie de
   sesión opaca (`HttpOnly`, `Secure`, `SameSite`).
3. **Separación estricta** entre: datos de sesión · tokens de autorización ·
   archivos multimedia. Cerrar sesión borra los dos primeros, nunca los archivos.
4. **Integraciones honestas**: cualquier funcionalidad que dependa de una
   aprobación externa (TikTok) queda preparada y marcada como tal; nada se simula
   sin indicarlo explícitamente.
5. **Capas sustituibles**: proveedor TikTok, clasificador, cola de tareas y
   almacenamiento se definen como interfaces para poder cambiar la implementación.

---

## 2. Frontend

| Pieza            | Elección                     | Motivo                                              |
|------------------|------------------------------|-----------------------------------------------------|
| Build            | Vite                         | Arranque y HMR rápidos, proxy integrado             |
| UI               | React 18 + TypeScript        | Tipado estricto, ecosistema                         |
| Estilos          | Tailwind CSS v4 (`@theme`)   | Tokens de diseño centralizados en CSS               |
| Iconos           | lucide-react                 | Consistentes y ligeros                              |
| Rutas            | React Router                 | Layout anidado con sidebar persistente              |
| Datos servidor   | TanStack Query               | Caché, reintentos, invalidación, polling de descargas |
| Estado UI        | Zustand                      | Solo estado de cliente (sidebar, vista grid/lista)  |

**Nunca** se guardan credenciales en `localStorage`/`sessionStorage`. Zustand
solo persiste preferencias visuales no sensibles.

```
frontend/src/
  components/
    layout/     AppLayout, Sidebar, Header
    ui/         Button, Card, Badge, StatCard, EmptyState, ...
  pages/        Una página por ruta
  lib/          cliente API, utilidades
  store/        stores Zustand
  types/        tipos de dominio compartidos
```

### Sistema de diseño

| Token          | Valor     | Uso                        |
|----------------|-----------|----------------------------|
| `bg`           | `#111318` | Fondo principal            |
| `panel`        | `#1B1F27` | Paneles, tarjetas, sidebar |
| `surface`      | `#252B35` | Elementos secundarios      |
| `accent`       | `#7C5CFC` | Acción principal           |
| `fg`           | `#FFFFFF` | Texto principal            |
| `muted`        | `#A0A7B4` | Texto secundario           |

Definidos en `src/index.css` mediante `@theme`, generando clases como
`bg-panel`, `text-muted`, `bg-accent`.

---

## 3. Backend

| Pieza        | Elección                                     |
|--------------|----------------------------------------------|
| Framework    | FastAPI (OpenAPI/Swagger en `/api/docs`)      |
| Validación   | Pydantic v2 + pydantic-settings (`.env`)     |
| ORM          | SQLAlchemy 2.0 (async) + Alembic             |
| BD           | SQLite (aiosqlite) → PostgreSQL (asyncpg)    |
| HTTP saliente| httpx (async)                                |
| Cifrado      | `cryptography` (Fernet) para tokens en reposo |

```
backend/app/
  main.py          creación de la app, routers, middlewares
  config.py        Settings (pydantic-settings)
  database.py      engine/session async
  api/             routers REST (auth, tiktok, videos, downloads, ...)
  models/          modelos SQLAlchemy
  schemas/         modelos Pydantic de entrada/salida
  services/        lógica de negocio (sin dependencias HTTP)
  workers/         cola de tareas en segundo plano
  utils/           seguridad, cifrado, helpers
```

**Regla de capas**: `api → services → models`. Los routers no contienen lógica
de negocio; los servicios no conocen FastAPI.

### Tareas asíncronas

Fase inicial: **cola persistida en base de datos + workers asyncio en el mismo
proceso** (sin Redis). La tabla `downloads` actúa como cola; al reiniciar, los
trabajos pendientes se reanudan. Concurrencia configurable con un semáforo.
La interfaz `TaskQueue` permite migrar a ARQ/Celery + Redis si fuese necesario.

---

## 4. Autenticación y seguridad

### Flujo OAuth 2.0 (TikTok Login Kit, con PKCE)

```
Usuario ─▶ GET /api/auth/tiktok/login
            backend genera state + code_verifier (guardados en sesión pre-auth)
         ◀─ 302 a https://www.tiktok.com/v2/auth/authorize/...
Usuario inicia sesión EN TIKTOK y autoriza
TikTok ─▶ GET /api/auth/tiktok/callback?code=...&state=...
            backend valida state, intercambia code por tokens (client_secret
            solo en servidor), cifra tokens, crea sesión
         ◀─ 302 a / con cookie de sesión HttpOnly
```

| Requisito                     | Implementación                                                    |
|-------------------------------|-------------------------------------------------------------------|
| Sin contraseñas de TikTok     | Solo OAuth; la app nunca ve credenciales                          |
| Client Secret                 | Únicamente en `.env` del backend                                  |
| Tokens                        | Cifrados con Fernet (`TOKEN_ENCRYPTION_KEY`), nunca enviados al navegador |
| Cookies                       | `HttpOnly`, `Secure` (configurable en dev), `SameSite=Lax` en la cookie de sesión (necesario para el retorno OAuth) |
| CSRF                          | Double-submit: cookie `csrf_token` legible + cabecera `X-CSRF-Token` en métodos mutables |
| XSS                           | React escapa por defecto; prohibido `dangerouslySetInnerHTML`; cabeceras CSP |
| Logs                          | Filtro de logging que enmascara tokens/códigos                    |
| Sesión temporal               | Expiración configurable (`SESSION_TTL_MINUTES`)                   |
| Logout                        | Borra sesión y tokens (según política); limpia cookies con `Clear-Site-Data` |
| Sesión de trabajo persistente | Opción explícita del usuario para mantener tokens mientras haya descargas en curso |

---

## 5. Integración con TikTok

Capa `services/tiktok_service.py` con un `TikTokProvider` abstracto:

| Proveedor                    | Estado esperado                                            |
|------------------------------|------------------------------------------------------------|
| `DataPortabilityProvider`    | Requiere app aprobada por TikTok con scopes `portability.*`. Se deja implementado según la documentación oficial; **no funcionará hasta obtener aprobación**. |
| `ManualZipImporter`          | Funciona siempre: procesa el ZIP de "Descargar tus datos" de TikTok. |

> [!IMPORTANT]
> El Login Kit básico (`user.info.basic`) **no** da acceso a likes ni favoritos.
> Esos datos solo llegan vía Data Portability API (con aprobación) o vía el ZIP
> exportado manualmente por el usuario. Por eso la importación ZIP es la vía
> principal mientras no exista aprobación.

### Estados de disponibilidad de un vídeo

`downloadable` · `link_only` · `private` · `deleted` · `error`.
No se emplean técnicas para eludir privacidad, DRM o controles de acceso.

---

## 6. Descargas

- Cola con estados: `pending`, `processing`, `downloading`, `completed`,
  `error`, `unavailable`, `cancelled`.
- Concurrencia configurable, reintentos con backoff exponencial.
- Deduplicación por `tiktok_id` (único) y hash SHA-256 del archivo.
- Progreso individual (bytes) y global.
- La estrategia concreta de obtención del archivo se define en la Fase 6 tras
  analizar qué permite cada fuente (ver decisiones pendientes).

---

## 7. Clasificación

Interfaz `Classifier.classify(video) -> list[CategorySuggestion]`.

1. **`RuleBasedClassifier`** (inicial): reglas por palabras clave y hashtags,
   configurables por categoría, con puntuación y umbral.
2. **`AIClassifier`** (futuro): mismo contrato; puede usar un LLM o un modelo
   local. Se puede encadenar con el de reglas.

Si no hay metadatos suficientes → categoría `Otros`. Nunca se inventa información.
Las asignaciones guardan su origen (`auto` / `manual`) para no sobrescribir
decisiones del usuario.

---

## 8. Almacenamiento

```
<STORAGE_ROOT>/                 (local o montaje NAS Synology: NFS/SMB)
  videos/<Categoria-principal>/<tiktok_id>.mp4
  thumbnails/<tiktok_id>.jpg
```

- El archivo se guarda **una sola vez** en la carpeta de su categoría principal.
- Las categorías adicionales son relaciones en BD (sin duplicar archivos).
- Base de datos fuera de `STORAGE_ROOT` (independiente del multimedia).
- Streaming con soporte `Range` para el reproductor.

---

## 9. Modelo de datos (resumen)

`users`, `videos` (`tiktok_id` único), `categories` (`name` único),
`video_categories` (PK compuesta + `source`), `video_interactions`
(único `video_id + interaction_type`), `downloads`, `settings` (`key` único),
`sessions`, `oauth_tokens` (cifrados). Detalle en la Fase 3.

---

## 10. Despliegue

Docker Compose con `frontend` (Nginx sirviendo el build + proxy `/api`) y
`backend` (Uvicorn). Volúmenes: `data/` (BD) y `media/` (puede ser un montaje
del NAS). Válido para Ubuntu, Proxmox (VM/LXC), cualquier host Docker o equipo
doméstico.

---

## 11. Fases

| Fase | Contenido                                  | Estado      |
|------|--------------------------------------------|-------------|
| 1    | Arquitectura, estructura, diseño visual    | ✅ Completada |
| 2    | Dashboard y explorador con datos de prueba | ✅ Completada |
| 3    | Base de datos y API REST                   | ✅ Completada |
| 4    | Importación ZIP de TikTok                  | ✅ Completada |
| 5    | TikTok Data Portability API                | ✅ Completada |
| 6    | Sistema de descargas                       | ✅ Completada |
| 7    | Clasificación automática                   | ✅ Completada |
| 8    | Almacenamiento y reproducción              | ✅ Completada |
| 9    | Docker, pruebas y seguridad                | ✅ Completada |
