import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyTeam, updateLocation } from '../api/client'
import useGeolocation from './useGeolocation'

const TRACK_INTERVAL_MS = 30 * 1000

/**
 * Auto-location tracking while the responder is On Duty.
 *
 * Whenever the team is marked available (`is_available === true`) this sends the
 * device's current GPS position to `PATCH /team/location` immediately and then
 * every 5 minutes. The backend stamps `location_updated_at` and broadcasts
 * `team.location_updated` to the authority dashboard so dispatch distances stay
 * accurate. Tracking stops as soon as the team goes off duty.
 *
 * Only runs on authenticated screens; mount once at the app root.
 */
export default function useLocationTracking() {
  const { data: team } = useQuery({ queryKey: ['team', 'me'], queryFn: getMyTeam, staleTime: 60_000 })
  const isAvailable = team?.is_available ?? false
  const { position } = useGeolocation({ enableHighAccuracy: true, maximumAge: 60_000 })
  const posRef = useRef<GeolocationPosition | null>(position)
  posRef.current = position

  useEffect(() => {
    if (!isAvailable) return

    let stopped = false
    async function push() {
      const p = posRef.current
      if (!p) return
      try {
        await updateLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
      } catch (e) {
        console.error('location push failed', e)
      }
    }

    // Push right away when duty starts, then on a 5-minute cadence.
    push()
    const id = setInterval(() => {
      if (!stopped) push()
    }, TRACK_INTERVAL_MS)

    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [isAvailable])
}
