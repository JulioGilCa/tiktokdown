import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Form'
import { useCategories, useClassifyAllVideos, useCreateCategory } from '@/hooks/useLibrary'

const PRESET_COLORS = [
  '#7C5CFC', '#38bdf8', '#22c55e', '#a855f7', '#0ea5e9',
  '#f97316', '#eab308', '#14b8a6', '#ef4444', '#10b981',
  '#f472b6', '#c084fc', '#60a5fa', '#2dd4bf', '#fb923c', '#94a3b8'
]

/**
 * Listado de categorías con recuento de vídeos y creación interactiva.
 */
export function CategoriesPage() {
  const { data, isPending } = useCategories()
  const createMut = useCreateCategory()
  const classifyAllMut = useClassifyAllVideos()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#7C5CFC')

  function handleCreate() {
    if (!name.trim()) return
    createMut.mutate(
      { name: name.trim(), description: description.trim() || undefined, color },
      {
        onSuccess: () => {
          setModalOpen(false)
          setName('')
          setDescription('')
          setColor('#7C5CFC')
        },
      }
    )
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza tus vídeos por temática. Un vídeo puede pertenecer a varias categorías."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={classifyAllMut.isPending}
              onClick={() => classifyAllMut.mutate()}
              title="Clasifica automáticamente todos los vídeos según sus metadatos"
            >
              {classifyAllMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <Sparkles className="h-4 w-4 text-accent" />
              )}
              Auto-clasificar biblioteca
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {isPending
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)
          : data?.map((c) => (
              <Link key={c.id} to={`/videos?category=${c.slug}`}>
                <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    {c.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.description || 'Sin descripción'}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{c.videoCount}</span>
                </Card>
              </Link>
            ))}
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva categoría"
        description="Añade una categoría personalizada para clasificar vídeos."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!name.trim() || createMut.isPending}
              onClick={handleCreate}
            >
              {createMut.isPending ? 'Creando…' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre de la categoría *">
            <Input
              type="text"
              placeholder="Ej. Animación, Finanzas, Mascotas…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Descripción (opcional)">
            <Input
              type="text"
              placeholder="Breve detalle de la temática"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div>
            <span className="text-xs font-medium text-muted">Color temático</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Seleccionar color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  )
}
