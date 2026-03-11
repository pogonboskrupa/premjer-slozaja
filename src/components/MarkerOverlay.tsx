import { useState, useRef, useCallback, useEffect } from 'react'
import type { MarkerRect } from '../types'

interface MarkerOverlayProps {
  imageDataUrl: string
  value: MarkerRect
  onChange: (rect: MarkerRect) => void
  calibrationMode?: boolean
  calibrationSegment?: { x1: number; y1: number; x2: number; y2: number } | null
  onCalibrationChange?: (seg: { x1: number; y1: number; x2: number; y2: number }) => void
}

type Handle = 'left' | 'right' | 'top' | 'bottom' | 'move' | null

const CLAMP = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

export function MarkerOverlay({
  imageDataUrl, value, onChange,
  calibrationMode, calibrationSegment, onCalibrationChange
}: MarkerOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<Handle>(null)
  const dragStart = useRef<{ x: number; y: number; rect: MarkerRect }>({
    x: 0, y: 0, rect: value
  })
  const [, setImgSize] = useState({ w: 1, h: 1 })
  const calibDragging = useRef<'p1' | 'p2' | null>(null)

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return { rx: 0, ry: 0 }
    const rect = el.getBoundingClientRect()
    return {
      rx: (clientX - rect.left) / rect.width,
      ry: (clientY - rect.top) / rect.height
    }
  }, [])

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = handle
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      rect: { ...value }
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return
    const { rx, ry } = getRelativePos(e.clientX, e.clientY)
    const r = { ...dragStart.current.rect }

    const START_RX = getRelativePos(dragStart.current.x, dragStart.current.y).rx
    const START_RY = getRelativePos(dragStart.current.x, dragStart.current.y).ry
    const DX = rx - START_RX
    const DY = ry - START_RY

    switch (dragging.current) {
      case 'left':   onChange({ ...r, left:  CLAMP(r.left  + DX, 0, r.right  - 0.05) }); break
      case 'right':  onChange({ ...r, right: CLAMP(r.right + DX, r.left + 0.05) }); break
      case 'top':    onChange({ ...r, top:   CLAMP(r.top   + DY, 0, r.bottom - 0.05) }); break
      case 'bottom': onChange({ ...r, bottom:CLAMP(r.bottom + DY, r.top + 0.05) }); break
      case 'move': {
        const w = r.right - r.left
        const h = r.bottom - r.top
        const nl = CLAMP(r.left + DX, 0, 1 - w)
        const nt = CLAMP(r.top  + DY, 0, 1 - h)
        onChange({ left: nl, top: nt, right: nl + w, bottom: nt + h })
        break
      }
    }
  }, [getRelativePos, onChange, value])

  const onPointerUp = useCallback(() => { dragging.current = null }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`

  const left   = pct(value.left)
  const top    = pct(value.top)
  const width  = pct(value.right - value.left)
  const height = pct(value.bottom - value.top)
  const midX   = pct((value.left + value.right) / 2)
  const midY   = pct((value.top + value.bottom) / 2)

  // Calibration segment drag
  const onCalibPointerDown = (point: 'p1' | 'p2') => (e: React.PointerEvent) => {
    e.preventDefault()
    calibDragging.current = point
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  useEffect(() => {
    if (!calibrationMode) return
    const move = (e: PointerEvent) => {
      if (!calibDragging.current || !onCalibrationChange) return
      const { rx, ry } = getRelativePos(e.clientX, e.clientY)
      const seg = calibrationSegment ?? { x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5 }
      if (calibDragging.current === 'p1') {
        onCalibrationChange({ ...seg, x1: CLAMP(rx), y1: CLAMP(ry) })
      } else {
        onCalibrationChange({ ...seg, x2: CLAMP(rx), y2: CLAMP(ry) })
      }
    }
    const up = () => { calibDragging.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [calibrationMode, calibrationSegment, getRelativePos, onCalibrationChange])

  const HANDLE_SIZE = 28
  const handleClass = "absolute bg-white border-2 border-forest-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing touch-none"
  const HS = `-${HANDLE_SIZE / 2}px`

  return (
    <div ref={containerRef} className="relative select-none">
      <img
        src={imageDataUrl}
        alt="Složaj"
        className="w-full rounded-lg"
        onLoad={e => {
          const img = e.currentTarget
          setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
        }}
        draggable={false}
      />

      {/* Selection rectangle */}
      <div
        className="absolute border-2 border-forest-400 bg-forest-400/10 cursor-move"
        style={{ left, top, width, height }}
        onPointerDown={onPointerDown('move')}
      >
        {/* Crosshair lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 border-t border-forest-300/50 border-dashed" />
          <div className="absolute left-1/2 top-0 bottom-0 border-l border-forest-300/50 border-dashed" />
        </div>
      </div>

      {/* Edge handles */}
      {/* Left */}
      <div
        className={`${handleClass} cursor-ew-resize`}
        style={{
          left: `calc(${left} + ${HS})`,
          top: midY,
          width: HANDLE_SIZE, height: HANDLE_SIZE,
          transform: 'translateY(-50%)'
        }}
        onPointerDown={onPointerDown('left')}
      />
      {/* Right */}
      <div
        className={`${handleClass} cursor-ew-resize`}
        style={{
          left: `calc(${pct(value.right)} + ${HS})`,
          top: midY,
          width: HANDLE_SIZE, height: HANDLE_SIZE,
          transform: 'translateY(-50%)'
        }}
        onPointerDown={onPointerDown('right')}
      />
      {/* Top */}
      <div
        className={`${handleClass} cursor-ns-resize`}
        style={{
          left: midX,
          top: `calc(${top} + ${HS})`,
          width: HANDLE_SIZE, height: HANDLE_SIZE,
          transform: 'translateX(-50%)'
        }}
        onPointerDown={onPointerDown('top')}
      />
      {/* Bottom */}
      <div
        className={`${handleClass} cursor-ns-resize`}
        style={{
          left: midX,
          top: `calc(${pct(value.bottom)} + ${HS})`,
          width: HANDLE_SIZE, height: HANDLE_SIZE,
          transform: 'translateX(-50%)'
        }}
        onPointerDown={onPointerDown('bottom')}
      />

      {/* Dimension labels */}
      <div
        className="absolute text-xs font-mono bg-forest-700 text-white px-1.5 py-0.5 rounded pointer-events-none"
        style={{ left, top: `calc(${top} - 22px)` }}
      >
        Š: {((value.right - value.left) * 100).toFixed(0)}% | V: {((value.bottom - value.top) * 100).toFixed(0)}%
      </div>

      {/* Calibration segment */}
      {calibrationMode && calibrationSegment && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <line
            x1={`${calibrationSegment.x1 * 100}%`}
            y1={`${calibrationSegment.y1 * 100}%`}
            x2={`${calibrationSegment.x2 * 100}%`}
            y2={`${calibrationSegment.y2 * 100}%`}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
        </svg>
      )}
      {calibrationMode && calibrationSegment && (
        <>
          <div
            className="absolute bg-amber-400 border-2 border-amber-700 rounded-full shadow pointer-events-auto cursor-grab touch-none"
            style={{
              left: `calc(${pct(calibrationSegment.x1)} - 12px)`,
              top:  `calc(${pct(calibrationSegment.y1)} - 12px)`,
              width: 24, height: 24
            }}
            onPointerDown={onCalibPointerDown('p1')}
          />
          <div
            className="absolute bg-amber-400 border-2 border-amber-700 rounded-full shadow pointer-events-auto cursor-grab touch-none"
            style={{
              left: `calc(${pct(calibrationSegment.x2)} - 12px)`,
              top:  `calc(${pct(calibrationSegment.y2)} - 12px)`,
              width: 24, height: 24
            }}
            onPointerDown={onCalibPointerDown('p2')}
          />
        </>
      )}
    </div>
  )
}
