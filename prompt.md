Actúa como un arquitecto de software senior, desarrollador
Full Stack especializado en React, Python, APIs REST,
seguridad web, procesamiento multimedia y diseño UX/UI.

Quiero desarrollar una aplicación web privada para gestionar
mi biblioteca personal de vídeos procedentes de TikTok.

El objetivo es crear una herramienta que permita:

1. Conectar mi cuenta de TikTok de forma segura.
2. Importar mis vídeos marcados con Me gusta.
3. Importar mis vídeos guardados en Favoritos.
4. Descargar los vídeos cuando técnicamente sea posible
   y esté permitido.
5. Clasificar automáticamente los vídeos por temática.
6. Organizar los vídeos en una biblioteca multimedia.
7. Navegar, buscar, filtrar y reproducir los vídeos.
8. Administrar las descargas y los archivos almacenados.

La aplicación debe tener una interfaz moderna, atractiva,
intuitiva y completamente responsive.

==================================================

1. ARQUITECTURA GENERAL
==================================================

Utilizar una arquitectura frontend/backend independiente.

FRONTEND:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Componentes reutilizables.
- Lucide React para iconografía.
- React Router para navegación.
- TanStack Query para gestión de peticiones.
- Zustand para estado global cuando sea necesario.

BACKEND:

- Python.
- FastAPI.
- Pydantic.
- SQLAlchemy.
- SQLite inicialmente.
- PostgreSQL como posibilidad de ampliación.
- API REST.
- Procesamiento asíncrono de tareas.

ALMACENAMIENTO:

- Sistema de archivos local.
- Posibilidad de configurar una carpeta de almacenamiento
  ubicada en un NAS Synology.
- Base de datos independiente de los archivos multimedia.

La arquitectura debe permitir desplegar posteriormente
la aplicación mediante Docker.

==================================================
2. AUTENTICACIÓN Y SEGURIDAD
==================================================

Crear una pantalla de acceso moderna.

IMPORTANTE:
No solicitar ni almacenar directamente la contraseña
de TikTok.

Implementar autenticación mediante el sistema oficial
TikTok Login Kit (OAuth 2.0).

Flujo:

1. El usuario pulsa "Conectar con TikTok".
2. Se redirige al sistema oficial de autenticación.
3. El usuario inicia sesión directamente en TikTok.
4. Autoriza los permisos solicitados.
5. TikTok devuelve el código de autorización.
6. El backend intercambia el código por los tokens.
7. Se inicia una sesión privada en nuestra aplicación.

Requisitos de seguridad:

- Nunca almacenar contraseñas de TikTok.
- Client Secret exclusivamente en backend.
- Tokens protegidos y cifrados cuando corresponda.
- Cookies HttpOnly.
- Cookies Secure.
- Protección SameSite.
- Protección CSRF.
- Protección frente a XSS.
- Validación de todas las peticiones.
- Variables sensibles mediante .env.
- No exponer tokens en el frontend.
- No registrar tokens en logs.

La sesión de usuario debe ser temporal.

Al cerrar sesión:

- Invalidar la sesión.
- Eliminar los datos temporales.
- Eliminar los tokens temporales según la política
  de almacenamiento configurada.
- Limpiar los datos sensibles del navegador.

No utilizar localStorage para almacenar credenciales.

IMPORTANTE:
La aplicación debe distinguir entre:

- Datos de sesión.
- Tokens de autorización.
- Archivos multimedia descargados.

Los archivos descargados no deben eliminarse al cerrar
sesión.

Si se necesita mantener una descarga en segundo plano,
debe existir una opción explícita para autorizar una
sesión de trabajo persistente.

==================================================
3. INTEGRACIÓN CON TIKTOK
==================================================

Implementar una capa independiente para comunicarse
con TikTok.

Priorizar las siguientes alternativas:

A. TikTok Data Portability API.

Solicitar acceso a los permisos necesarios:

- portability.activity.single
- portability.all.single

Evaluar también los permisos ongoing cuando sean
necesarios y hayan sido aprobados.

La aplicación debe poder solicitar los datos disponibles
de las siguientes categorías:

- Likes.
- Vídeos favoritos.
- Historial de visualización.
- Información de vídeos.
- Metadatos asociados.

B. Importación manual.

Implementar una alternativa para importar el archivo
de datos descargado desde TikTok.

Aceptar archivos ZIP y procesar su contenido.

Detectar automáticamente los archivos JSON y demás
formatos relevantes.

Extraer:

- URLs.
- Títulos.
- Fechas.
- Identificadores.
- Información de favoritos.
- Información de likes.
- Categorías disponibles.

La importación manual debe funcionar incluso si
la aplicación todavía no dispone de aprobación
para utilizar la Data Portability API.

IMPORTANTE:

No asumir que todos los enlaces de TikTok permiten
descargar el vídeo.

Diferenciar entre:

- Vídeo descargable.
- Vídeo disponible únicamente mediante enlace.
- Vídeo privado o inaccesible.
- Vídeo eliminado.
- Error de descarga.

No utilizar técnicas para saltarse restricciones
de privacidad, DRM o controles de acceso.

==================================================
4. SISTEMA DE DESCARGAS
==================================================

Crear un administrador de descargas.

Características:

- Descargar vídeos disponibles y autorizados.
- Cola de descargas.
- Descargas concurrentes configurables.
- Reintentos automáticos.
- Control de errores.
- Detección de archivos duplicados.
- Información del progreso.
- Tamaño del archivo.
- Fecha de descarga.
- Estado de cada descarga.

Estados posibles:

- Pendiente.
- Procesando.
- Descargando.
- Completado.
- Error.
- No disponible.
- Cancelado.

Mostrar una barra de progreso general.

También mostrar el progreso individual de cada vídeo.

Cada vídeo debe conservar su URL original de TikTok.

Utilizar un identificador único para evitar duplicados.

==================================================
5. CLASIFICACIÓN AUTOMÁTICA
==================================================

Esta funcionalidad es especialmente importante.

Quiero que la aplicación clasifique automáticamente
los vídeos según sus metadatos.

Utilizar información como:

- Descripción.
- Texto del vídeo.
- Hashtags.
- Nombre del sonido.
- Título.
- Fecha.
- Información disponible del creador.

Crear un sistema de categorías configurable.

Categorías iniciales:

- Tecnología.
- Programación.
- Inteligencia Artificial.
- Informática.
- Electrónica.
- Bricolaje.
- Hogar.
- Cocina.
- Deportes.
- Humor.
- Música.
- Educación.
- Ciencia.
- Viajes.
- Automoción.
- Otros.

El usuario podrá:

- Crear categorías.
- Modificar categorías.
- Eliminar categorías.
- Asignar categorías manualmente.
- Asignar varias categorías a un mismo vídeo.

Implementar inicialmente una clasificación mediante
reglas basadas en palabras clave y hashtags.

Diseñar el sistema para permitir incorporar posteriormente
un modelo de inteligencia artificial que clasifique
automáticamente los vídeos.

No inventar información cuando los metadatos no existan.

==================================================
6. DISEÑO DEL FRONTEND
==================================================

Quiero un diseño moderno y profesional.

Inspiración visual:

- Plex.
- Jellyfin.
- YouTube Studio.
- Aplicaciones multimedia modernas.

Diseño oscuro como tema principal.

Paleta:

- Fondo principal: #111318.
- Paneles: #1B1F27.
- Elementos secundarios: #252B35.
- Color de acción: #7C5CFC.
- Texto principal: #FFFFFF.
- Texto secundario: #A0A7B4.

Utilizar tarjetas con bordes redondeados,
sombras suaves y transiciones discretas.

Diseño responsive para ordenador, tablet y móvil.

ESTRUCTURA PRINCIPAL:

Sidebar lateral:

- Dashboard.
- Todos los vídeos.
- Me gusta.
- Favoritos.
- Categorías.
- Descargas.
- Almacenamiento.
- Configuración.

Cabecera:

- Buscador global.
- Botón de sincronización.
- Indicador de descargas activas.
- Perfil de usuario.

==================================================
7. DASHBOARD
==================================================

Crear una pantalla principal con estadísticas.

Mostrar:

- Total de vídeos importados.
- Total de vídeos descargados.
- Vídeos favoritos.
- Vídeos marcados con Me gusta.
- Descargas pendientes.
- Descargas fallidas.
- Espacio ocupado.

Incluir:

- Últimos vídeos añadidos.
- Últimas descargas.
- Categorías más utilizadas.
- Actividad reciente.

Las estadísticas deben proceder de la base de datos.

==================================================
8. EXPLORADOR MULTIMEDIA
==================================================

Crear un explorador visual de vídeos.

Mostrar los vídeos mediante tarjetas con:

- Miniatura.
- Título.
- Descripción.
- Categoría.
- Fecha.
- Autor.
- Duración, cuando esté disponible.
- Estado de descarga.

Acciones disponibles:

- Reproducir.
- Descargar.
- Abrir en TikTok.
- Añadir a favoritos internos.
- Editar categorías.
- Eliminar archivo local.
- Consultar metadatos.

Implementar dos modos de visualización:

1. Cuadrícula.
2. Lista.

Filtros:

- Categoría.
- Fecha.
- Descargados.
- No descargados.
- Favoritos.
- Me gusta.
- Autor.

Ordenación:

- Fecha de incorporación.
- Fecha del vídeo.
- Nombre.
- Categoría.

Buscador por texto, hashtags y descripción.

==================================================
9. REPRODUCTOR DE VÍDEOS
==================================================

Crear un reproductor integrado.

Características:

- Reproducción MP4.
- Controles estándar.
- Pantalla completa.
- Control de volumen.
- Información del vídeo.
- Categorías asociadas.
- Enlace al vídeo original.

Si el vídeo no está descargado:
mostrar una opción para abrirlo en TikTok.

No intentar reproducir contenido inaccesible.

==================================================
10. GESTIÓN DEL ALMACENAMIENTO
==================================================

Permitir configurar dónde se guardan los vídeos.

Ejemplo:

/TikTokLibrary/
    /Tecnologia/
    /Programacion/
    /Inteligencia-Artificial/
    /Cocina/
    /Bricolaje/
    /Deportes/
    /Otros/

Cada categoría debe poder contener sus vídeos.

Evitar duplicar físicamente un archivo cuando
pertenezca a varias categorías.

Mantener la relación entre archivos y categorías
en la base de datos.

Permitir configurar:

- Ruta de almacenamiento.
- Tamaño máximo.
- Espacio disponible.
- Organización de carpetas.
- Gestión de duplicados.

Contemplar almacenamiento en Synology NAS.

==================================================
11. BASE DE DATOS
==================================================

Diseñar una base de datos relacional.

Entidades principales:

USERS

- id
- username
- created_at

VIDEOS

- id
- tiktok_id
- original_url
- title
- description
- author
- thumbnail
- duration
- published_at
- imported_at
- local_path
- download_status
- file_size

CATEGORIES

- id
- name
- description
- created_at

VIDEO_CATEGORIES

- video_id
- category_id

VIDEO_INTERACTIONS

- id
- video_id
- interaction_type
- created_at

DOWNLOADS

- id
- video_id
- status
- progress
- error_message
- started_at
- completed_at

SETTINGS

- id
- key
- value

Implementar relaciones, índices y restricciones
para evitar registros duplicados.

==================================================
12. BACKEND Y API REST
==================================================

Organizar FastAPI por módulos.

Estructura orientativa:

backend/
    app/
        main.py
        config.py
        database.py

        api/
            auth.py
            tiktok.py
            videos.py
            downloads.py
            categories.py
            storage.py
            settings.py

        models/
        schemas/
        services/
            tiktok_service.py
            import_service.py
            download_service.py
            classification_service.py
            storage_service.py

        workers/
        utils/

    tests/
    requirements.txt
    .env.example

Crear endpoints REST para:

- Autenticación.
- Importación de datos.
- Sincronización.
- Consulta de vídeos.
- Descargas.
- Clasificación.
- Categorías.
- Almacenamiento.
- Configuración.

Documentar los endpoints mediante Swagger.

==================================================
13. EXPERIENCIA DE USUARIO
==================================================

La aplicación debe ser sencilla de utilizar.

Mostrar notificaciones para:

- Importación completada.
- Descarga completada.
- Error de descarga.
- Error de conexión.
- Sincronización finalizada.

Añadir confirmaciones antes de eliminar archivos.

Incluir estados vacíos con instrucciones claras.

Mostrar errores comprensibles para usuarios
que no sean desarrolladores.

==================================================
14. DOCKER Y DESPLIEGUE
==================================================

Preparar:

- Dockerfile frontend.
- Dockerfile backend.
- docker-compose.yml.
- Volúmenes persistentes.
- Variables de entorno.
- Configuración de almacenamiento.

La aplicación debe poder instalarse en:

- Un servidor Ubuntu.
- Proxmox mediante una máquina virtual o LXC.
- Un servidor Docker.
- Un equipo doméstico.

Preparar la arquitectura para utilizar un NAS Synology
como almacenamiento multimedia.

==================================================
15. METODOLOGÍA DE DESARROLLO
==================================================

No generar todo el proyecto de golpe.

Dividir el desarrollo en fases.

FASE 1:
Arquitectura, estructura y diseño visual.

FASE 2:
Dashboard y explorador con datos de prueba.

FASE 3:
Base de datos y API REST.

FASE 4:
Importación de archivos ZIP de TikTok.

FASE 5:
Integración oficial con TikTok Data Portability API.

FASE 6:
Sistema de descargas.

FASE 7:
Clasificación automática.

FASE 8:
Almacenamiento y reproducción.

FASE 9:
Docker, pruebas y seguridad.

Antes de pasar de una fase a otra,
comprobar que la anterior funciona correctamente.

==================================================
16. INSTRUCCIONES FINALES
==================================================

Quiero código limpio, modular y documentado.

No utilizar código ficticio para simular integraciones
reales sin identificarlo claramente como simulación.

No asumir que TikTok concede automáticamente permisos.

Cuando una funcionalidad dependa de una aprobación
externa, dejar preparada su integración y explicar
qué requisitos faltan.

Priorizar la seguridad y la facilidad de mantenimiento.

Explicar las decisiones arquitectónicas.

Proporcionar los archivos completos cuando se
implemente cada funcionalidad.

El resultado debe ser una aplicación funcional,
no solamente una demostración visual.
