import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Menu, Search, RefreshCw, Download, User, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUiStore } from '@/store/uiStore'
import { useDownloads } from '@/hooks/useLibrary'
import { api } from '@/lib/api'
import { toast } from '@/store/toastStore'

interface AuthMe {
  authenticated: boolean
  username?: string | null
  avatar_url?: string | null
  open_id?: string | null
}

/**
 * Cabecera global: buscador, sincronización con TikTok Data Portability API,
 * indicador de descargas activas y perfil con soporte de cierre de sesión.
 */
export function Header() {
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data: downloads } = useDownloads()
  const qc = useQueryClient()

  const auth = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api<AuthMe>('/auth/me'),
  })

  const syncMut = useMutation({
    mutationFn: () => api<{ success: boolean; error?: string; request_id?: string }>('/tiktok/sync', { method: 'POST' }),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Solicitud enviada a TikTok', `ID de petición: ${data.request_id || 'procesando'}`)
      } else {
        toast.warning('Aviso de TikTok API', data.error || 'Se requieren permisos adicionales de portabilidad.')
      }
    },
    onError: (err: any) => {
      toast.error('Error al sincronizar', err.message || 'Verifica los permisos de la aplicación en TikTok.')
    },
  })

  const logoutMut = useMutation({
    mutationFn: () => api<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-me'] })
      toast.info('Sesión cerrada')
      navigate('/login')
    },
  })

  const activeDownloads =
    downloads?.filter((d) => d.status === 'downloading' || d.status === 'processing').length ?? 0
  const syncAvailable = auth.data?.authenticated ?? false

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/videos?q=${encodeURIComponent(q)}` : '/videos')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <form onSubmit={onSearch} className="relative max-w-xl flex-1" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, descripción o #hashtag…"
          className="h-10 w-full rounded-xl border border-line bg-panel pl-10 pr-4 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none"
          aria-label="Buscar vídeos"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          variant="secondary"
          size="md"
          disabled={!syncAvailable || syncMut.isPending}
          onClick={() => syncMut.mutate()}
          title={
            syncAvailable
              ? 'Sincronizar datos con TikTok Data Portability API'
              : 'Inicia sesión con TikTok para sincronizar'
          }
          className="hidden sm:inline-flex"
        >
          {syncMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden md:inline">Sincronizar</span>
        </Button>

        <Link
          to="/downloads"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-fg"
          aria-label={`Descargas activas: ${activeDownloads}`}
          title={activeDownloads > 0 ? `${activeDownloads} descarga(s) activa(s)` : 'Descargas'}
        >
          <Download className="h-5 w-5" />
          {activeDownloads > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white animate-pulse">
              {activeDownloads}
            </span>
          )}
        </Link>

        {auth.data?.authenticated ? (
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="flex h-10 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-surface"
              title={`Conectado como ${auth.data.username}`}
            >
              {auth.data.avatar_url ? (
                <img
                  src={auth.data.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-accent"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <User className="h-4 w-4" />
                </span>
              )}
              <span className="hidden pr-1 text-sm font-medium text-fg lg:inline truncate max-w-[120px]">
                {auth.data.username}
              </span>
            </Link>
            <button
              onClick={() => logoutMut.mutate()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex h-10 items-center gap-2 rounded-xl px-2.5 transition-colors hover:bg-surface"
            aria-label="Iniciar sesión"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden pr-1 text-sm text-muted lg:inline">Conectar</span>
          </Link>
        )}
      </div>
    </header>
  )
}
