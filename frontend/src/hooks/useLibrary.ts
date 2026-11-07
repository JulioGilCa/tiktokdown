import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataService, type VideoQuery } from '@/services'
import { toast } from '@/store/toastStore'

/** Claves de caché centralizadas. */
export const qk = {
  videos: (q: VideoQuery) => ['videos', q] as const,
  video: (id: number) => ['video', id] as const,
  categories: ['categories'] as const,
  authors: ['authors'] as const,
  dashboard: ['dashboard'] as const,
  downloads: ['downloads'] as const,
}

export function useVideos(query: VideoQuery) {
  return useQuery({
    queryKey: qk.videos(query),
    queryFn: () => dataService.listVideos(query),
    placeholderData: keepPreviousData,
  })
}

export function useVideo(id: number | null) {
  return useQuery({
    queryKey: qk.video(id ?? 0),
    queryFn: () => dataService.getVideo(id!),
    enabled: id != null,
  })
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: () => dataService.listCategories() })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cat: { name: string; description?: string; color?: string }) =>
      dataService.createCategory(cat),
    onSuccess: () => {
      toast.success('Categoría creada exitosamente')
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => toast.error('No se pudo crear la categoría', errorMessage(e)),
  })
}

export function useAuthors() {
  return useQuery({ queryKey: qk.authors, queryFn: () => dataService.listAuthors() })
}

export function useDashboardStats() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => dataService.getDashboardStats() })
}

export function useDownloads() {
  return useQuery({
    queryKey: qk.downloads,
    queryFn: () => dataService.listDownloads(),
    refetchInterval: (query) => {
      const active = query.state.data?.some(
        (d) => d.status === 'downloading' || d.status === 'processing' || d.status === 'pending'
      )
      return active ? 2500 : false
    },
  })
}

export function useRetryDownload() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (id: number) => dataService.retryDownload(id),
    onSuccess: () => {
      toast.info('Descarga reanudada')
      return invalidate()
    },
    onError: (e) => toast.error('Error al reintentar descarga', errorMessage(e)),
  })
}

export function useCancelDownload() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (id: number) => dataService.cancelDownload(id),
    onSuccess: () => {
      toast.warning('Descarga cancelada')
      return invalidate()
    },
    onError: (e) => toast.error('Error al cancelar descarga', errorMessage(e)),
  })
}

export function useStartAllDownloads() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: () => dataService.startAllDownloads(),
    onSuccess: (res) => {
      toast.success('Descargas encoladas', `${res.enqueued} vídeos añadidos a la cola de descargas.`)
      return invalidate()
    },
    onError: (e) => toast.error('Error al encolar descargas', errorMessage(e)),
  })
}

/** Invalida todo lo que depende del estado de los vídeos tras una mutación. */
function useInvalidateLibrary() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['videos', 'video', 'categories', 'dashboard', 'downloads'].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Inténtalo de nuevo.'
}

export function useUpdateCategories() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: ({ videoId, categoryIds }: { videoId: number; categoryIds: number[] }) =>
      dataService.updateVideoCategories(videoId, categoryIds),
    onSuccess: () => {
      toast.success('Categorías actualizadas')
      return invalidate()
    },
    onError: (e) => toast.error('No se pudieron guardar las categorías', errorMessage(e)),
  })
}

export function useClassifyVideo() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (videoId: number) => dataService.classifyVideo(videoId),
    onSuccess: (video) => {
      const catNames = video.categories.map((c) => c.name).join(', ')
      toast.success('Vídeo clasificado automáticamente', `Categorías asignadas: ${catNames}`)
      return invalidate()
    },
    onError: (e) => toast.error('Error al clasificar el vídeo', errorMessage(e)),
  })
}

export function useClassifyAllVideos() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: () => dataService.classifyAllVideos(),
    onSuccess: (res) => {
      toast.success(
        'Clasificación automática completada',
        `Se han procesado ${res.total_processed} vídeos (${res.classified_count} clasificados).`
      )
      return invalidate()
    },
    onError: (e) => toast.error('Error en la clasificación masiva', errorMessage(e)),
  })
}

export function useToggleFavorite() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (videoId: number) => dataService.toggleInternalFavorite(videoId),
    onSuccess: (v) => {
      toast.success(v.internalFavorite ? 'Añadido a tus favoritos' : 'Quitado de tus favoritos')
      return invalidate()
    },
    onError: (e) => toast.error('No se pudo actualizar el favorito', errorMessage(e)),
  })
}

export function useRequestDownload() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (videoId: number) => dataService.requestDownload(videoId),
    onSuccess: () => {
      toast.info('Añadido a la cola de descargas')
      return invalidate()
    },
    onError: (e) => toast.error('No se puede descargar', errorMessage(e)),
  })
}

export function useDeleteLocalFile() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (videoId: number) => dataService.deleteLocalFile(videoId),
    onSuccess: () => {
      toast.success('Archivo local eliminado', 'El vídeo sigue en tu biblioteca con su enlace original.')
      return invalidate()
    },
    onError: (e) => toast.error('No se pudo eliminar el archivo', errorMessage(e)),
  })
}

export function useImportTikTokData() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (file: File) => dataService.importTikTokFile(file),
    onSuccess: (res) => {
      toast.success(
        'Importación completada',
        `Se han importado ${res.importedCount} vídeos nuevos y actualizado ${res.updatedCount}.`,
      )
      return invalidate()
    },
    onError: (e) => toast.error('Error al importar el archivo', errorMessage(e)),
  })
}

