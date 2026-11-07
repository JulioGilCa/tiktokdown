import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { Video } from '@/types'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useCategories, useUpdateCategories } from '@/hooks/useLibrary'
import { cn } from '@/lib/cn'

/** Asignación manual de una o varias categorías a un vídeo. */
export function CategoryEditorDialog({ video, onClose }: { video: Video | null; onClose: () => void }) {
  const categories = useCategories()
  const update = useUpdateCategories()
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    if (video) setSelected(video.categories.map((c) => c.id))
  }, [video])

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Dialog
      open={video != null}
      onClose={onClose}
      title="Editar categorías"
      description={video?.title ?? 'Sin título'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() =>
              video &&
              update.mutate({ videoId: video.id, categoryIds: selected }, { onSuccess: onClose })
            }
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-xs text-muted">
        Puedes seleccionar varias. Si no eliges ninguna, el vídeo se asignará a «Otros».
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.data?.map((c) => {
          const active = selected.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                active ? 'border-accent bg-accent-soft' : 'border-line bg-surface/40 hover:bg-surface',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="flex-1 truncate">{c.name}</span>
              {active && <Check className="h-4 w-4 text-accent-hover" />}
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}

