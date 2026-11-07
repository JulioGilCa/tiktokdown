import type { Category } from '@/types'
import { cn } from '@/lib/cn'

/** Etiquetas de categoría con su color. */
export function CategoryChips({
  categories,
  max = 2,
  className,
}: {
  categories: Category[]
  max?: number
  className?: string
}) {
  const visible = categories.slice(0, max)
  const rest = categories.length - visible.length
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${c.color}22`, color: c.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
          {c.name}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">+{rest}</span>
      )}
    </div>
  )
}

