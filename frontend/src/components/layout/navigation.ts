import {
  LayoutDashboard,
  Film,
  Heart,
  Bookmark,
  Tags,
  Download,
  HardDrive,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Navegación principal (sidebar). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/videos', label: 'Todos los vídeos', icon: Film },
  { to: '/likes', label: 'Me gusta', icon: Heart },
  { to: '/favorites', label: 'Favoritos', icon: Bookmark },
  { to: '/categories', label: 'Categorías', icon: Tags },
  { to: '/downloads', label: 'Descargas', icon: Download },
  { to: '/storage', label: 'Almacenamiento', icon: HardDrive },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

