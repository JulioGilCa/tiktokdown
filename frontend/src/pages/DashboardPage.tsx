import { Link } from 'react-router-dom'
import {
  Film,
  DownloadCloud,
  Bookmark,
  Heart,
  Clock,
  AlertTriangle,
  HardDrive,
  FileArchive,
  Tags,
  CheckCircle2,
  XCircle,
  Import,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { VideoThumbnail } from '@/components/video/VideoThumbnail'
import { useVideoActions } from '@/components/video/VideoActions'
import { useDashboardStats } from '@/hooks/useLibrary'
import { formatBytes, formatNumber, formatRelative } from '@/lib/format'
import type { ActivityKind } from '@/types'

const ACTIVITY_ICON: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  import: { icon: Import, className: 'text-info bg-info/15' },
  download_completed: { icon: CheckCircle2, className: 'text-success bg-success/15' },
  download_error: { icon: XCircle, className: 'text-danger bg-danger/15' },
  classification: { icon: Sparkles, className: 'text-accent-hover bg-accent-soft' },
}

function SeeAll({ to }: { to: string }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-xs text-muted hover:text-fg">
      Ver todo <ArrowRight className="h-3 w-3" />
    </Link>
  )
}

/** Dashboard con estadísticas calculadas a partir de la capa de datos. */
export function DashboardPage() {
  const { data: s, isPending } = useDashboardStats()
  const actions = useVideoActions()

  const val = (n: number | undefined) => (n == null ? '—' : formatNumber(n))

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen de tu biblioteca de vídeos de TikTok."
        actions={
          <Link to="/settings">
            <Button>
              <FileArchive className="h-4 w-4" />
              Importar datos
            </Button>
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vídeos importados" value={val(s?.totalVideos)} icon={Film} tone="accent" />
        <StatCard
          label="Descargados"
          value={val(s?.downloaded)}
          icon={DownloadCloud}
          tone="success"
          hint={s && s.totalVideos ? `${Math.round((s.downloaded / s.totalVideos) * 100)} % de la biblioteca` : undefined}
        />
        <StatCard label="Favoritos" value={val(s?.favorites)} icon={Bookmark} tone="info" />
        <StatCard label="Me gusta" value={val(s?.likes)} icon={Heart} tone="danger" />
        <StatCard label="Descargas pendientes" value={val(s?.pendingDownloads)} icon={Clock} tone="warning" />
        <StatCard label="Descargas fallidas" value={val(s?.failedDownloads)} icon={AlertTriangle} tone="danger" />
        <StatCard label="Espacio ocupado" value={s ? formatBytes(s.storageBytes) : '—'} icon={HardDrive} tone="info" />
        <StatCard label="Categorías" value={val(s?.categoriesCount)} icon={Tags} tone="accent" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Últimos vídeos */}
        <Card className="xl:col-span-2">
          <CardHeader title="Últimos vídeos añadidos" action={<SeeAll to="/videos" />} />
          <div className="p-5">
            {isPending ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/14]" />
                ))}
              </div>
            ) : !s?.recentVideos.length ? (
              <EmptyState
                icon={Film}
                title="Tu biblioteca está vacía"
                description="Importa el archivo ZIP con tus datos de TikTok o conecta tu cuenta para empezar."
              />
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {s.recentVideos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => actions.openDetails(v)}
                    className="group text-left"
                    title={v.title ?? 'Sin título'}
                  >
                    <div className="aspect-[9/14] overflow-hidden rounded-xl bg-surface ring-accent/60 transition group-hover:ring-2">
                      <VideoThumbnail video={v} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs">{v.title ?? <em className="text-muted">Sin título</em>}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Categorías más utilizadas */}
        <Card>
          <CardHeader title="Categorías más utilizadas" action={<SeeAll to="/categories" />} />
          <div className="space-y-3 p-5">
            {isPending ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)
            ) : !s?.topCategories.length ? (
              <p className="text-sm text-muted">Aparecerán cuando haya vídeos clasificados.</p>
            ) : (
              s.topCategories.map(({ category, count }) => {
                const pct = Math.round((count / Math.max(1, s.topCategories[0].count)) * 100)
                return (
                  <Link key={category.id} to={`/videos?category=${category.slug}`} className="block group">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="group-hover:text-fg">{category.name}</span>
                      <span className="tabular-nums text-muted">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: category.color }} />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </Card>

        {/* Últimas descargas */}
        <Card className="xl:col-span-2">
          <CardHeader title="Últimas descargas" action={<SeeAll to="/downloads" />} />
          <div className="divide-y divide-line">
            {isPending ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : !s?.recentDownloads.length ? (
              <p className="p-5 text-sm text-muted">Todavía no hay descargas completadas.</p>
            ) : (
              s.recentDownloads.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{d.videoTitle ?? <em className="text-muted">Sin título</em>}</p>
                    <p className="text-xs text-muted">{d.author ? `@${d.author}` : 'Autor desconocido'}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted">{formatBytes(d.fileSize)}</span>
                  <span className="hidden w-28 text-right text-xs text-muted sm:block">
                    {d.completedAt && formatRelative(d.completedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader title="Actividad reciente" />
          <div className="space-y-4 p-5">
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)
            ) : !s?.activity.length ? (
              <p className="text-sm text-muted">Sin actividad registrada.</p>
            ) : (
              s.activity.map((a) => {
                const { icon: Icon, className } = ACTIVITY_ICON[a.kind]
                return (
                  <div key={a.id} className="flex gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm">{a.message}</p>
                      <p className="text-xs text-muted">{formatRelative(a.at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
