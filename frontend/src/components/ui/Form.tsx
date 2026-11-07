import { forwardRef, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base =
  'h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-50'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(base, 'pr-8', className)} {...props} />
  },
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, 'placeholder:text-muted/70 [color-scheme:dark]', className)} {...props} />
  },
)

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

