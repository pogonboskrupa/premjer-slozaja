import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraError = 'permission' | 'unavailable' | 'unknown'

export function useCamera({ autoStart = false }: { autoStart?: boolean } = {}) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active,  setActive]  = useState(false)
  const [error,   setError]   = useState<CameraError | null>(null)
  const [loading, setLoading] = useState(false)

  const start = useCallback(async () => {
    if (streamRef.current) return
    setLoading(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setActive(true)
    } catch (err) {
      if (err instanceof DOMException) {
        if (['NotAllowedError','PermissionDeniedError'].includes(err.name)) setError('permission')
        else if (['NotFoundError','DevicesNotFoundError'].includes(err.name)) setError('unavailable')
        else setError('unknown')
      } else setError('unknown')
    } finally {
      setLoading(false)
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  useEffect(() => {
    if (autoStart) start()
    return () => { streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); streamRef.current = null }
  }, [])  // eslint-disable-line

  return { videoRef, streamRef, active, error, loading, start, stop }
}
