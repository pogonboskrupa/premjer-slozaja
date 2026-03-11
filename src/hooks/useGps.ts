import { useState, useCallback } from 'react'
import type { GpsCoordinates } from '../types'

export function useGps() {
  const [coords, setCoords] = useState<GpsCoordinates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS nije dostupan na ovom uređaju')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        })
        setLoading(false)
      },
      err => {
        if (err.code === 1) setError('Dozvola za GPS odbijena')
        else if (err.code === 2) setError('GPS lokacija nedostupna')
        else setError('GPS timeout — pokušaj ponovo')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  return { coords, loading, error, fetch }
}
