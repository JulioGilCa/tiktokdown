import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Play, X } from 'lucide-react'
import { NAV_ITEMS } from './navigation'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/cn'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } =
    useUiStore()

  return (
    <>
      {/* Fondo oscuro en móvil al abrir el menú */}
      <div
        aria-hidden
        onClick={() => setMobileSidebarOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          mobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-panel transition-all duration-200',
          'lg:static lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-64 lg:w-[76px]' : 'w-64',
        )}
      >
        {/* Marca */}
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent shadow-[var(--shadow-glow)]">
            <Play className="h-4 w-4 fill-white text-white" />
          </span>
          <span className={cn('font-semibold tracking-tight', sidebarCollapsed && 'lg:hidden')}>
            TikTok Library
          </span>
          <button
            className="ml-auto rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={sidebarCollapsed ? label : undefined}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-fg'
                    : 'text-muted hover:bg-surface hover:text-fg',
                  sidebarCollapsed && 'lg:justify-center lg:px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-accent-hover' : 'text-muted group-hover:text-fg',
                    )}
                  />
                  <span className={cn(sidebarCollapsed && 'lg:hidden')}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Colapsar (solo escritorio) */}
        <div className="hidden border-t border-line p-3 lg:block">
          <button
            onClick={toggleSidebarCollapsed}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg',
              sidebarCollapsed && 'justify-center px-0',
            )}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Contraer</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

