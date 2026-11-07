import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Atajo para lanzar notificaciones desde cualquier parte. */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'success' }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'error' }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'info' }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'warning' }),
}

