import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export function PublicOnlyRoute({ children }) {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Checking session...
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
