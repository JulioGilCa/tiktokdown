import { ExternalLink, Download, Tags, Trash2, Star, Heart, Bookmark, Ban, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { useClassifyVideo, useVideo } from '@/hooks/useLibrary'
import { formatBytes, formatDate, formatDateTime, formatDuration } from '@/lib/format'
import { VideoThumbnail } from './VideoThumbnail'
import { VideoStatusBadge } from './VideoStatusBadge'
import { CategoryChips } from './CategoryChips'
import { useVideoActions } from './VideoActions'
import { canRequestDownload } from './VideoMenu'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

const missing = <span className="text-muted">No disponible</span>

/** Detalle y metadatos del vídeo. El reproductor real se integra en la Fase 8. */
export function VideoDetailDialog({ videoId, onClose }: { videoId: number | null; onClose: () => void }) {
  const { data: v, isPending } = useVideo(videoId)
  const a = useVideoActions()
  const classifyMut = useClassifyVideo()

  const inaccessible = v && (v.availability === 'private' || v.availability === 'deleted')
  const downloaded = v?.downloadStatus === 'completed'

  return (
    <Dialog open={videoId != null} onClose={onClose} title={v?.title ?? 'Sin título'} size="lg">
      {isPending || !v ? (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <Skeleton className="aspect-[9/16]" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Zona de reproducción */}
          <div>
            <div className="relative mx-auto aspect-[9/16] max-w-[260px] overflow-hidden rounded-xl bg-surface shadow-lg">
              {downloaded ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={`/api/videos/${v.id}/stream`}
                  className="h-full w-full object-cover bg-black"
                />
              ) : (
                <>
                  <VideoThumbnail video={v} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 p-4 text-center">
                    {inaccessible ? (
                      <>
                        <Ban className="h-8 w-8 text-warning" />
                        <p className="text-xs text-muted">Contenido no accesible: no se puede reproducir.</p>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => a.openInTikTok(v)}>
                        <ExternalLink className="h-4 w-4" /> Abrir en TikTok
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {v.interactions.includes('like') && (
                <Badge tone="danger">
                  <Heart className="h-3 w-3" /> Me gusta
                </Badge>
              )}
              {v.interactions.includes('favorite') && (
                <Badge tone="info">
                  <Bookmark className="h-3 w-3" /> Favorito TikTok
                </Badge>
              )}
              <VideoStatusBadge video={v} />
            </div>
          </div>

          {/* Metadatos */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => a.openInTikTok(v)}>
                <ExternalLink className="h-4 w-4" /> Abrir en TikTok
              </Button>
              <Button size="sm" variant="secondary" disabled={!canRequestDownload(v)} onClick={() => a.download(v)}>
                <Download className="h-4 w-4" /> Descargar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => a.editCategories(v)}>
                <Tags className="h-4 w-4" /> Categorías
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={classifyMut.isPending}
                onClick={() => classifyMut.mutate(v.id)}
                title="Clasificar automáticamente según palabras clave y hashtags"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                {classifyMut.isPending ? 'Clasificando…' : 'Auto-clasificar'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => a.toggleFavorite(v)}>
                <Star className={v.internalFavorite ? 'h-4 w-4 fill-warning text-warning' : 'h-4 w-4'} />
                {v.internalFavorite ? 'En favoritos' : 'Favorito'}
              </Button>
              {v.localPath && (
                <Button size="sm" variant="danger" onClick={() => a.confirmDeleteFile(v)}>
                  <Trash2 className="h-4 w-4" /> Eliminar archivo
                </Button>
              )}
            </div>

            <dl className="divide-y divide-line">
              <Row label="Descripción">{v.description ?? missing}</Row>
              <Row label="Autor">{v.author ? `@${v.author}` : missing}</Row>
              <Row label="Categorías">
                <CategoryChips categories={v.categories} max={10} />
              </Row>
              <Row label="Hashtags">
                {v.hashtags.length ? (
                  <span className="text-accent-hover">{v.hashtags.map((h) => `#${h}`).join(' ')}</span>
                ) : (
                  missing
                )}
              </Row>
              <Row label="Sonido">{v.soundName ?? missing}</Row>
              <Row label="Duración">{v.duration != null ? formatDuration(v.duration) : missing}</Row>
              <Row label="Publicado">{v.publishedAt ? formatDate(v.publishedAt) : missing}</Row>
              <Row label="Importado">{formatDateTime(v.importedAt)}</Row>
              <Row label="Tamaño">{v.fileSize != null ? formatBytes(v.fileSize) : missing}</Row>
              <Row label="Archivo local">
                {v.localPath ? <code className="text-xs text-muted">{v.localPath}</code> : missing}
              </Row>
              <Row label="ID TikTok">
                <code className="text-xs text-muted">{v.tiktokId}</code>
              </Row>
              <Row label="URL original">
                <a
                  href={v.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-accent-hover hover:underline"
                >
                  {v.originalUrl}
                </a>
              </Row>
            </dl>
          </div>
        </div>
      )}
    </Dialog>
  )
}

