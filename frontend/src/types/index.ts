/** Tipos de dominio compartidos por el frontend (alineados con el modelo de datos). */

export type DownloadStatus =
  | 'pending'
  | 'processing'
  | 'downloading'
  | 'completed'
  | 'error'
  | 'unavailable'
  | 'cancelled'

/** Disponibilidad real del vídeo en origen. */
export type Availability = 'downloadable' | 'link_only' | 'private' | 'deleted' | 'error' | 'unknown'

export type InteractionType = 'like' | 'favorite'

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  /** Color hexadecimal usado en la interfaz. */
  color: string
}

export interface CategoryWithCount extends Category {
  videoCount: number
}

export interface Video {
  id: number
  tiktokId: string
  originalUrl: string
  title: string | null
  description: string | null
  author: string | null
  thumbnail: string | null
  /** Duración en segundos, si se conoce. */
  duration: number | null
  publishedAt: string | null
  importedAt: string
  hashtags: string[]
  soundName: string | null
  localPath: string | null
  fileSize: number | null
  availability: Availability
  downloadStatus: DownloadStatus | null
  interactions: InteractionType[]
  categories: Category[]
  /** Favorito dentro de esta aplicación (independiente de TikTok). */
  internalFavorite: boolean
}

export interface DownloadItem {
  id: number
  videoId: number
  videoTitle: string | null
  author: string | null
  status: DownloadStatus
  /** 0-100 */
  progress: number
  fileSize: number | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
}

export type ActivityKind = 'import' | 'download_completed' | 'download_error' | 'classification'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  message: string
  at: string
}
