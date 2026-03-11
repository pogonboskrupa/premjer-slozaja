import { useState, useEffect, useCallback } from 'react'
import type { Measurement } from '../types'
import {
  getAllMeasurements,
  saveMeasurement,
  deleteMeasurement,
  updateMeasurement
} from '../utils/db'

export function useMeasurements() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllMeasurements()
      setMeasurements(data)
    } catch (e) {
      setError('Greška pri učitavanju podataka')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (m: Measurement) => {
    await saveMeasurement(m)
    setMeasurements(prev => [m, ...prev])
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteMeasurement(id)
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }, [])

  const update = useCallback(async (m: Measurement) => {
    await updateMeasurement(m)
    setMeasurements(prev => prev.map(x => x.id === m.id ? m : x))
  }, [])

  return { measurements, loading, error, reload: load, add, remove, update }
}
