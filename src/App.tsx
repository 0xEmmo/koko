import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './components/AppShell'
import { Toaster } from './components/Toaster'
import DiscoverPage from './pages/discover/DiscoverPage'
import NotFoundPage from './pages/NotFoundPage'

const CreativePage = lazy(() => import('./pages/creative/CreativePage'))
const BookingPage = lazy(() => import('./pages/book/BookingPage'))
const BookingsPage = lazy(() => import('./pages/bookings/BookingsPage'))
const SavedPage = lazy(() => import('./pages/SavedPage'))
const StudioPage = lazy(() => import('./pages/studio/StudioPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'c/:slug', element: <CreativePage /> },
      { path: 'c/:slug/book', element: <BookingPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'bookings/:id', element: <BookingsPage /> },
      { path: 'saved', element: <SavedPage /> },
      { path: 'studio', element: <StudioPage /> },
      { path: 'credits', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    <Toaster>
      <RouterProvider router={router} />
    </Toaster>
  )
}
