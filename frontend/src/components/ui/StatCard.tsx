import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info'
}

const toneClasses = {
  accent: 'bg-accent-soft text-accent-hover',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'accent' }: StatCardProps) {
  return (
    <Card className="p-5 transition-colors hover:border-surface-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

