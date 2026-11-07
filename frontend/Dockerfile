# ==============================================================================
# Frontend Dockerfile - TikTok Library (React + Vite + Nginx)
# Multi-stage build
# ==============================================================================

# --- Etapa 1: Compilación de la aplicación Vite SPA ---
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno en tiempo de compilación (usar backend real)
ENV VITE_USE_MOCKS=false

# Compilar producción (tsc + vite build)
RUN npm run build

# --- Etapa 2: Servidor Web Nginx ligero ---
FROM nginx:1.27-alpine AS runner

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar artefactos compilados desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Healthcheck interno para Nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

