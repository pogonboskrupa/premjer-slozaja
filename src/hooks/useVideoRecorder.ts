import { useState, useRef, useCallback } from 'react'

export interface RecordedVideo {
  blob: Blob
  url: string
  durationMs: number
  frames: ImageData[]
  thumbnailDataUrl: string
  frameWidth: number
  frameHeight: number
}

export function useVideoRecorder(videoRef: React.RefObject<HTMLVideoElement>) {
  const recorderRef   = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const startTimeRef  = useRef<number>(0)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const framesRef     = useRef<ImageData[]>([])
  const canvasRef     = useRef<HTMLCanvasElement>(document.createElement('canvas'))

  const [recording,   setRecording]   = useState(false)
  const [duration,    setDuration]    = useState(0)
  const [frameCount,  setFrameCount]  = useState(0)
  const [liveThumb,   setLiveThumb]   = useState<string | null>(null)

  const startRecording = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.srcObject) return

    const stream   = video.srcObject as MediaStream
    const mimeType = ['video/webm;codecs=vp8','video/webm','video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? ''

    chunksRef.current  = []
    framesRef.current  = []
    startTimeRef.current = Date.now()

    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 2_500_000 })
    recorderRef.current = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start(250)
    setRecording(true)
    setDuration(0)
    setFrameCount(0)
    setLiveThumb(null)

    const canvas = canvasRef.current

    // Sample frames every 400ms for analysis + live thumb every 1.2s
    let thumbTick = 0
    frameTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setDuration(Math.floor(elapsed / 1000))

      if (video.readyState < 2) return

      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 360
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      framesRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      setFrameCount(framesRef.current.length)

      // Update live thumbnail every ~3 frames
      thumbTick++
      if (thumbTick % 3 === 0) {
        setLiveThumb(canvas.toDataURL('image/jpeg', 0.5))
      }
    }, 400)
  }, [videoRef])

  const stopRecording = useCallback((): Promise<RecordedVideo> => {
    return new Promise(resolve => {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current)
        frameTimerRef.current = null
      }

      const recorder = recorderRef.current
      if (!recorder) return

      const durationMs   = Date.now() - startTimeRef.current
      const canvas       = canvasRef.current
      const frameWidth   = canvas.width
      const frameHeight  = canvas.height
      const thumbnailDataUrl = canvas.width > 0 ? canvas.toDataURL('image/jpeg', 0.72) : ''

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        const url  = URL.createObjectURL(blob)
        setRecording(false)
        setLiveThumb(null)
        resolve({ blob, url, durationMs, frames: framesRef.current, thumbnailDataUrl, frameWidth, frameHeight })
      }

      recorder.stop()
    })
  }, [])

  return { recording, duration, frameCount, liveThumb, startRecording, stopRecording }
}
