# ==============================================================================
# Backend Dockerfile - TikTok Library (FastAPI)
# ==============================================================================
FROM python:3.13-slim AS base

# Evitar escritura de ficheros .pyc y permitir que los logs se emitan sin búfer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalar dependencias mínimas para healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Crear usuario y grupo de sistema sin privilegios
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Crear directorios para persistencia de datos SQLite y ficheros multimedia
RUN mkdir -p /app/data /app/media && \
    chown -R appuser:appuser /app

# Copiar el código fuente de la aplicación
COPY --chown=appuser:appuser app/ ./app/

# Usar usuario no privilegiado
USER appuser

# Exponer el puerto de Uvicorn
EXPOSE 8000

# Healthcheck interno del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/system/health || exit 1

# Comando por defecto
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

