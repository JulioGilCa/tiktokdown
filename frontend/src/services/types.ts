/**
 * Contrato de la capa de datos del frontend.
 *
 * Las páginas solo dependen de esta interfaz. En la Fase 2 la implementa un
 * servicio simulado (mockService); en la Fase 3 la implementará el cliente de
 * la API REST sin cambiar las páginas.
 */

import type {
  ActivityItem,
  CategoryWithCount,
  DownloadItem,
  Video,
} from '@/types'

export type VideoSort =
  | 'imported_desc'
  | 'imported_asc'
  | 'published_desc'
  | 'published_asc'
  | 'title_asc'
  | 'title_desc'
  | 'category_asc'

export interface VideoQuery {
  q?: string
  interaction?: 'like' | 'favorite'
  category?: string // slug
  author?: string
  downloaded?: 'yes' | 'no'
  internalFavorite?: boolean
  dateFrom?: string // YYYY-MM-DD (fecha de publicación)
  dateTo?: string
  sort?: VideoSort
  page?: number
  pageSize?: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardStats {
  totalVideos: number
  downloaded: number
  favorites: number
  likes: number
  pendingDownloads: number
  failedDownloads: number
  storageBytes: number
  categoriesCount: number
  recentVideos: Video[]
  recentDownloads: DownloadItem[]
  topCategories: { category: CategoryWithCount; count: number }[]
  activity: ActivityItem[]
}

export interface ImportResult {
  totalFound: number
  importedCount: number
  updatedCount: number
  likesCount: number
  favoritesCount: number
  errors: string[]
}

export interface DataService {
  listVideos(query: VideoQuery): Promise<Page<Video>>
  getVideo(id: number): Promise<Video>
  listCategories(): Promise<CategoryWithCount[]>
  createCategory(category: { name: string; description?: string; color?: string }): Promise<CategoryWithCount>
  listAuthors(): Promise<string[]>
  getDashboardStats(): Promise<DashboardStats>
  listDownloads(): Promise<DownloadItem[]>
  retryDownload(downloadId: number): Promise<DownloadItem>
  cancelDownload(downloadId: number): Promise<DownloadItem>
  startAllDownloads(): Promise<{ enqueued: number }>
  updateVideoCategories(videoId: number, categoryIds: number[]): Promise<Video>
  classifyVideo(videoId: number): Promise<Video>
  classifyAllVideos(): Promise<{ total_processed: number; classified_count: number }>
  toggleInternalFavorite(videoId: number): Promise<Video>
  requestDownload(videoId: number): Promise<Video>
  deleteLocalFile(videoId: number): Promise<Video>
  importTikTokFile(file: File): Promise<ImportResult>
}

