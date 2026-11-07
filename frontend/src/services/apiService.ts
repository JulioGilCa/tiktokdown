/**
 * Implementación de DataService que se comunica con la API REST real de FastAPI.
 * Transforma las respuestas snake_case del backend a las estructuras camelCase del frontend.
 */

import { api } from '@/lib/api'
import type {
  CategoryWithCount,
  DownloadItem,
  Video,
} from '@/types'
import type { DashboardStats, DataService, ImportResult, Page, VideoQuery } from './types'

// DTOs auxiliares que coinciden con los esquemas Pydantic del backend
interface CategoryDto {
  id: number
  name: string
  slug: string
  description: string | null
  color: string
  video_count?: number
}

interface VideoDto {
  id: number
  tiktok_id: string
  original_url: string
  title: string | null
  description: string | null
  author: string | null
  thumbnail: string | null
  duration: number | null
  published_at: string | null
  imported_at: string
  local_path: string | null
  download_status: string | null
  file_size: number | null
  availability: string
  sound_name: string | null
  hashtags: string[]
  internal_favorite: boolean
  categories: CategoryDto[]
  interactions: string[]
}

interface VideoPageDto {
  items: VideoDto[]
  total: number
  page: number
  page_size: number
}

interface DownloadDto {
  id: number
  video_id: number
  video_title: string | null
  author: string | null
  status: string
  progress: number
  file_size: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

interface DashboardStatsDto {
  total_videos: number
  downloaded: number
  favorites: number
  likes: number
  pending_downloads: number
  failed_downloads: number
  storage_bytes: number
  categories_count: number
  recent_videos: VideoDto[]
  recent_downloads: DownloadDto[]
  top_categories: { category: CategoryDto; count: number }[]
  activity: {
    id: string
    kind: 'import' | 'download_completed' | 'download_error' | 'classification'
    message: string
    at: string
  }[]
}

function mapCategory(dto: CategoryDto): CategoryWithCount {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    color: dto.color,
    videoCount: dto.video_count ?? 0,
  }
}

function mapVideo(dto: VideoDto): Video {
  return {
    id: dto.id,
    tiktokId: dto.tiktok_id,
    originalUrl: dto.original_url,
    title: dto.title,
    description: dto.description,
    author: dto.author,
    thumbnail: dto.thumbnail,
    duration: dto.duration,
    publishedAt: dto.published_at,
    importedAt: dto.imported_at,
    hashtags: dto.hashtags || [],
    soundName: dto.sound_name,
    localPath: dto.local_path,
    fileSize: dto.file_size,
    availability: dto.availability as Video['availability'],
    downloadStatus: (dto.download_status as Video['downloadStatus']) || null,
    interactions: dto.interactions as Video['interactions'],
    categories: (dto.categories || []).map(mapCategory),
    internalFavorite: dto.internal_favorite,
  }
}

function mapDownload(dto: DownloadDto): DownloadItem {
  return {
    id: dto.id,
    videoId: dto.video_id,
    videoTitle: dto.video_title,
    author: dto.author,
    status: dto.status as DownloadItem['status'],
    progress: dto.progress,
    fileSize: dto.file_size,
    errorMessage: dto.error_message,
    startedAt: dto.started_at,
    completedAt: dto.completed_at,
  }
}

export const apiService: DataService = {
  async listVideos(query: VideoQuery): Promise<Page<Video>> {
    const params = new URLSearchParams()
    if (query.q) params.set('q', query.q)
    if (query.interaction) params.set('interaction', query.interaction)
    if (query.category) params.set('category', query.category)
    if (query.author) params.set('author', query.author)
    if (query.downloaded) params.set('downloaded', query.downloaded)
    if (query.internalFavorite !== undefined) params.set('fav', String(query.internalFavorite))
    if (query.dateFrom) params.set('date_from', query.dateFrom)
    if (query.dateTo) params.set('date_to', query.dateTo)
    if (query.sort) params.set('sort', query.sort)
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('page_size', String(query.pageSize))

    const qs = params.toString()
    const endpoint = `/videos${qs ? `?${qs}` : ''}`
    const data = await api<VideoPageDto>(endpoint)

    return {
      items: data.items.map(mapVideo),
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
    }
  },

  async getVideo(id: number): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${id}`)
    return mapVideo(data)
  },

  async listCategories(): Promise<CategoryWithCount[]> {
    const data = await api<CategoryDto[]>('/categories')
    return data.map(mapCategory)
  },

  async createCategory(category: { name: string; description?: string; color?: string }): Promise<CategoryWithCount> {
    const data = await api<CategoryDto>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
    return mapCategory(data)
  },

  async listAuthors(): Promise<string[]> {
    return await api<string[]>('/videos/authors')
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await api<DashboardStatsDto>('/dashboard/stats')
    return {
      totalVideos: data.total_videos,
      downloaded: data.downloaded,
      favorites: data.favorites,
      likes: data.likes,
      pendingDownloads: data.pending_downloads,
      failedDownloads: data.failed_downloads,
      storageBytes: data.storage_bytes,
      categoriesCount: data.categories_count,
      recentVideos: (data.recent_videos || []).map(mapVideo),
      recentDownloads: (data.recent_downloads || []).map(mapDownload),
      topCategories: (data.top_categories || []).map((tc) => ({
        category: mapCategory(tc.category),
        count: tc.count,
      })),
      activity: (data.activity || []).map((a) => ({
        id: a.id,
        kind: a.kind,
        message: a.message,
        at: a.at,
      })),
    }
  },

  async listDownloads(): Promise<DownloadItem[]> {
    const data = await api<DownloadDto[]>('/downloads')
    return data.map(mapDownload)
  },

  async retryDownload(downloadId: number): Promise<DownloadItem> {
    const data = await api<DownloadDto>(`/downloads/${downloadId}/retry`, { method: 'POST' })
    return mapDownload(data)
  },

  async cancelDownload(downloadId: number): Promise<DownloadItem> {
    const data = await api<DownloadDto>(`/downloads/${downloadId}/cancel`, { method: 'POST' })
    return mapDownload(data)
  },

  async startAllDownloads(): Promise<{ enqueued: number }> {
    return await api<{ enqueued: number }>('/downloads/start-all', { method: 'POST' })
  },

  async updateVideoCategories(videoId: number, categoryIds: number[]): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${videoId}/categories`, {
      method: 'PATCH',
      body: JSON.stringify({ category_ids: categoryIds }),
    })
    return mapVideo(data)
  },

  async classifyVideo(videoId: number): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${videoId}/classify`, {
      method: 'POST',
    })
    return mapVideo(data)
  },

  async classifyAllVideos(): Promise<{ total_processed: number; classified_count: number }> {
    return await api<{ total_processed: number; classified_count: number }>('/videos/classify-all', {
      method: 'POST',
    })
  },

  async toggleInternalFavorite(videoId: number): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${videoId}/favorite`, {
      method: 'PATCH',
    })
    return mapVideo(data)
  },

  async requestDownload(videoId: number): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${videoId}/download`, {
      method: 'POST',
    })
    return mapVideo(data)
  },

  async deleteLocalFile(videoId: number): Promise<Video> {
    const data = await api<VideoDto>(`/videos/${videoId}/file`, {
      method: 'DELETE',
    })
    return mapVideo(data)
  },

  async importTikTokFile(file: File): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)

    interface ImportDto {
      total_found: number
      imported_count: number
      updated_count: number
      likes_count: number
      favorites_count: number
      errors: string[]
    }

    const data = await api<ImportDto>('/tiktok/import', {
      method: 'POST',
      body: formData,
    })

    return {
      totalFound: data.total_found,
      importedCount: data.imported_count,
      updatedCount: data.updated_count,
      likesCount: data.likes_count,
      favoritesCount: data.favorites_count,
      errors: data.errors || [],
    }
  },
}
