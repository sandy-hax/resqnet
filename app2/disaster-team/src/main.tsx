import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assignment from './pages/Assignment'
import Badge from './pages/Badge'
import './main.css'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/RequireAuth'
import useLocationTracking from './hooks/useLocationTracking'

const queryClient = new QueryClient()

function DutyTracker() {
  useLocationTracking()
  return null
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><><DutyTracker /><Dashboard /></></RequireAuth>} />
          <Route path="/assignment/:id" element={<RequireAuth><><DutyTracker /><Assignment /></></RequireAuth>} />
          <Route path="/badge" element={<RequireAuth><><DutyTracker /><Badge /></></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  </React.StrictMode>
)
