import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Ban,
  Link2,
  Lock,
  Trash2,
  CloudOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { DownloadStatus, Video } from '@/types'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface StatusInfo {
  label: string
  tone: Tone
  icon: LucideIcon
  spin?: boolean
}

export const DOWNLOAD_STATUS_INFO: Record<DownloadStatus, StatusInfo> = {
  pending: { label: 'Pendiente', tone: 'neutral', icon: Clock },
  processing: { label: 'Procesando', tone: 'info', icon: Loader2, spin: true },
  downloading: { label: 'Descargando', tone: 'accent', icon: Loader2, spin: true },
  completed: { label: 'Descargado', tone: 'success', icon: CheckCircle2 },
  error: { label: 'Error', tone: 'danger', icon: AlertCircle },
  unavailable: { label: 'No disponible', tone: 'warning', icon: Ban },
  cancelled: { label: 'Cancelado', tone: 'neutral', icon: XCircle },
}

/**
 * Estado combinado: primero la disponibilidad en origen (privado, eliminado,
 * solo enlace) y después el estado de la descarga.
 */
export function videoStatusInfo(video: Video): StatusInfo {
  switch (video.availability) {
    case 'private':
      return { label: 'Privado', tone: 'warning', icon: Lock }
    case 'deleted':
      return { label: 'Eliminado', tone: 'warning', icon: Trash2 }
    case 'link_only':
      return { label: 'Solo enlace', tone: 'info', icon: Link2 }
  }
  if (video.downloadStatus) return DOWNLOAD_STATUS_INFO[video.downloadStatus]
  return { label: 'No descargado', tone: 'neutral', icon: CloudOff }
}

export function StatusBadge({ info, className }: { info: StatusInfo; className?: string }) {
  const Icon = info.icon
  return (
    <Badge tone={info.tone} className={className}>
      <Icon className={`h-3 w-3 ${info.spin ? 'animate-spin' : ''}`} />
      {info.label}
    </Badge>
  )
}

export function VideoStatusBadge({ video, className }: { video: Video; className?: string }) {
  return <StatusBadge info={videoStatusInfo(video)} className={className} />
}

