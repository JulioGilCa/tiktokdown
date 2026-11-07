import { useEffect, useState } from 'react'
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import { VideoCard, VideoListRow } from '@/components/video/VideoCard'
import { VideoFilters } from '@/components/video/VideoFilters'
import { useVideos } from '@/hooks/useLibrary'
import { useVideoQueryParams } from '@/hooks/useVideoQueryParams'
import { useUiStore } from '@/store/uiStore'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { VideoSort } from '@/services'

interface VideoLibraryPageProps {
  title: string
  description: string
  /** Fija el origen (Me gusta / Favoritos). Sin valor = todos los vídeos. */
  interaction?: 'like' | 'favorite'
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}

const SORT_OPTIONS: { value: VideoSort; label: string }[] = [
  { value: 'imported_desc', label: 'Añadidos recientemente' },
  { value: 'imported_asc', label: 'Añadidos hace más tiempo' },
  { value: 'published_desc', label: 'Publicados recientemente' },
  { value: 'published_asc', label: 'Publicados hace más tiempo' },
  { value: 'title_asc', label: 'Nombre (A-Z)' },
  { value: 'title_desc', label: 'Nombre (Z-A)' },
  { value: 'category_asc', label: 'Categoría' },
]

/** Explorador de vídeos reutilizado por "Todos", "Me gusta" y "Favoritos". */
export function VideoLibraryPage({
  title,
  description,
  interaction,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: VideoLibraryPageProps) {
  const { viewMode, setViewMode } = useUiStore()
  const { query, setFilters, clearFilters, activeFilterCount } = useVideoQueryParams(interaction)
  const [showFilters, setShowFilters] = useState(activeFilterCount > 0)
  const { data, isPending, isError, isPlaceholderData, refetch } = useVideos(query)

  // Búsqueda local con debounce, sincronizada con ?q= (también la usa el buscador global).
  const [search, setSearch] = useState(query.q ?? '')
  useEffect(() => setSearch(query.q ?? ''), [query.q])
  useEffect(() => {
    const t = setTimeout(() => {
      if ((query.q ?? '') !== search.trim()) setFilters({ q: search.trim() || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [search, query.q, setFilters])

  const hasAnyFilter = activeFilterCount > 0 || !!query.q
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const page = query.page ?? 1

  return (
    <>
      <PageHeader
        title={title}
        description={
          data ? `${description} · ${formatNumber(data.total)} vídeo${data.total === 1 ? '' : 's'}` : description
        }
      />

      {/* Barra de herramientas */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar texto, descripción o #hashtag"
            className="pl-9"
            aria-label="Buscar en esta vista"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.sort}
            onChange={(e) => setFilters({ sort: e.target.value })}
            className="w-auto min-w-52"
            aria-label="Ordenar por"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[11px]">{activeFilterCount}</span>
            )}
          </Button>
          <div className="flex rounded-xl border border-line bg-panel p-1" role="group" aria-label="Modo de vista">
            {(
              [
                ['grid', LayoutGrid, 'Cuadrícula'],
                ['list', List, 'Lista'],
              ] as const
            ).map(([mode, Icon, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                aria-label={label}
                title={label}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  viewMode === mode ? 'bg-surface text-fg' : 'text-muted hover:text-fg',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <VideoFilters
          query={query}
          setFilters={setFilters}
          clearFilters={clearFilters}
          showInteraction={!interaction}
        />
      )}

      {/* Contenido */}
      {isPending ? (
        <LoadingGrid list={viewMode === 'list'} />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="No se han podido cargar los vídeos"
          description="Comprueba tu conexión e inténtalo de nuevo."
          action={<Button onClick={() => refetch()}>Reintentar</Button>}
        />
      ) : data.total === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            icon={SearchX}
            title="Ningún vídeo coincide"
            description="Prueba con otros términos de búsqueda o quita algún filtro."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  clearFilters()
                }}
              >
                Limpiar búsqueda y filtros
              </Button>
            }
          />
        ) : (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        )
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {data.items.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data.items.map((v) => (
                <VideoListRow key={v.id} video={v} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Paginación">
              <p className="text-sm text-muted">
                {formatNumber((page - 1) * data.pageSize + 1)}–
                {formatNumber(Math.min(page * data.pageSize, data.total))} de {formatNumber(data.total)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setFilters({ page: String(page - 1) })}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm tabular-nums text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setFilters({ page: String(page + 1) })}
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
    </>
  )
}

function LoadingGrid({ list }: { list: boolean }) {
  if (list)
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
    )
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-panel">
          <Skeleton className="aspect-[9/14] rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
