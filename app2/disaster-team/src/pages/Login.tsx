import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: saveSession } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const session = await login(phone.trim(), password)
      if (session.role !== 'DISASTER_MGMT_TEAM') {
        setError('This portal is for Disaster Management Team accounts only.')
        setLoading(false)
        return
      }
      saveSession(session)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Unable to sign in. Check your credentials and that the backend is running.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={handleLogin} className="bg-surface p-6 rounded-xl shadow-card w-96">
        <div className="mb-1 text-xl font-bold text-primary">ResQNet</div>
        <div className="mb-5 text-sm text-muted">Team Response Portal — sign in</div>

        <label className="block text-sm mb-1.5 font-medium">Phone number</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full p-2.5 border border-border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="+91 91234 56789"
          autoComplete="username"
          required
        />

        <label className="block text-sm mb-1.5 font-medium">Password</label>
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          className="w-full p-2.5 border border-border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white p-2.5 rounded-lg font-semibold hover:bg-primaryDark disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 rounded-lg border border-border bg-bg px-3 py-2.5 text-xs text-muted">
          Demo team: <code className="font-mono">+919123456789</code> / <code className="font-mono">team123</code>
        </div>
      </form>
    </div>
  )
}
