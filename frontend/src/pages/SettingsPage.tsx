import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Link2,
  UploadCloud,
  FileCheck2,
  Film,
  Heart,
  Bookmark,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, ApiError } from '@/lib/api'
import { useImportTikTokData } from '@/hooks/useLibrary'
import { formatBytes } from '@/lib/format'
import type { ImportResult } from '@/services'

interface SystemStatus {
  environment: string
  tiktok_credentials_configured: boolean
  token_encryption_configured: boolean
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const status = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api<SystemStatus>('/system/status'),
  })

  const importMut = useImportTikTokData()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastResult, setLastResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(file: File) {
    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.zip') && !ext.endsWith('.json')) {
      alert('Por favor selecciona un archivo .zip o .json exportado de TikTok.')
      return
    }
    setSelectedFile(file)
    setLastResult(null)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0])
    }
  }

  function triggerUpload() {
    if (!selectedFile) return
    importMut.mutate(selectedFile, {
      onSuccess: (data) => {
        setLastResult(data)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Configuración e Importación"
        description="Importa tus datos de TikTok, consulta el estado del servidor y gestiona la integración."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel de Importación de Datos TikTok */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Importar archivo de datos de TikTok (Me gusta y Favoritos)"
            description="Procesa tu exportación oficial de TikTok para incorporar tus vídeos a la biblioteca sin necesidad de aprobación previa."
            action={<Badge tone="success">Vía recomendada</Badge>}
          />
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Instrucciones de exportación */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-fg">¿Cómo obtener tus datos de TikTok?</h3>
                <ol className="space-y-2 text-xs text-muted">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-fg">1</span>
                    Abre TikTok en tu móvil o navegador y entra en tu Perfil.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-fg">2</span>
                    Abre el menú superior derecho → <strong>Ajustes y privacidad</strong> → <strong>Cuenta</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-fg">3</span>
                    Pulsa en <strong>Descargar tus datos</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-fg">4</span>
                    Selecciona el formato <strong>JSON - Archivo legible por máquina</strong> y solicita los datos.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-fg">5</span>
                    Cuando TikTok termine de procesarlo (pestaña "Descargar datos"), descarga el archivo .ZIP y súbelo aquí.
                  </li>
                </ol>

                <div className="flex items-center gap-2 rounded-xl bg-surface/50 p-3 text-xs text-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                  La importación es 100% privada y se procesa localmente en tu propio servidor.
                </div>
              </div>

              {/* Zona de arrastrar y soltar archivo */}
              <div className="flex flex-col justify-between space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.json"
                  className="hidden"
                  onChange={onFileInputChange}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? 'border-accent bg-accent-soft/30'
                      : 'border-line bg-surface/30 hover:border-accent/50 hover:bg-surface/60'
                  }`}
                >
                  <UploadCloud className="mb-3 h-10 w-10 text-accent-hover" />
                  <p className="text-sm font-semibold">Arrastra aquí tu archivo .zip o .json</p>
                  <p className="mt-1 text-xs text-muted">o haz clic para explorar en tu ordenador</p>
                  <p className="mt-3 text-[11px] text-muted/80">Archivos soportados: ZIP de TikTok o user_data.json (hasta 150 MB)</p>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-xl border border-line bg-panel p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileCheck2 className="h-5 w-5 shrink-0 text-accent-hover" />
                      <div className="truncate">
                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted">{formatBytes(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      disabled={importMut.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerUpload()
                      }}
                    >
                      {importMut.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
                        </>
                      ) : (
                        'Iniciar importación'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado de la última importación */}
            {lastResult && (
              <div className="mt-6 rounded-2xl border border-line bg-surface/30 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <h4 className="font-semibold text-sm">Resumen de la importación</h4>
                  </div>
                  <Link to="/videos">
                    <Button size="sm" variant="secondary">
                      Ver biblioteca <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-line bg-panel p-3">
                    <p className="text-xs text-muted">Vídeos detectados</p>
                    <p className="text-xl font-bold tabular-nums text-fg">{lastResult.totalFound}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-panel p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Film className="h-3 w-3 text-accent" /> Nuevos importados
                    </p>
                    <p className="text-xl font-bold tabular-nums text-success">{lastResult.importedCount}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-panel p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Heart className="h-3 w-3 text-danger" /> Me gusta
                    </p>
                    <p className="text-xl font-bold tabular-nums text-fg">{lastResult.likesCount}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-panel p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Bookmark className="h-3 w-3 text-info" /> Favoritos
                    </p>
                    <p className="text-xl font-bold tabular-nums text-fg">{lastResult.favoritesCount}</p>
                  </div>
                </div>

                {lastResult.errors.length > 0 && (
                  <div className="mt-4 space-y-1 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4" /> Avisos durante el procesamiento:
                    </div>
                    <ul className="list-disc pl-5">
                      {lastResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Estado del Servidor */}
        <Card>
          <CardHeader
            title="Estado del servidor"
            action={
              status.isSuccess ? (
                <Badge tone="success">Conectado · {status.data.environment}</Badge>
              ) : status.isError ? (
                <Badge tone="danger">Sin conexión</Badge>
              ) : (
                <Badge>Comprobando…</Badge>
              )
            }
          />
          <div className="divide-y divide-line px-5">
            {status.isPending && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Consultando el backend…
              </div>
            )}
            {status.isError && (
              <p className="py-4 text-sm text-danger">
                {status.error instanceof ApiError ? status.error.message : 'Error desconocido.'}
              </p>
            )}
            {status.isSuccess && (
              <>
                <StatusRow
                  label="Credenciales de TikTok"
                  ok={status.data.tiktok_credentials_configured}
                  hint={
                    status.data.tiktok_credentials_configured
                      ? 'Client Key/Secret configurados en el servidor. Los permisos dependen de la aprobación de TikTok.'
                      : 'Faltan TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET o TIKTOK_REDIRECT_URI en el .env del backend.'
                  }
                />
                <StatusRow
                  label="Cifrado de tokens"
                  ok={status.data.token_encryption_configured}
                  hint={
                    status.data.token_encryption_configured
                      ? 'Los tokens OAuth se almacenarán cifrados.'
                      : 'Define TOKEN_ENCRYPTION_KEY en el .env del backend.'
                  }
                />
              </>
            )}
          </div>
        </Card>

        {/* TikTok Data Portability API */}
        <Card>
          <CardHeader title="Integración TikTok API (Fase 5)" />
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-line bg-surface/50 p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent-hover" />
                <p className="text-sm font-medium">Data Portability API</p>
                <Badge tone="warning">Requiere aprobación</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                Permite sincronización periódica directa desde los servidores de TikTok. Requiere una app verificada en developers.tiktok.com con permisos de portabilidad autorizados.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-success" />
              Tu contraseña de TikTok nunca pasa por esta aplicación.
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await api<{ success: boolean; error?: string; request_id?: string }>('/tiktok/sync', { method: 'POST' })
                    if (res.success) {
                      alert(`Sincronización solicitada con éxito. ID de petición: ${res.request_id}`)
                    } else {
                      alert(`Respuesta de TikTok API: ${res.error}\n\nPara utilizar esta funcionalidad, solicita los permisos portability.activity.single en el Centro de Desarrolladores de TikTok.`)
                    }
                  } catch (e: any) {
                    alert(e.message || 'Error al conectar con la API de TikTok')
                  }
                }}
              >
                Probar sincronización API
              </Button>
              <Button variant="secondary" onClick={() => status.refetch()} size="sm">
                Volver a comprobar estado
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
