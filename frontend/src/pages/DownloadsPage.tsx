import { Download, PlayCircle, RotateCw, XCircle, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge, DOWNLOAD_STATUS_INFO } from '@/components/video/VideoStatusBadge'
import {
  useCancelDownload,
  useDownloads,
  useRetryDownload,
  useStartAllDownloads,
} from '@/hooks/useLibrary'
import { formatBytes, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Vista de la cola de descargas con control de estados, reintentos y cancelaciones.
 */
export function DownloadsPage() {
  const { data, isPending } = useDownloads()
  const retryMut = useRetryDownload()
  const cancelMut = useCancelDownload()
  const startAllMut = useStartAllDownloads()

  const finished =
    data?.filter((d) => ['completed', 'error', 'unavailable', 'cancelled'].includes(d.status))
      .length ?? 0
  const total = data?.length ?? 0
  const pct = total ? Math.round((finished / total) * 100) : 0
  const activeCount =
    data?.filter((d) => d.status === 'downloading' || d.status === 'processing').length ?? 0

  return (
    <>
      <PageHeader
        title="Descargas"
        description="Cola de descargas asíncrona, control de progreso y reintentos."
        actions={
          <Button
            disabled={startAllMut.isPending}
            onClick={() => startAllMut.mutate()}
          >
            {startAllMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Descargar todos los pendientes
          </Button>
        }
      />

      <Card className="mb-6 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Progreso general {activeCount > 0 && <span className="text-accent ml-2">({activeCount} activas)</span>}
          </span>
          <span className="tabular-nums text-muted">
            {finished} / {total} finalizadas
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={Download}
          title="No hay descargas en cola"
          description="Cuando importes vídeos podrás descargar los que estén disponibles y autorizados. Los vídeos privados o eliminados se marcarán como no disponibles."
        />
      ) : (
        <div className="space-y-2">
          {data.map((d) => {
            const info = DOWNLOAD_STATUS_INFO[d.status]
            const canRetry = d.status === 'error' || d.status === 'cancelled'
            const canCancel =
              d.status === 'pending' || d.status === 'downloading' || d.status === 'processing'

            return (
              <div key={d.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', !d.videoTitle && 'italic text-muted')}>
                      {d.videoTitle ?? 'Sin título'}
                    </p>
                    <p className="text-xs text-muted">
                      {d.author ? `@${d.author}` : 'Autor desconocido'}
                      {d.completedAt && ` · ${formatDateTime(d.completedAt)}`}
                      {d.fileSize != null && ` · ${formatBytes(d.fileSize)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge info={info} />

                    {canRetry && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={retryMut.isPending}
                        onClick={() => retryMut.mutate(d.id)}
                        title="Reintentar descarga"
                      >
                        <RotateCw className="h-3.5 w-3.5" /> Reintentar
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={cancelMut.isPending}
                        onClick={() => cancelMut.mutate(d.id)}
                        title="Cancelar descarga"
                        className="text-danger hover:bg-danger/10"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {(d.status === 'downloading' || d.status === 'processing') && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-muted">{d.progress} %</span>
                  </div>
                )}

                {d.errorMessage && <p className="mt-2 text-xs text-danger/90">{d.errorMessage}</p>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
