import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, setAuthToken, type LoginResponse } from '../api/client'

type AuthContextType = {
  token: string | null
  user: LoginResponse | null
  isAuthenticated: boolean
  login: (session: LoginResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'resqnet_team_session'

function loadStored(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LoginResponse) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => loadStored())
  const token = user?.access_token ?? null

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  // Auto sign-out when the backend rejects an expired/invalid token.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      res => res,
      error => {
        if (error?.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEY)
          setUser(null)
        }
        return Promise.reject(error)
      },
    )
    return () => api.interceptors.response.eject(interceptor)
  }, [])

  function login(session: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
