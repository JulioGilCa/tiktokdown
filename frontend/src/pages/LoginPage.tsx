import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, ShieldCheck, Lock, FileArchive, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

interface SystemStatus {
  environment: string
  tiktok_credentials_configured: boolean
  token_encryption_configured: boolean
}

/**
 * Pantalla de acceso. El botón "Conectar con TikTok" redirige a
 * /api/auth/tiktok/login (OAuth 2.0 oficial con PKCE).
 * Nunca se solicita ni almacena la contraseña de TikTok.
 */
export function LoginPage() {
  const [params] = useSearchParams()
  const errorParam = params.get('error')

  const status = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api<SystemStatus>('/system/status'),
  })

  const oauthReady = status.data?.tiktok_credentials_configured ?? false

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-12">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/25 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-[var(--shadow-glow)]">
            <Play className="h-6 w-6 fill-white text-white" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">TikTok Library</h1>
          <p className="mt-2 text-sm text-muted">Tu biblioteca privada de vídeos de TikTok.</p>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-card)] sm:p-8">
          {errorParam && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error de autenticación con TikTok</p>
                <p className="mt-0.5 text-danger/90">{errorParam}</p>
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="w-full justify-center"
            disabled={!oauthReady || status.isPending}
            onClick={() => window.location.assign('/api/auth/tiktok/login')}
          >
            {status.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Comprobando conexión…
              </>
            ) : (
              'Conectar con TikTok'
            )}
          </Button>

          {!oauthReady && !status.isPending && (
            <p className="mt-3 text-center text-xs text-muted">
              Para habilitar el inicio de sesión oficial con TikTok, configura <code className="text-muted/80">TIKTOK_CLIENT_KEY</code> y <code className="text-muted/80">TIKTOK_CLIENT_SECRET</code> en el archivo .env del backend.
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> o <span className="h-px flex-1 bg-line" />
          </div>

          <Link to="/settings">
            <Button variant="secondary" size="lg" className="w-full justify-center">
              <FileArchive className="h-4 w-4" />
              Importar archivo de datos (ZIP)
            </Button>
          </Link>

          <ul className="mt-6 space-y-2.5 text-xs text-muted">
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
              Inicias sesión directamente en TikTok mediante OAuth 2.0 PKCE. Nunca vemos tu contraseña.
            </li>
            <li className="flex gap-2">
              <Lock className="h-4 w-4 shrink-0 text-success" />
              Los tokens se almacenan cifrados con AES en tu servidor y nunca se exponen al navegador.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
