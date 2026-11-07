import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Página no encontrada"
      description="La dirección que buscas no existe o se ha movido."
      action={
        <Link to="/">
          <Button>Volver al Dashboard</Button>
        </Link>
      }
    />
  )
}

