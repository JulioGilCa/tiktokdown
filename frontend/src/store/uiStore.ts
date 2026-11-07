import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'grid' | 'list'

interface UiState {
  /** Sidebar desplegada en móvil (no se persiste). */
  mobileSidebarOpen: boolean
  /** Sidebar colapsada en escritorio. */
  sidebarCollapsed: boolean
  viewMode: ViewMode
  setMobileSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setViewMode: (mode: ViewMode) => void
}

/**
 * Estado exclusivamente visual. Solo se persisten preferencias NO sensibles;
 * nunca se guardan aquí credenciales ni datos de sesión.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mobileSidebarOpen: false,
      sidebarCollapsed: false,
      viewMode: 'grid',
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'ttl-ui-prefs',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, viewMode: s.viewMode }),
    },
  ),
)

