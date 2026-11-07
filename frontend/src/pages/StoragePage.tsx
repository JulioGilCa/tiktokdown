import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HardDrive, Server, FolderSync, Loader2, CheckCircle2, Film } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { toast } from '@/store/toastStore'

interface CategoryBreakdown {
  category_slug: string
  file_count: number
  size_bytes: number
}

interface StorageDiagnostics {
  storage_root: string
  disk_total_bytes: number
  disk_free_bytes: number
  disk_used_bytes: number
  library_bytes: number
  media_files_count: number
  db_downloaded_count: number
  categories_breakdown: CategoryBreakdown[]
}

export function StoragePage() {
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['storage-info'],
    queryFn: () => api<StorageDiagnostics>('/storage/info'),
  })

  const scanMut = useMutation({
    mutationFn: () => api<{ scanned_files: number; synced_videos: number }>('/storage/scan', { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(
        'Escaneo completado',
        `Se han analizado ${res.scanned_files} archivos en disco y vinculado ${res.synced_videos} vídeos.`
      )
      qc.invalidateQueries({ queryKey: ['storage-info'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['videos'] })
    },
    onError: (e: any) => toast.error('Error al escanear almacenamiento', e.message),
  })

  const total = data?.disk_total_bytes || 1
  const free = data?.disk_free_bytes || 0
  const used = data?.disk_used_bytes || 0
  const library = data?.library_bytes || 0

  const usedPct = Math.min(100, Math.round((used / total) * 100))
  const libraryPct = Math.min(100, Math.round((library / total) * 100))

  return (
    <>
      <PageHeader
        title="Almacenamiento"
        description="Gestión de archivos multimedia, espacio en disco y organización en carpetas (local o NAS Synology)."
        actions={
          <Button
            disabled={scanMut.isPending}
            onClick={() => scanMut.mutate()}
          >
            {scanMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            ) : (
              <FolderSync className="h-4 w-4" />
            )}
            Escanear y sincronizar disco
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Uso de espacio en disco */}
        <Card>
          <CardHeader title="Uso del volumen de almacenamiento" description="Espacio total del disco o carpeta compartida del NAS." />
          <div className="p-5">
            {isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <div className="mb-3 flex justify-between text-sm">
                  <span className="text-muted">
                    Biblioteca de vídeos: <strong className="text-fg">{formatBytes(library)}</strong> ({libraryPct} %)
                  </span>
                  <span className="tabular-nums text-muted">
                    Libre: <strong className="text-success">{formatBytes(free)}</strong> de {formatBytes(total)}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.max(2, usedPct)}%` }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-line bg-surface/30 p-3">
                    <p className="text-xs text-muted">Archivos en disco</p>
                    <p className="text-lg font-bold tabular-nums text-fg">{data?.media_files_count ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/30 p-3">
                    <p className="text-xs text-muted">En base de datos</p>
                    <p className="text-lg font-bold tabular-nums text-fg">{data?.db_downloaded_count ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/30 p-3">
                    <p className="text-xs text-muted">Uso total disco</p>
                    <p className="text-lg font-bold tabular-nums text-fg">{usedPct} %</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Ubicación y NAS Synology */}
        <Card>
          <CardHeader title="Ubicación y configuración NAS" description="Soporta carpetas locales o volúmenes compartidos en red (SMB/NFS)." />
          <div className="space-y-4 p-5 text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/40 px-4 py-3">
              <HardDrive className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-xs text-muted">Ruta absoluta del almacenamiento:</p>
                <code className="text-xs text-fg break-all font-mono">
                  {data?.storage_root || 'STORAGE_ROOT'}
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-4 text-xs text-muted">
              <Server className="h-5 w-5 shrink-0 text-info mt-0.5" />
              <div>
                <p className="font-semibold text-fg">Instalación en Synology NAS o Servidor:</p>
                <p className="mt-1">
                  Puedes montar una carpeta compartida de tu Synology asignando la variable de entorno <code className="text-fg">STORAGE_ROOT=/volume1/TikTokLibrary</code> o mapeando el volumen en Docker.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Los vídeos se organizan automáticamente en subcarpetas por temática sin duplicar archivos.
            </div>
          </div>
        </Card>

        {/* Desglose por carpetas de categorías */}
        <Card className="lg:col-span-2">
          <CardHeader title="Estructura de carpetas por categoría" description="Archivos físicos y tamaño ocupado por cada temática en el disco." />
          <div className="p-5">
            {isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : !data?.categories_breakdown.length ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
                <Film className="mx-auto mb-2 h-8 w-8 text-muted/60" />
                Aún no hay subcarpetas de categorías creadas en disco. Se generarán automáticamente al descargar vídeos.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.categories_breakdown.map((cat) => (
                  <div key={cat.category_slug} className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium">/{cat.category_slug}</p>
                      <p className="text-xs text-muted">{cat.file_count} archivo{cat.file_count === 1 ? '' : 's'}</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted">{formatBytes(cat.size_bytes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
