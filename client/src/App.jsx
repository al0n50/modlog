import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import GaragePage from './pages/GaragePage'
import AuthPage from './pages/AuthPage'

function ProtectedRoute({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => { initialize() }, [])

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <GaragePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}