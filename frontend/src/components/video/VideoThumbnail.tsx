import { Play, ImageOff } from 'lucide-react'
import type { Video } from '@/types'
import { cn } from '@/lib/cn'

/**
 * Miniatura del vídeo. Si no existe imagen (p. ej. datos importados sin
 * miniatura), se dibuja un marcador con el color de la categoría principal
 * en lugar de inventar una imagen.
 */
export function VideoThumbnail({ video, className }: { video: Video; className?: string }) {
  const color = video.categories[0]?.color ?? '#6b7280'

  if (video.thumbnail) {
    return (
      <img
        src={video.thumbnail}
        alt=""
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn('relative flex h-full w-full items-center justify-center overflow-hidden', className)}
      style={{
        background: `radial-gradient(120% 80% at 20% 10%, ${color}55 0%, transparent 60%), linear-gradient(160deg, ${color}33 0%, #1b1f27 70%)`,
      }}
      aria-hidden
    >
      {video.availability === 'private' || video.availability === 'deleted' ? (
        <ImageOff className="h-1/5 w-1/5 max-h-8 max-w-8 text-white/40" />
      ) : (
        <Play className="h-1/5 w-1/5 max-h-8 max-w-8 fill-white/30 text-white/30" />
      )}
    </div>
  )
}

