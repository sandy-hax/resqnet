import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Header from '../components/Header'
import useWebSocket from '../hooks/useWebSocket'
import useGeolocation from '../hooks/useGeolocation'
import {
  getAssignment,
  respondToAssignment,
  updateAssignmentStatus,
  getRouteForSOS,
  getMyTeam,
  updateLocation,
  type AssignmentDetail,
} from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const FALLBACK_ORIGIN = [11.341, 77.717] as [number, number]

const ZONE_ICON = L.divIcon({
  className: 'dms-marker',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#E14434;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const TEAM_ICON = L.divIcon({
  className: 'dms-marker',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0F6E5C;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

export default function Assignment() {
  const { id = '' } = useParams()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { position } = useGeolocation()
  const [busy, setBusy] = useState<string | null>(null)

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => getAssignment(id),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  })

  const teamQuery = useQuery({ queryKey: ['team', 'me'], queryFn: getMyTeam, staleTime: 60_000 })

  const origin: [number, number] = useMemo(() => {
    if (position?.coords) return [position.coords.latitude, position.coords.longitude]
    if (teamQuery.data?.current_lat != null && teamQuery.data?.current_lng != null) {
      return [teamQuery.data.current_lat, teamQuery.data.current_lng]
    }
    return FALLBACK_ORIGIN
  }, [position, teamQuery.data])

  const dest: [number, number] = useMemo(() => {
    if (!assignment?.sos) return FALLBACK_ORIGIN
    return [assignment.sos.lat, assignment.sos.lng]
  }, [assignment])

  const routeQuery = useQuery({
    queryKey: ['route', assignment?.sos_id, origin[0], origin[1]],
    queryFn: () => getRouteForSOS(assignment!.sos_id, origin[0], origin[1]),
    enabled: Boolean(assignment),
    staleTime: 15_000,
  })

  // Refetch on live status broadcasts (team / authority / backend events).
  const onMessage = useCallback(
    (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.event === 'sos.status_changed' || msg.event === 'assignment.responded') {
          queryClient.invalidateQueries({ queryKey: ['assignment', id] })
        }
      } catch {
        // ignore non-JSON frames
      }
    },
    [queryClient, id],
  )
  useWebSocket(onMessage, token)

  useEffect(() => {
    // Keep geolocation parity with the backend team profile so ranking/distance stay fresh.
    if (position?.coords) {
      void updatePositionSafe(position.coords.latitude, position.coords.longitude)
    }
  }, [position])

  async function updatePositionSafe(lat: number, lng: number) {
    try {
      await updateLocation({ lat, lng })
    } catch {
      // non-fatal
    }
  }

  const status = assignment?.status

  async function act(action: string) {
    if (!id) return
    setBusy(action)
    try {
      if (action === 'ACCEPTED' || action === 'DECLINED') {
        await respondToAssignment(id, action)
      } else {
        await updateAssignmentStatus(id, action as 'ON_THE_WAY' | 'ARRIVED' | 'COMPLETED')
      }
      await queryClient.invalidateQueries({ queryKey: ['assignment', id] })
      await queryClient.invalidateQueries({ queryKey: ['assignments', 'mine'] })
    } catch (e) {
      console.error('assignment action failed', e)
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="p-4 max-w-3xl mx-auto">
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
            Could not load this assignment. It may belong to another team, or you may need to sign
            in again.
          </div>
        </main>
      </div>
    )
  }

  if (isLoading || !assignment) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="p-4 max-w-3xl mx-auto text-sm text-muted text-center py-8">Loading assignment…</main>
      </div>
    )
  }

  const sos = assignment.sos

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-card">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-lg font-bold text-primary">{sos.sos_id}</span>
            <span className="text-sm px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {sos.emergency_type}
            </span>
            <span className="ml-auto text-xs text-muted">
              {assignment.distance_km != null && `${assignment.distance_km.toFixed(1)} km`}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Priority: <strong>{sos.priority}</strong> · {sos.people_affected} people affected
          </div>
          <p className="mt-2 text-sm text-slate-700">{sos.description}</p>
          <div className="mt-2 text-xs text-muted">
            {sos.guest_name ?? 'Anonymous'} · {sos.guest_phone ?? 'Guest'} ·{' '}
            <code>{sos.lat.toFixed(5)}, {sos.lng.toFixed(5)}</code>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Live response status</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(
              ['OFFERED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'COMPLETED'] as const
            ).map(step => (
              <React.Fragment key={step}>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    status === step ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.replace(/_/g, ' ')}
                </span>
                {step !== 'COMPLETED' && <span className="text-slate-300">→</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {status === 'OFFERED' && (
              <>
                <button
                  onClick={() => act('ACCEPTED')}
                  disabled={busy !== null}
                  className="px-3 py-2 bg-success text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {busy === 'ACCEPTED' ? 'Responding…' : 'Accept dispatch'}
                </button>
                <button
                  onClick={() => act('DECLINED')}
                  disabled={busy !== null}
                  className="px-3 py-2 bg-danger text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {busy === 'DECLINED' ? 'Responding…' : 'Decline'}
                </button>
              </>
            )}
            {status === 'ACCEPTED' && (
              <button
                onClick={() => act('ON_THE_WAY')}
                disabled={busy !== null}
                className="px-3 py-2 bg-warning text-white rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {busy === 'ON_THE_WAY' ? 'Updating…' : 'Mark On The Way'}
              </button>
            )}
            {status === 'ON_THE_WAY' && (
              <button
                onClick={() => act('ARRIVED')}
                disabled={busy !== null}
                className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {busy === 'ARRIVED' ? 'Updating…' : 'Mark Arrived At Scene'}
              </button>
            )}
            {status === 'ARRIVED' && (
              <button
                onClick={() => act('COMPLETED')}
                disabled={busy !== null}
                className="px-3 py-2 bg-success text-white rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {busy === 'COMPLETED' ? 'Updating…' : 'Mark Assistance Completed'}
              </button>
            )}
            {['DECLINED', 'COMPLETED'].includes(status || '') && (
              <span className="text-xs text-muted">This dispatch is closed.</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Navigation</div>
          {routeQuery.isFetching ? (
            <div className="text-xs text-muted py-3">Fetching route…</div>
          ) : (
            <div className="text-xs text-slate-600 mb-2 space-x-3">
              <span>Distance: <strong>{routeQuery.data?.distance_km ?? '—'} km</strong></span>
              <span>ETA: <strong>{routeQuery.data?.duration_min ?? '—'} min</strong></span>
              {routeQuery.data?.is_fallback && <span className="text-warning">(straight-line fallback)</span>}
            </div>
          )}
          <div className="rounded-lg overflow-hidden border border-border">
            <MapContainer center={origin} zoom={13} className="leaflet-container" attributionControl>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {routeQuery.data?.polyline && (
                <Polyline positions={routeQuery.data.polyline} color="#E14434" weight={4} />
              )}
              <Marker position={origin} icon={TEAM_ICON}>
                <Popup>Your location</Popup>
              </Marker>
              <Marker position={dest} icon={ZONE_ICON}>
                <Popup>Emergency site · {sos.sos_id}</Popup>
              </Marker>
            </MapContainer>
          </div>
          {routeQuery.data?.steps && routeQuery.data.steps.length > 0 && (
            <ol className="list-decimal pl-5 mt-3 text-xs text-slate-600 space-y-1">
              {routeQuery.data.steps.slice(0, 12).map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  )
}