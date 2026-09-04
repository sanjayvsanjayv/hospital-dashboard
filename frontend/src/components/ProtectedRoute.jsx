import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) return <LoadingSpinner message="Authenticating…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />

  return children
}
