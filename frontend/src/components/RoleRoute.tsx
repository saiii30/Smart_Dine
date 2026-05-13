import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { DineRole } from '../types'

const RoleRoute = ({
  children,
  roles,
}: {
  children: ReactElement
  roles: DineRole[]
}) => {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 animate-pulse">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role as DineRole)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default RoleRoute
