import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { useQuery } from '@tanstack/react-query'
import { getMyAssignments, updateAssignmentStatus, type AssignmentDetail } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { notifyLocal } from '../services/notify'

const EARTH_RADIUS_KM = 6371

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Proximity thresholds (km)
const ON_WAY_RADIUS_KM = 0.2 // 200 m
const ARRIVED_RADIUS_KM = 0.03 // 30 m

/**
 * App-wide automatic responder status.
 * While a team has an active assignment (ACCEPTED / ON_THE_WAY), watches the
 * device GPS and auto-advances:
 *   ACCEPTED  -> ON_THE_WAY  (within 200 m of the emergency site)
 *   ON_THE_WAY -> ARRIVED    (within 30 m of the emergency site)
 * Each transition fires once per assignment and notifies the responder.
 */
export default function useAutoResponderStatus() {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ['assignments', 'mine'],
    queryFn: getMyAssignments,
    refetchInterval: 15_000,
  })

  const data = query.data ?? []
  const active = data.find((a: AssignmentDetail) => ['ACCEPTED', 'ON_THE_WAY'].includes(a.status))
  const activeKey = active ? `${active.assignment_id}:${active.status}` : null

  const activeRef = useRef<AssignmentDetail | null>(null)
  activeRef.current = active ?? null

  const watchIdRef = useRef<string | null>(null)
  const autoDone = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!activeKey || !activeRef.current) return
    let cancelled = false

    const evaluate = (lat: number, lng: number) => {
      const a = activeRef.current
      if (!a) return
      const distKm = haversineKm(lat, lng, a.sos.lat, a.sos.lng)
      console.log('[ResQNet][auto]', a.assignment_id, a.status, 'distKm', distKm.toFixed(3))

      if (a.status === 'ACCEPTED' && distKm <= ON_WAY_RADIUS_KM && !autoDone.current.has(a.assignment_id + ':ON_THE_WAY')) {
        autoDone.current.add(a.assignment_id + ':ON_THE_WAY')
        updateAssignmentStatus(a.assignment_id, 'ON_THE_WAY')
          .then(() => {
            notifyLocal('Auto Update', `You are near ${a.sos.sos_id}. Marked On The Way.`)
            query.refetch()
          })
          .catch(() => autoDone.current.delete(a.assignment_id + ':ON_THE_WAY'))
      } else if (a.status === 'ON_THE_WAY' && distKm <= ARRIVED_RADIUS_KM && !autoDone.current.has(a.assignment_id + ':ARRIVED')) {
        autoDone.current.add(a.assignment_id + ':ARRIVED')
        updateAssignmentStatus(a.assignment_id, 'ARRIVED')
          .then(() => {
            notifyLocal('Auto Update', `You have arrived at ${a.sos.sos_id}.`)
            query.refetch()
          })
          .catch(() => autoDone.current.delete(a.assignment_id + ':ARRIVED'))
      }
    }

    const start = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          try { await Geolocation.requestPermissions() } catch { /* ignore */ }
          watchIdRef.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (pos) => { if (!cancelled && pos) evaluate(pos.coords.latitude, pos.coords.longitude) },
          )
        } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          const id = navigator.geolocation.watchPosition(
            (pos) => { if (!cancelled) evaluate(pos.coords.latitude, pos.coords.longitude) },
            () => {},
            { enableHighAccuracy: true },
          )
          watchIdRef.current = String(id)
        }
      } catch (e) {
        console.warn('[ResQNet][auto] gps start failed', JSON.stringify(e))
      }
    }

    start()
    return () => {
      cancelled = true
      if (watchIdRef.current) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current })
        } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(Number(watchIdRef.current))
        }
      }
      watchIdRef.current = null
    }
  }, [activeKey, token, query])
}
