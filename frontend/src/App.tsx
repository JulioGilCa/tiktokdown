import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Film, Heart, Bookmark } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { VideoLibraryPage } from '@/pages/VideoLibraryPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { StoragePage } from '@/pages/StoragePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'videos',
        element: (
          <VideoLibraryPage
            title="Todos los vídeos"
            description="Toda tu biblioteca en un solo lugar."
            emptyIcon={Film}
            emptyTitle="Aún no hay vídeos"
            emptyDescription="Importa el archivo ZIP de tus datos de TikTok desde Configuración para ver aquí tus vídeos."
          />
        ),
      },
      {
        path: 'likes',
        element: (
          <VideoLibraryPage
            title="Me gusta"
            description="Vídeos que marcaste con Me gusta en TikTok."
            interaction="like"
            emptyIcon={Heart}
            emptyTitle="No hay vídeos con Me gusta"
            emptyDescription="Se mostrarán cuando importes tu historial de Me gusta."
          />
        ),
      },
      {
        path: 'favorites',
        element: (
          <VideoLibraryPage
            title="Favoritos"
            description="Vídeos guardados en Favoritos en TikTok."
            interaction="favorite"
            emptyIcon={Bookmark}
            emptyTitle="No hay favoritos"
            emptyDescription="Se mostrarán cuando importes tus vídeos favoritos."
          />
        ),
      },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'downloads', element: <DownloadsPage /> },
      { path: 'storage', element: <StoragePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
