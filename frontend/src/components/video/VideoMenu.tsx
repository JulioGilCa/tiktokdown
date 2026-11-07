import { Download, ExternalLink, Tags, Info, Trash2, MoreVertical } from 'lucide-react'
import type { Video } from '@/types'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { useVideoActions } from './VideoActions'
import { cn } from '@/lib/cn'

/** Puede pedirse la descarga solo si el origen lo permite y no está ya en curso o completada. */
export function canRequestDownload(v: Video): boolean {
  return (
    v.availability === 'downloadable' &&
    !['completed', 'pending', 'processing', 'downloading'].includes(v.downloadStatus ?? '')
  )
}

export function VideoMenu({ video, className }: { video: Video; className?: string }) {
  const a = useVideoActions()

  const items: MenuItem[] = [
    {
      label: 'Descargar',
      icon: Download,
      onSelect: () => a.download(video),
      disabled: !canRequestDownload(video),
      hint:
        video.availability !== 'downloadable'
          ? 'Este vídeo no se puede descargar'
          : video.downloadStatus === 'completed'
            ? 'Ya está descargado'
            : undefined,
    },
    { label: 'Abrir en TikTok', icon: ExternalLink, onSelect: () => a.openInTikTok(video) },
    { label: 'Editar categorías', icon: Tags, onSelect: () => a.editCategories(video) },
    { label: 'Ver metadatos', icon: Info, onSelect: () => a.openDetails(video) },
    {
      label: 'Eliminar archivo local',
      icon: Trash2,
      onSelect: () => a.confirmDeleteFile(video),
      disabled: !video.localPath,
      danger: true,
    },
  ]

  return (
    <Menu
      items={items}
      trigger={(p) => (
        <button
          {...p}
          aria-label="Más acciones"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg',
            className,
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
    />
  )
}

