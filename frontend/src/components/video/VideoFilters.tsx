import { X } from 'lucide-react'
import type { VideoQuery } from '@/services'
import { Field, Input, Select } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { useAuthors, useCategories } from '@/hooks/useLibrary'
import type { FilterKey } from '@/hooks/useVideoQueryParams'

interface VideoFiltersProps {
  query: VideoQuery
  setFilters: (patch: Partial<Record<FilterKey, string | undefined>>) => void
  clearFilters: () => void
  showInteraction: boolean
}

/** Panel de filtros del explorador. */
export function VideoFilters({ query, setFilters, clearFilters, showInteraction }: VideoFiltersProps) {
  const categories = useCategories()
  const authors = useAuthors()

  return (
    <div className="mb-6 rounded-2xl border border-line bg-panel p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Field label="Categoría">
          <Select value={query.category ?? ''} onChange={(e) => setFilters({ category: e.target.value })}>
            <option value="">Todas</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.videoCount})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Autor">
          <Select value={query.author ?? ''} onChange={(e) => setFilters({ author: e.target.value })}>
            <option value="">Todos</option>
            {authors.data?.map((a) => (
              <option key={a} value={a}>
                @{a}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descarga">
          <Select value={query.downloaded ?? ''} onChange={(e) => setFilters({ downloaded: e.target.value })}>
            <option value="">Todos</option>
            <option value="yes">Descargados</option>
            <option value="no">No descargados</option>
          </Select>
        </Field>

        {showInteraction && (
          <Field label="Origen en TikTok">
            <Select value={query.interaction ?? ''} onChange={(e) => setFilters({ interaction: e.target.value })}>
              <option value="">Me gusta y Favoritos</option>
              <option value="like">Solo Me gusta</option>
              <option value="favorite">Solo Favoritos</option>
            </Select>
          </Field>
        )}

        <Field label="Publicado desde">
          <Input type="date" value={query.dateFrom ?? ''} onChange={(e) => setFilters({ from: e.target.value })} />
        </Field>

        <Field label="Publicado hasta">
          <Input type="date" value={query.dateTo ?? ''} onChange={(e) => setFilters({ to: e.target.value })} />
        </Field>

        <div className="flex flex-col justify-end gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!query.internalFavorite}
              onChange={(e) => setFilters({ fav: e.target.checked ? '1' : undefined })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Solo mis favoritos
          </label>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4" /> Limpiar filtros
        </Button>
      </div>
    </div>
  )
}

