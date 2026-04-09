import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import GaragePage        from './pages/GaragePage'
import AuthPage          from './pages/AuthPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import DiscoverPage      from './pages/DiscoverPage'
import SearchPage        from './pages/SearchPage'
import ProfilePage       from './pages/ProfilePage'
import BottomNav         from './components/layout/BottomNav'

const NAV_ROUTES = ['/', '/discover', '/search', '/profile']

function ProtectedRoute({ children }) {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  if (!user) return <Navigate to="/auth" state={{ from: pathname }} replace />
  return children
}

export default function App() {
  const { initialize } = useAuthStore()
  const { pathname }   = useLocation()

  // Show bottom nav on main tabs only
  const showNav = NAV_ROUTES.includes(pathname) ||
                  pathname.startsWith('/profile')

  useEffect(() => { initialize() }, [])

  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute><GaragePage /></ProtectedRoute>
        } />
        <Route path="/vehicle/:id" element={
          <ProtectedRoute><VehicleDetailPage /></ProtectedRoute>
        } />
        <Route path="/discover" element={
          <ProtectedRoute><DiscoverPage /></ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute><SearchPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/profile/:username" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showNav && <BottomNav />}
    </>
  )
}