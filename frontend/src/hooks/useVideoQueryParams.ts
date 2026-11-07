import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { VideoQuery, VideoSort } from '@/services'

const SORTS: VideoSort[] = [
  'imported_desc',
  'imported_asc',
  'published_desc',
  'published_asc',
  'title_asc',
  'title_desc',
  'category_asc',
]

export type FilterKey = 'q' | 'category' | 'author' | 'downloaded' | 'fav' | 'from' | 'to' | 'sort' | 'page' | 'interaction'

/**
 * Filtros del explorador guardados en la URL: se pueden compartir, sobreviven
 * a recargas y funcionan con los botones atrás/adelante del navegador.
 */
export function useVideoQueryParams(fixedInteraction?: 'like' | 'favorite') {
  const [params, setParams] = useSearchParams()

  const query = useMemo<VideoQuery>(() => {
    const sort = params.get('sort') as VideoSort | null
    const downloaded = params.get('downloaded')
    const interaction = fixedInteraction ?? params.get('interaction')
    return {
      q: params.get('q') || undefined,
      category: params.get('category') || undefined,
      author: params.get('author') || undefined,
      downloaded: downloaded === 'yes' || downloaded === 'no' ? downloaded : undefined,
      internalFavorite: params.get('fav') === '1' || undefined,
      dateFrom: params.get('from') || undefined,
      dateTo: params.get('to') || undefined,
      interaction: interaction === 'like' || interaction === 'favorite' ? interaction : undefined,
      sort: sort && SORTS.includes(sort) ? sort : 'imported_desc',
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize: 24,
    }
  }, [params, fixedInteraction])

  /** Actualiza uno o varios filtros; cualquier cambio de filtro vuelve a la página 1. */
  const setFilters = useCallback(
    (patch: Partial<Record<FilterKey, string | undefined>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v)
            else next.delete(k)
          }
          if (!('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clearFilters = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams()
      const sort = prev.get('sort')
      if (sort) next.set('sort', sort)
      return next
    })
  }, [setParams])

  const activeFilterCount = [
    query.category,
    query.author,
    query.downloaded,
    query.internalFavorite,
    query.dateFrom,
    query.dateTo,
    fixedInteraction ? undefined : query.interaction,
  ].filter(Boolean).length

  return { query, setFilters, clearFilters, activeFilterCount }
}

