import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/Toaster'
import { MockBanner } from '@/components/ui/MockBanner'
import { VideoActionsProvider } from '@/components/video/VideoActions'

/** Layout principal: navegación + cabecera + banner de simulación + contenido + toasts. */
export function AppLayout() {
  return (
    <VideoActionsProvider>
      <div className="flex h-full overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <MockBanner />
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </VideoActionsProvider>
  )
}
