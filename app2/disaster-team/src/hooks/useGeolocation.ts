import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { useEffect, useState } from 'react'

export default function useGeolocation(_options?: PositionOptions) {
  const [pos, setPos] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  useEffect(() => {
    let watchId: string | null = null
    let cancelled = false

    function toDom(p: { coords: { latitude: number; longitude: number; accuracy?: number }; timestamp: number }): GeolocationPosition {
      return {
        coords: {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? 0,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: p.timestamp ?? Date.now(),
      } as GeolocationPosition
    }

    if (!Capacitor.isNativePlatform()) {
      if (!('geolocation' in navigator)) return
      const id = navigator.geolocation.watchPosition(
        p => { setPos(p); setError(null) },
        e => { setError(e) },
        { enableHighAccuracy: true, maximumAge: 5000 },
      )
      return () => navigator.geolocation.clearWatch(id)
    }

    async function start() {
      try {
        await Geolocation.requestPermissions()
      } catch (e) {
        console.warn('[ResQNet] geolocation permission request denied', e)
      }
      try {
        const p = await Geolocation.getCurrentPosition()
        if (!cancelled) {
          setPos(toDom(p))
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e as GeolocationPositionError)
      }

      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, maximumAge: 5000 },
        p => {
          if (cancelled || !p) return
          setPos(toDom(p))
          setError(null)
        },
      )
    }

    start()
    return () => {
      cancelled = true
      if (watchId) Geolocation.clearWatch({ id: watchId })
    }
  }, [])

  return { position: pos, error }
}