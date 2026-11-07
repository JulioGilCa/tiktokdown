# TikTok Library

Aplicación web privada y autoalojada para gestionar y organizar tu biblioteca personal de vídeos de TikTok (Me gusta y Favoritos): importación desde exportaciones oficiales (ZIP / JSON), sincronización vía TikTok Login Kit & Data Portability API con PKCE, gestor de descargas con control de concurrencia e integridad SHA-256, categorización automática, almacenamiento compatible con Synology NAS y reproductor HTML5 integrado con streaming HTTP 206 Range.

- **Arquitectura detallada:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Especificación de requisitos:** [prompt.md](prompt.md)

---

## Características principales

1. **Importación flexible y segura:**
   - Ingesta directa de archivos ZIP de descarga de datos de TikTok (protegido contra *Zip Slip*).
   - Compatible con JSON y TXT oficiales de TikTok (detección correcta de *ItemFavoriteList* y *Like List*).
2. **Autenticación oficial TikTok Login Kit & Data Portability API:**
   - Flujo seguro OAuth 2.0 con PKCE (S256).
   - Cifrado simétrico de tokens OAuth en reposo en base de datos mediante Fernet (AES-128-CBC + HMAC-SHA256).
   - Cookies de sesión `HttpOnly` y `SameSite` bajo un mismo origen arquitectónico (Vite proxy en desarrollo, Nginx en producción).
3. **Gestor de descargas:**
   - Cola asíncrona no bloqueante con control de concurrencia configurable (semáforo).
   - Verificación de integridad SHA-256 de archivos descargados.
   - Respeta estrictamente los estados de disponibilidad oficial (`downloadable`, `link_only`, `private`, `deleted`, `error`).
4. **Motor de categorización automática:**
   - Clasificación por reglas basada en puntuación ponderada de palabras clave y hashtags en título y descripción.
   - Preservación de clasificaciones manuales de usuario.
   - Mapeo automático de categorías por defecto (Recetas, Tecnología, Viajes, etc.) y fallback honesto a "Otros".
5. **Almacenamiento y Streaming:**
   - Organización sin duplicación en `<STORAGE_ROOT>/videos/<Categoria>/<video_id>.mp4`.
   - Compatibilidad completa con carpetas locales o volúmenes montados de Synology NAS (NFS / CIFS).
   - Endpoint de streaming con soporte de cabeceras `Range` (HTTP 206 Partial Content).
   - Reproductor de vídeo HTML5 integrado en el diálogo de detalles del explorador.
6. **Despliegue contenerizado con Docker Compose:**
   - Backend Python 3.13 con usuario no privilegiado `appuser`.
   - Frontend compilado con Node 22 servido por Nginx Alpine optimizado para streaming y SPA.

---

## Requisitos del sistema

- **Modo Docker (Recomendado):**
  - Docker Engine 24+ y Docker Compose v2+
- **Modo Desarrollo Local:**
  - Python ≥ 3.11 (3.13 recomendado)
  - Node.js ≥ 20
  - SQLite 3 (o PostgreSQL)

---

## Despliegue con Docker Compose (Producción / Homelab / Synology)

### 1. Configurar variables de entorno

Copia el archivo `.env.example` de la raíz:

```bash
cp .env.example .env
```

Genera una clave de cifrado Fernet para los tokens ejecutando:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Añade en tu archivo `.env`:
```env
PORT=8080
TIKTOK_CLIENT_KEY=tu_client_key_aqui
TIKTOK_CLIENT_SECRET=tu_client_secret_aqui
TIKTOK_REDIRECT_URI=http://localhost:8080/api/auth/tiktok/callback
TOKEN_ENCRYPTION_KEY=tu_clave_fernet_generada_aqui
SESSION_SECRET_KEY=clave_secreta_aleatoria_para_sesiones
```

### 2. Arrancar los contenedores

```bash
docker compose up -d --build
```

Accede a la aplicación en: **`http://localhost:8080`** (o la IP de tu servidor / NAS).

### 3. Integración con Synology NAS

Tienes dos opciones para guardar los vídeos directamente en tu NAS:

#### Opción A: Montaje a nivel de host (Recomendada)
Monta la carpeta compartida de tu Synology en el host Docker (ejemplo en `/mnt/synology/tiktok_media`) y enlázala en `docker-compose.yml`:
```yaml
volumes:
  - ./data:/app/data
  - /mnt/synology/tiktok_media:/app/media
```

#### Opción B: Montaje directo NFS/CIFS en Docker
Usa el archivo incluido `docker-compose.nas.yml`:
```bash
docker compose -f docker-compose.yml -f docker-compose.nas.yml up -d
```
(Edita antes la IP y la ruta de tu Synology en `docker-compose.nas.yml`).

---

## Desarrollo local paso a paso

### Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # Linux/macOS: cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

- Documentación OpenAPI/Swagger: `http://localhost:5173/api/docs` o `http://127.0.0.1:8000/api/docs`
- Ejecutar suite de pruebas: `python -m pytest`

### Frontend (React + Vite + Tailwind CSS v4)

```powershell
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite reenvía automáticamente cualquier petición a `/api` hacia el backend en `http://127.0.0.1:8000`.

Para comprobar la compilación para producción:
```powershell
npm run build
```

---

## Estructura del proyecto

```
tiktokdown/
├── backend/
│   ├── app/
│   │   ├── api/            # Routers FastAPI (videos, categories, downloads, storage, tiktok, auth, etc.)
│   │   ├── models/         # Entidades SQLAlchemy (User, Video, Category, Download, etc.)
│   │   ├── schemas/        # Schemas Pydantic v2 de validación y respuesta
│   │   ├── services/       # Lógica de negocio (import, classification, storage, download, etc.)
│   │   ├── utils/          # Utilidades criptográficas (PKCE, Fernet, seguridad)
│   │   ├── workers/        # Worker de descargas concurrentes
│   │   ├── config.py       # Pydantic Settings
│   │   ├── database.py     # Motor async SQLAlchemy y conexión SQLite WAL
│   │   └── main.py         # App FastAPI y ciclo de vida (lifespan)
│   ├── tests/              # 22 tests unitarios e integrados (pytest)
│   ├── Dockerfile          # Imagen Docker Python 3.13 slim no-root
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes modulares (VideoCard, VideoPlayer, Dialogs, etc.)
│   │   ├── hooks/          # Hooks con TanStack Query (useVideos, useCategories, etc.)
│   │   ├── pages/          # ExplorerPage, DownloadsPage, CategoriesPage, StoragePage, SettingsPage
│   │   ├── services/       # Cliente API REST y tipado de dominio
│   │   └── store/          # Zustand store para preferencias de UI
│   ├── nginx.conf          # Configuración Nginx para producción y Range streaming
│   ├── Dockerfile          # Multi-stage Docker build (Node 22 + Nginx Alpine)
│   └── package.json
├── data/                   # Directorio persistente de base de datos SQLite
├── media/                  # Directorio raíz para archivos multimedia y carátulas
├── docs/                   # Documentación de arquitectura
├── docker-compose.yml      # Despliegue de producción unificado
├── docker-compose.nas.yml  # Configuración opcional para Synology NAS
└── prompt.md               # Especificación metodológica original
```

---

## Auditoría de seguridad y privacidad

- **Sin contraseñas de TikTok:** La aplicación nunca solicita ni almacena credenciales personales de TikTok.
- **Protección de secretos:** Claves de API (`TIKTOK_CLIENT_SECRET`) y claves de cifrado permanecen exclusivamente en el backend y nunca son enviadas al navegador.
- **Cifrado en reposo:** Los tokens OAuth de TikTok se almacenan cifrados con AES-128-CBC + HMAC (`cryptography.fernet`).
- **Aislamiento Docker:** El backend se ejecuta con un usuario de sistema dedicado `appuser` (UID 1000) sin privilegios de root.
- **Transparencia en disponibilidad:** Nunca se eluden DRM ni restricciones privadas; los vídeos se clasifican con total precisión según su estado real de acceso.
