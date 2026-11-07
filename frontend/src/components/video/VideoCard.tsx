import { Play, ExternalLink, Star } from 'lucide-react'
import type { Video } from '@/types'
import { formatDate, formatDuration } from '@/lib/format'
import { cn } from '@/lib/cn'
import { VideoThumbnail } from './VideoThumbnail'
import { VideoStatusBadge } from './VideoStatusBadge'
import { CategoryChips } from './CategoryChips'
import { VideoMenu } from './VideoMenu'
import { useVideoActions } from './VideoActions'

function FavoriteButton({ video }: { video: Video }) {
  const a = useVideoActions()
  return (
    <button
      onClick={() => a.toggleFavorite(video)}
      aria-pressed={video.internalFavorite}
      aria-label={video.internalFavorite ? 'Quitar de favoritos internos' : 'Añadir a favoritos internos'}
      title={video.internalFavorite ? 'Quitar de favoritos internos' : 'Añadir a favoritos internos'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface',
        video.internalFavorite ? 'text-warning' : 'text-muted hover:text-fg',
      )}
    >
      <Star className={cn('h-4 w-4', video.internalFavorite && 'fill-warning')} />
    </button>
  )
}

/** Acción principal: reproducir si hay archivo; si no, abrir en TikTok; nunca si es inaccesible. */
function PrimaryOverlay({ video }: { video: Video }) {
  const a = useVideoActions()
  const inaccessible = video.availability === 'private' || video.availability === 'deleted'
  if (inaccessible) return null
  const downloaded = video.downloadStatus === 'completed'
  return (
    <button
      onClick={() => (downloaded ? a.openDetails(video) : a.openInTikTok(video))}
      className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 focus-visible:opacity-100"
      aria-label={downloaded ? 'Reproducir' : 'Abrir en TikTok'}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-[var(--shadow-glow)]">
        {downloaded ? (
          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
        ) : (
          <ExternalLink className="h-5 w-5 text-white" />
        )}
      </span>
    </button>
  )
}

export function VideoCard({ video }: { video: Video }) {
  const a = useVideoActions()
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-accent/40">
      <div className="relative aspect-[9/14] overflow-hidden bg-surface">
        <VideoThumbnail video={video} className="transition-transform duration-300 group-hover:scale-105" />
        <PrimaryOverlay video={video} />
        <div className="pointer-events-none absolute left-2 top-2">
          <VideoStatusBadge video={video} className="bg-black/60 backdrop-blur" />
        </div>
        {video.duration != null && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button onClick={() => a.openDetails(video)} className="text-left">
          <h3 className={cn('line-clamp-2 text-sm font-medium leading-snug', !video.title && 'italic text-muted')}>
            {video.title ?? 'Sin título'}
          </h3>
        </button>
        {video.description && <p className="line-clamp-1 text-xs text-muted">{video.description}</p>}
        <CategoryChips categories={video.categories} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="min-w-0 text-xs text-muted">
            <p className="truncate">{video.author ? `@${video.author}` : 'Autor desconocido'}</p>
            <p>{formatDate(video.publishedAt)}</p>
          </div>
          <div className="flex shrink-0 items-center">
            <FavoriteButton video={video} />
            <VideoMenu video={video} />
          </div>
        </div>
      </div>
    </article>
  )
}

export function VideoListRow({ video }: { video: Video }) {
  const a = useVideoActions()
  return (
    <article className="group flex items-center gap-4 rounded-xl border border-line bg-panel p-3 transition-colors hover:border-accent/40">
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
        <VideoThumbnail video={video} />
        <PrimaryOverlay video={video} />
      </div>

      <div className="min-w-0 flex-1">
        <button onClick={() => a.openDetails(video)} className="block max-w-full text-left">
          <h3 className={cn('truncate text-sm font-medium', !video.title && 'italic text-muted')}>
            {video.title ?? 'Sin título'}
          </h3>
        </button>
        {video.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{video.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{video.author ? `@${video.author}` : 'Autor desconocido'}</span>
          <CategoryChips categories={video.categories} max={3} className="sm:hidden" />
        </div>
      </div>

      <CategoryChips categories={video.categories} max={3} className="hidden w-56 sm:flex" />
      <span className="hidden w-24 text-xs text-muted md:block">{formatDate(video.publishedAt)}</span>
      <span className="hidden w-12 text-xs tabular-nums text-muted lg:block">{formatDuration(video.duration)}</span>
      <VideoStatusBadge video={video} className="hidden shrink-0 md:inline-flex" />

      <div className="flex shrink-0 items-center">
        <FavoriteButton video={video} />
        <VideoMenu video={video} />
      </div>
    </article>
  )
}

