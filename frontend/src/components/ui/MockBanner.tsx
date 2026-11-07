import { FlaskConical } from 'lucide-react'
import { IS_MOCK } from '@/services'

/** Aviso visible permanente cuando la interfaz usa datos simulados. */
export function MockBanner() {
  if (!IS_MOCK) return null
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-warning/90">
        <strong className="font-semibold text-warning">Modo demostración:</strong> se muestran datos de prueba
        simulados. No proceden de TikTok, los enlaces no son reales y los cambios se pierden al recargar.
      </p>
    </div>
  )
}

