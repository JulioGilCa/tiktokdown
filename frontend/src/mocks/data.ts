/**
 * ============================================================================
 *  ⚠️  DATOS DE PRUEBA — SIMULACIÓN
 * ============================================================================
 *  Este módulo genera una biblioteca FICTICIA para desarrollar y probar la
 *  interfaz (Fase 2). Ningún dato procede de TikTok: autores, identificadores,
 *  URLs y títulos son inventados y los enlaces no apuntan a vídeos reales.
 *
 *  Se activa con VITE_USE_MOCKS (por defecto activo hasta la Fase 3) y se
 *  sustituirá por la API real sin cambiar las páginas.
 * ============================================================================
 */

import type {
  ActivityItem,
  Availability,
  Category,
  DownloadItem,
  DownloadStatus,
  InteractionType,
  Video,
} from '@/types'
import { slugify } from '@/lib/format'

/** Generador pseudoaleatorio con semilla: los datos son estables entre recargas. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface CategorySeed {
  name: string
  color: string
  description: string
  titles: string[]
  hashtags: string[]
}

const CATEGORY_SEEDS: CategorySeed[] = [
  { name: 'Tecnología', color: '#38bdf8', description: 'Gadgets, novedades y reviews.', titles: ['Probando el nuevo móvil plegable', 'Gadgets que no sabías que necesitabas', 'Mi setup de escritorio 2026', 'Review sincera de unos auriculares'], hashtags: ['tecnologia', 'gadgets', 'tech', 'review'] },
  { name: 'Programación', color: '#22c55e', description: 'Código, trucos y desarrollo.', titles: ['3 trucos de Python que te ahorran tiempo', 'React en 60 segundos', 'Cómo funciona Git por dentro', 'Errores típicos en SQL'], hashtags: ['programacion', 'python', 'javascript', 'coding'] },
  { name: 'Inteligencia Artificial', color: '#a855f7', description: 'IA, modelos y herramientas.', titles: ['Automatiza tu trabajo con IA', 'Qué es un modelo de lenguaje', 'Generando imágenes con IA', 'Agentes de IA explicados'], hashtags: ['ia', 'inteligenciaartificial', 'ai', 'machinelearning'] },
  { name: 'Informática', color: '#0ea5e9', description: 'Hardware, sistemas y redes.', titles: ['Monta tu propio PC paso a paso', 'Configurar un NAS en casa', 'Proxmox para principiantes', 'Optimiza Windows en 5 pasos'], hashtags: ['informatica', 'pc', 'homelab', 'nas'] },
  { name: 'Electrónica', color: '#f97316', description: 'Arduino, soldadura y circuitos.', titles: ['Proyecto con Arduino y sensores', 'Aprende a soldar en 1 minuto', 'ESP32 domótica casera', 'Reparando una placa base'], hashtags: ['electronica', 'arduino', 'esp32', 'maker'] },
  { name: 'Bricolaje', color: '#eab308', description: 'Proyectos DIY y reparaciones.', titles: ['Estantería flotante sin tornillos visibles', 'Restaurando un mueble antiguo', 'Herramientas básicas para empezar', 'Arreglar un grifo que gotea'], hashtags: ['bricolaje', 'diy', 'hazlotumismo', 'carpinteria'] },
  { name: 'Hogar', color: '#14b8a6', description: 'Organización y decoración.', titles: ['Organiza tu cocina con poco dinero', 'Ideas para un salón pequeño', 'Limpieza rápida de baño', 'Plantas que no necesitan luz'], hashtags: ['hogar', 'decoracion', 'organizacion', 'home'] },
  { name: 'Cocina', color: '#ef4444', description: 'Recetas y técnicas.', titles: ['Tortilla de patatas perfecta', 'Pasta cremosa en 10 minutos', 'Pan casero sin amasar', 'Postre de 3 ingredientes'], hashtags: ['cocina', 'recetas', 'receta', 'comida'] },
  { name: 'Deportes', color: '#10b981', description: 'Entrenamiento y competición.', titles: ['Rutina de 15 minutos en casa', 'Mejores goles de la jornada', 'Técnica correcta de sentadilla', 'Preparando mi primera maratón'], hashtags: ['deportes', 'fitness', 'futbol', 'running'] },
  { name: 'Humor', color: '#f472b6', description: 'Sketches y comedia.', titles: ['Cuando el lunes llega antes de tiempo', 'Tipos de compañeros de trabajo', 'Mi madre usando el móvil', 'Expectativa vs realidad'], hashtags: ['humor', 'comedia', 'risas', 'meme'] },
  { name: 'Música', color: '#c084fc', description: 'Covers, instrumentos y producción.', titles: ['Cover acústico de un clásico', 'Aprende este acorde de guitarra', 'Produciendo un beat desde cero', 'Piano para principiantes'], hashtags: ['musica', 'guitarra', 'piano', 'cover'] },
  { name: 'Educación', color: '#60a5fa', description: 'Aprendizaje y divulgación.', titles: ['Truco para memorizar cualquier cosa', 'Historia en 1 minuto', 'Aprende inglés con series', 'Matemáticas mentales rápidas'], hashtags: ['educacion', 'aprende', 'estudiar', 'aprendeentiktok'] },
  { name: 'Ciencia', color: '#2dd4bf', description: 'Física, química y espacio.', titles: ['Por qué el cielo es azul', 'Experimento casero de química', 'Cómo funciona un agujero negro', 'El cerebro explicado fácil'], hashtags: ['ciencia', 'fisica', 'espacio', 'science'] },
  { name: 'Viajes', color: '#fb923c', description: 'Destinos y consejos.', titles: ['3 días en Lisboa con poco dinero', 'Pueblos con encanto de España', 'Qué llevar en la mochila', 'Rincones secretos de Roma'], hashtags: ['viajes', 'viajar', 'travel', 'turismo'] },
  { name: 'Automoción', color: '#94a3b8', description: 'Coches, motos y mecánica.', titles: ['Cambiar el aceite tú mismo', 'Probando un coche eléctrico', 'Restauración de un clásico', 'Trucos para ahorrar combustible'], hashtags: ['coches', 'motor', 'mecanica', 'cocheselectricos'] },
  { name: 'Otros', color: '#6b7280', description: 'Vídeos sin categoría clara.', titles: ['Un día cualquiera', 'Momento random del día', 'Esto pasó ayer'], hashtags: ['fyp', 'parati', 'viral'] },
]

const AUTHORS = [
  'techconjavi', 'lauracodea', 'ia.diaria', 'homelab.es', 'makerpablo', 'bricomanu', 'casaordenada',
  'cocinaconana', 'fitconleo', 'risasyrisas', 'notasdemarta', 'profeexpress', 'cienciaenvivo',
  'mochilaalhombro', 'garajeclasico', 'devmiguel', 'electronicafacil', 'chefencasa',
]

const SOUNDS = ['sonido original', 'Lo-fi chill beat', 'Epic cinematic', 'Trending pop 2026', 'Acoustic morning', null]

/** Fecha de referencia fija para que los datos sean estables. */
const REF = new Date('2026-11-06T20:00:00Z').getTime()
const DAY = 86_400_000

function pick<T>(rnd: () => number, items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)]
}

export interface MockDatabase {
  categories: Category[]
  videos: Video[]
  downloads: DownloadItem[]
  activity: ActivityItem[]
}

export function createMockDatabase(count = 72): MockDatabase {
  const rnd = mulberry32(20261107)

  const categories: Category[] = CATEGORY_SEEDS.map((c, i) => ({
    id: i + 1,
    name: c.name,
    slug: slugify(c.name),
    description: c.description,
    color: c.color,
  }))
  const otros = categories[categories.length - 1]

  const videos: Video[] = []
  const downloads: DownloadItem[] = []

  for (let i = 0; i < count; i++) {
    const seedIdx = Math.floor(rnd() * (CATEGORY_SEEDS.length - 1)) // "Otros" se asigna aparte
    const isOther = rnd() < 0.06
    const seed = isOther ? CATEGORY_SEEDS[CATEGORY_SEEDS.length - 1] : CATEGORY_SEEDS[seedIdx]
    const primary = isOther ? otros : categories[seedIdx]

    const cats: Category[] = [primary]
    if (!isOther && rnd() < 0.22) {
      const extra = categories[Math.floor(rnd() * (categories.length - 1))]
      if (extra.id !== primary.id) cats.push(extra)
    }

    // Algunos vídeos sin metadatos: la interfaz no debe inventarlos.
    const missingMeta = rnd() < 0.08
    const title = missingMeta ? null : pick(rnd, seed.titles)
    const author = missingMeta && rnd() < 0.5 ? null : pick(rnd, AUTHORS)
    const hashtags = missingMeta
      ? []
      : Array.from(new Set([pick(rnd, seed.hashtags), pick(rnd, seed.hashtags), rnd() < 0.4 ? 'parati' : seed.hashtags[0]]))
    const description = title ? `${title} ${hashtags.map((h) => `#${h}`).join(' ')}` : null

    // Interacciones: al menos una.
    const interactions: InteractionType[] = []
    const r = rnd()
    if (r < 0.6) interactions.push('like')
    else if (r < 0.85) interactions.push('favorite')
    else interactions.push('like', 'favorite')

    // Disponibilidad en origen.
    const a = rnd()
    const availability: Availability =
      a < 0.74 ? 'downloadable' : a < 0.86 ? 'link_only' : a < 0.93 ? 'private' : 'deleted'

    let downloadStatus: DownloadStatus | null = null
    if (availability === 'private' || availability === 'deleted') downloadStatus = 'unavailable'
    else if (availability === 'downloadable') {
      const d = rnd()
      downloadStatus =
        d < 0.55 ? 'completed' : d < 0.68 ? 'pending' : d < 0.75 ? 'downloading' : d < 0.82 ? 'error' : null
    }

    const id = i + 1
    const tiktokId = `73${(10_000_000_000_000_000 + Math.floor(rnd() * 9e15)).toString().slice(0, 17)}`
    const publishedAt = missingMeta && rnd() < 0.5 ? null : new Date(REF - Math.floor(rnd() * 720) * DAY).toISOString()
    const importedAt = new Date(REF - Math.floor(rnd() * 60 * 24) * 3_600_000).toISOString()
    const duration = rnd() < 0.1 ? null : 8 + Math.floor(rnd() * 170)
    const fileSize = downloadStatus === 'completed' ? Math.floor((2 + rnd() * 38) * 1024 * 1024) : null

    videos.push({
      id,
      tiktokId,
      originalUrl: `https://www.tiktok.com/@${author ?? 'desconocido'}/video/${tiktokId}`,
      title,
      description,
      author,
      thumbnail: null,
      duration,
      publishedAt,
      importedAt,
      hashtags,
      soundName: missingMeta ? null : pick(rnd, SOUNDS),
      localPath: downloadStatus === 'completed' ? `videos/${primary.slug}/${tiktokId}.mp4` : null,
      fileSize,
      availability,
      downloadStatus,
      interactions,
      categories: cats,
      internalFavorite: rnd() < 0.12,
    })

    if (downloadStatus) {
      const startedAt =
        downloadStatus === 'pending' ? null : new Date(new Date(importedAt).getTime() + 60_000).toISOString()
      downloads.push({
        id: downloads.length + 1,
        videoId: id,
        videoTitle: title,
        author,
        status: downloadStatus,
        progress:
          downloadStatus === 'completed' ? 100 : downloadStatus === 'downloading' ? 10 + Math.floor(rnd() * 80) : 0,
        fileSize,
        errorMessage:
          downloadStatus === 'error'
            ? 'Tiempo de espera agotado al contactar con el servidor.'
            : downloadStatus === 'unavailable'
              ? availability === 'private'
                ? 'El vídeo es privado.'
                : 'El vídeo ha sido eliminado.'
              : null,
        startedAt,
        completedAt:
          downloadStatus === 'completed' && startedAt
            ? new Date(new Date(startedAt).getTime() + 20_000).toISOString()
            : null,
      })
    }
  }

  const activity: ActivityItem[] = [
    ...videos.slice(0, 40).map<ActivityItem>((v) => ({
      id: `imp-${v.id}`,
      kind: 'import',
      message: `Importado «${v.title ?? 'Sin título'}»`,
      at: v.importedAt,
    })),
    ...downloads
      .filter((d) => d.status === 'completed' || d.status === 'error')
      .map<ActivityItem>((d) => ({
        id: `dl-${d.id}`,
        kind: d.status === 'completed' ? 'download_completed' : 'download_error',
        message:
          d.status === 'completed'
            ? `Descarga completada: «${d.videoTitle ?? 'Sin título'}»`
            : `Error al descargar «${d.videoTitle ?? 'Sin título'}»`,
        at: d.completedAt ?? d.startedAt ?? new Date(REF).toISOString(),
      })),
  ]

  return { categories, videos, downloads, activity }
}

