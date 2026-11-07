import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface MenuItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
  hint?: string
}

interface MenuProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
}

/** Menú desplegable simple con cierre al hacer clic fuera o pulsar Escape. */
export function Menu({ trigger, items, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open })}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-30 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-2xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map(({ label, icon: Icon, onSelect, disabled, danger, hint }) => (
            <button
              key={label}
              role="menuitem"
              disabled={disabled}
              title={hint}
              onClick={() => {
                setOpen(false)
                onSelect()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

