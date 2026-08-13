import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '../components/Header'
import useWebSocket from '../hooks/useWebSocket'
import { getMyAssignments, type AssignmentDetail } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const STATUS_STYLES: Record<string, string> = {
  OFFERED: 'bg-violet-100 text-violet-700',
  ACCEPTED: 'bg-sky-100 text-sky-700',
  DECLINED: 'bg-red-100 text-red-700',
  ON_THE_WAY: 'bg-amber-100 text-amber-700',
  ARRIVED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

export default function Dashboard() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const { data: assignments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['assignments', 'mine'],
    queryFn: getMyAssignments,
    refetchInterval: 30_000,
  })

  // Refresh whenever a new offer or status change arrives over WebSocket.
  const onMessage = useCallback(
    (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data)
        if (['assignment.offered', 'sos.status_changed'].includes(msg.event)) {
          queryClient.invalidateQueries({ queryKey: ['assignments', 'mine'] })
        }
      } catch {
        // ignore non-JSON frames
      }
    },
    [queryClient],
  )

  useWebSocket(onMessage, token)

  const open = assignments.filter((a: AssignmentDetail) => !['COMPLETED', 'DECLINED'].includes(a.status))
  const history = assignments.filter((a: AssignmentDetail) => ['COMPLETED', 'DECLINED'].includes(a.status))

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pre-assigned Dispatches</h2>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primaryLight"
          >
            Refresh
          </button>
        </div>

        {isLoading && <div className="text-sm text-muted py-6 text-center">Loading assignments…</div>}
        {error && (
          <div className="text-sm text-danger bg-danger/5 border border-danger/30 rounded-lg px-4 py-3 mb-4">
            Could not load assignments. Check backend connectivity.
          </div>
        )}

        <div className="space-y-3">
          {!isLoading && open.length === 0 && (
            <div className="bg-white p-6 rounded-xl border text-center text-sm text-muted">
              No active dispatches. New assignments from the Command Center appear here instantly.
            </div>
          )}
          {open.map((a: AssignmentDetail) => <AssignmentRow key={a.assignment_id} a={a} />)}
        </div>

        {history.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-muted mt-6 mb-2">Completed / Declined</h3>
            <div className="space-y-2">
              {history.map((a: AssignmentDetail) => <AssignmentRow key={a.assignment_id} a={a} compact />)}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function AssignmentRow({ a, compact }: { a: AssignmentDetail; compact?: boolean }) {
  return (
    <Link
      to={`/assignment/${a.assignment_id}`}
      className="bg-white p-4 rounded-xl border border-border shadow-card flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold text-primary">{a.sos.sos_id}</span>
          <span className="text-xs text-muted">{a.sos.emergency_type}</span>
          <span className="text-xs text-muted">· {a.sos.people_affected} affected</span>
        </div>
        {!compact && (
          <p className="text-sm text-slate-600 mt-1 truncate">{a.sos.description}</p>
        )}
        <div className="text-xs text-muted mt-1">
          {a.sos.guest_name ?? 'Anonymous'} · {a.sos.guest_phone ?? 'Guest'}
          {a.distance_km != null && ` · ${a.distance_km.toFixed(1)} km away`}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {a.status.replace(/_/g, ' ')}
        </span>
        {compact ? null : <span className="text-primary text-sm">→</span>}
      </div>
    </Link>
  )
}
