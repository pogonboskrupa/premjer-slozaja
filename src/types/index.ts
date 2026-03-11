export type MeasurementStatus = 'procjena' | 'provjereno' | 'sporno'
export type CaptureMode = 'video' | 'photo'

export type WoodType =
  | 'jela' | 'smreka' | 'bor' | 'bukva'
  | 'hrast' | 'grab' | 'jasen' | 'topola' | 'ostalo'

export interface GpsCoordinates {
  lat: number; lng: number; accuracy: number
}

export interface MarkerRect {
  left: number; top: number; right: number; bottom: number
}

export interface CalibrationData {
  enabled: boolean
  pixelLength: number
  realLength: number
  pixelsPerMeter: number
}

/** One cross-section of the log stack */
export interface LogSection {
  id: number
  widthM: number
  heightM: number
  areaM2: number
  rect: MarkerRect
}

export interface Measurement {
  id: string
  createdAt: string
  updatedAt: string
  captureMode: CaptureMode
  location: string
  gps?: GpsCoordinates
  woodType: WoodType
  woodTypeCustom?: string
  length: number
  fillCoefficient: number
  width: number          // avg width (for display/compat)
  height: number         // avg height
  sections?: LogSection[]
  photoDataUrl?: string
  markerRect?: MarkerRect
  calibration?: CalibrationData
  volume: number
  status: MeasurementStatus
  notes: string
  mode: 'manual' | 'photo' | 'video'
}
