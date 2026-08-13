import { useEffect, useState } from 'react'

export default function useGeolocation(options?: PositionOptions) {
  const [pos, setPos] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      p => { setPos(p); setError(null) },
      e => { setError(e) },
      options || { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { position: pos, error }
}
