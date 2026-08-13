import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AvailabilityToggle from './AvailabilityToggle'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between p-4 bg-surface border-b">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">R</div>
        <div>
          <div className="font-semibold text-primary">ResQNet</div>
          <div className="text-xs text-muted">Team Response Portal · {user?.name ?? 'Unit'}</div>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <AvailabilityToggle />
        <Link to="/" className="text-sm text-muted hover:text-primary">Requests</Link>
        <Link to="/badge" className="text-sm text-muted hover:text-primary">Badge</Link>
        <button
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="text-sm text-muted hover:text-danger"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
