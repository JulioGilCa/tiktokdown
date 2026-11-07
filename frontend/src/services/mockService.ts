/**
 * ⚠️ SIMULACIÓN — implementación en memoria de DataService con datos de prueba.
 * Los cambios (categorías, favoritos, descargas) solo viven en memoria y se
 * pierden al recargar. Se sustituirá por la API real en la Fase 3.
 */

import { createMockDatabase } from '@/mocks/data'
import { normalize, slugify } from '@/lib/format'
import type { Category, CategoryWithCount, DownloadItem, Video } from '@/types'
import type { DashboardStats, DataService, Page, VideoQuery } from './types'

const db = createMockDatabase()

/** Latencia artificial para que la interfaz muestre estados de carga realistas. */
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

const clone = <T,>(v: T): T => structuredClone(v)

function findVideo(id: number): Video {
  const v = db.videos.find((x) => x.id === id)
  if (!v) throw new Error('El vídeo no existe.')
  return v
}

function matchesQuery(v: Video, q: string): boolean {
  const terms = normalize(q).split(/\s+/).filter(Boolean)
  const tags = v.hashtags.map(normalize)
  const haystack = normalize(
    [v.title, v.description, v.author, v.soundName, ...v.hashtags].filter(Boolean).join(' '),
  )
  return terms.every((t) =>
    t.startsWith('#') ? tags.some((h) => h.startsWith(t.slice(1))) : haystack.includes(t),
  )
}

function compareNullable(a: string | null, b: string | null, dir: 1 | -1): number {
  if (a === b) return 0
  if (a == null) return 1 // los nulos siempre al final
  if (b == null) return -1
  return a.localeCompare(b, 'es') * dir
}

function categoryCounts(): CategoryWithCount[] {
  return db.categories.map((c) => ({
    ...c,
    videoCount: db.videos.filter((v) => v.categories.some((vc) => vc.id === c.id)).length,
  }))
}

export const mockService: DataService = {
  async listVideos(query: VideoQuery): Promise<Page<Video>> {
    await delay()
    let items = db.videos.filter((v) => {
      if (query.q && !matchesQuery(v, query.q)) return false
      if (query.interaction && !v.interactions.includes(query.interaction)) return false
      if (query.category && !v.categories.some((c) => c.slug === query.category)) return false
      if (query.author && v.author !== query.author) return false
      if (query.downloaded === 'yes' && v.downloadStatus !== 'completed') return false
      if (query.downloaded === 'no' && v.downloadStatus === 'completed') return false
      if (query.internalFavorite && !v.internalFavorite) return false
      if (query.dateFrom || query.dateTo) {
        if (!v.publishedAt) return false
        const d = v.publishedAt.slice(0, 10)
        if (query.dateFrom && d < query.dateFrom) return false
        if (query.dateTo && d > query.dateTo) return false
      }
      return true
    })

    const sort = query.sort ?? 'imported_desc'
    items = [...items].sort((a, b) => {
      switch (sort) {
        case 'imported_asc':
          return a.importedAt.localeCompare(b.importedAt)
        case 'published_desc':
          return compareNullable(a.publishedAt, b.publishedAt, -1)
        case 'published_asc':
          return compareNullable(a.publishedAt, b.publishedAt, 1)
        case 'title_asc':
          return compareNullable(a.title, b.title, 1)
        case 'title_desc':
          return compareNullable(a.title, b.title, -1)
        case 'category_asc':
          return compareNullable(a.categories[0]?.name ?? null, b.categories[0]?.name ?? null, 1)
        default:
          return b.importedAt.localeCompare(a.importedAt)
      }
    })

    const pageSize = query.pageSize ?? 24
    const page = Math.max(1, query.page ?? 1)
    const start = (page - 1) * pageSize
    return { items: clone(items.slice(start, start + pageSize)), total: items.length, page, pageSize }
  },

  async getVideo(id) {
    await delay(100)
    return clone(findVideo(id))
  },

  async listCategories() {
    await delay(100)
    return categoryCounts()
  },

  async createCategory(cat: { name: string; description?: string; color?: string }) {
    await delay(100)
    const newCat: Category = {
      id: db.categories.length + 1,
      name: cat.name,
      slug: slugify(cat.name),
      description: cat.description || null,
      color: cat.color || '#7C5CFC',
    }
    db.categories.push(newCat)
    return { ...newCat, videoCount: 0 }
  },

  async listAuthors() {
    await delay(50)
    return [...new Set(db.videos.map((v) => v.author).filter((a): a is string => !!a))].sort()
  },

  async getDashboardStats(): Promise<DashboardStats> {
    await delay()
    const v = db.videos
    const d = db.downloads
    const counts = categoryCounts()
    return clone({
      totalVideos: v.length,
      downloaded: v.filter((x) => x.downloadStatus === 'completed').length,
      favorites: v.filter((x) => x.interactions.includes('favorite')).length,
      likes: v.filter((x) => x.interactions.includes('like')).length,
      pendingDownloads: d.filter((x) => ['pending', 'processing', 'downloading'].includes(x.status)).length,
      failedDownloads: d.filter((x) => x.status === 'error').length,
      storageBytes: v.reduce((sum, x) => sum + (x.fileSize ?? 0), 0),
      categoriesCount: db.categories.length,
      recentVideos: [...v].sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 6),
      recentDownloads: d
        .filter((x) => x.completedAt)
        .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
        .slice(0, 5),
      topCategories: counts
        .filter((c) => c.videoCount > 0)
        .sort((a, b) => b.videoCount - a.videoCount)
        .slice(0, 6)
        .map((c) => ({ category: c, count: c.videoCount })),
      activity: [...db.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8),
    })
  },

  async listDownloads(): Promise<DownloadItem[]> {
    await delay()
    const order = ['downloading', 'processing', 'pending', 'error', 'unavailable', 'cancelled', 'completed']
    return clone(
      [...db.downloads].sort(
        (a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.id - a.id,
      ),
    )
  },

  async retryDownload(downloadId: number): Promise<DownloadItem> {
    await delay(100)
    const d = db.downloads.find((x) => x.id === downloadId)
    if (d) {
      d.status = 'pending'
      d.errorMessage = null
      d.progress = 0
    }
    return clone(d!)
  },

  async cancelDownload(downloadId: number): Promise<DownloadItem> {
    await delay(100)
    const d = db.downloads.find((x) => x.id === downloadId)
    if (d) {
      d.status = 'cancelled'
      d.errorMessage = 'Cancelado por el usuario.'
    }
    return clone(d!)
  },

  async startAllDownloads(): Promise<{ enqueued: number }> {
    await delay(150)
    return { enqueued: 5 }
  },

  async updateVideoCategories(videoId, categoryIds) {
    await delay(150)
    const v = findVideo(videoId)
    const selected = db.categories.filter((c) => categoryIds.includes(c.id))
    // Sin categorías → "Otros" (nunca se deja un vídeo sin clasificar).
    v.categories = selected.length ? selected : [db.categories.find((c) => c.slug === 'otros')!]
    return clone(v)
  },

  async classifyVideo(videoId) {
    await delay(200)
    const v = findVideo(videoId)
    return clone(v)
  },

  async classifyAllVideos() {
    await delay(400)
    return { total_processed: db.videos.length, classified_count: db.videos.length }
  },

  async toggleInternalFavorite(videoId) {
    await delay(80)
    const v = findVideo(videoId)
    v.internalFavorite = !v.internalFavorite
    return clone(v)
  },

  async requestDownload(videoId) {
    await delay(150)
    const v = findVideo(videoId)
    if (v.availability !== 'downloadable') {
      throw new Error('Este vídeo no se puede descargar: solo está disponible mediante enlace o no es accesible.')
    }
    if (v.downloadStatus === 'completed') throw new Error('El vídeo ya está descargado.')
    v.downloadStatus = 'pending'
    const existing = db.downloads.find((d) => d.videoId === v.id)
    if (existing) Object.assign(existing, { status: 'pending', progress: 0, errorMessage: null, startedAt: null })
    else
      db.downloads.push({
        id: db.downloads.length + 1,
        videoId: v.id,
        videoTitle: v.title,
        author: v.author,
        status: 'pending',
        progress: 0,
        fileSize: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      })
    return clone(v)
  },

  async deleteLocalFile(videoId) {
    await delay(150)
    const v = findVideo(videoId)
    v.localPath = null
    v.fileSize = null
    v.downloadStatus = null
    db.downloads = db.downloads.filter((d) => d.videoId !== videoId)
    return clone(v)
  },

  async importTikTokFile(_file) {
    await delay(600)
    return {
      totalFound: 10,
      importedCount: 8,
      updatedCount: 2,
      likesCount: 6,
      favoritesCount: 4,
      errors: [],
    }
  },
}

