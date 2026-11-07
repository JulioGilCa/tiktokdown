import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Video } from '@/types'
import { useDeleteLocalFile, useRequestDownload, useToggleFavorite } from '@/hooks/useLibrary'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { VideoDetailDialog } from './VideoDetailDialog'
import { CategoryEditorDialog } from './CategoryEditorDialog'

interface VideoActions {
  openDetails: (video: Video) => void
  editCategories: (video: Video) => void
  confirmDeleteFile: (video: Video) => void
  download: (video: Video) => void
  toggleFavorite: (video: Video) => void
  openInTikTok: (video: Video) => void
}

const Ctx = createContext<VideoActions | null>(null)

/**
 * Centraliza las acciones sobre vídeos y sus diálogos (detalle, edición de
 * categorías, confirmación de borrado) para reutilizarlos en cualquier página.
 */
export function VideoActionsProvider({ children }: { children: ReactNode }) {
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState<Video | null>(null)

  const { mutate: requestDownload } = useRequestDownload()
  const { mutate: toggleFavorite } = useToggleFavorite()
  const deleteMut = useDeleteLocalFile()

  const openInTikTok = useCallback((video: Video) => {
    // noopener/noreferrer: la pestaña nueva no puede acceder a esta aplicación.
    window.open(video.originalUrl, '_blank', 'noopener,noreferrer')
  }, [])

  const actions = useMemo<VideoActions>(
    () => ({
      openDetails: (v) => setDetailId(v.id),
      editCategories: (v) => setEditing(v),
      confirmDeleteFile: (v) => setDeleting(v),
      download: (v) => requestDownload(v.id),
      toggleFavorite: (v) => toggleFavorite(v.id),
      openInTikTok,
    }),
    [requestDownload, toggleFavorite, openInTikTok],
  )

  return (
    <Ctx.Provider value={actions}>
      {children}

      <VideoDetailDialog videoId={detailId} onClose={() => setDetailId(null)} />

      <CategoryEditorDialog video={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting != null}
        danger
        title="Eliminar archivo local"
        message={`Se borrará el archivo descargado de «${deleting?.title ?? 'Sin título'}». El vídeo seguirá en tu biblioteca con su enlace original de TikTok. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar archivo"
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting && deleteMut.mutate(deleting.id, { onSettled: () => setDeleting(null) })
        }
      />
    </Ctx.Provider>
  )
}

export function useVideoActions(): VideoActions {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useVideoActions debe usarse dentro de VideoActionsProvider')
  return ctx
}
