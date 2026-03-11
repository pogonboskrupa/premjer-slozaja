import type { Measurement, CalibrationData, MarkerRect, LogSection } from '../types'

export function calculateEllipseArea(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0
  return Math.round((Math.PI * (width / 2) * (height / 2)) * 10000) / 10000
}

export function calculateVolume(l: number, w: number, h: number, k: number): number {
  if (l <= 0 || w <= 0 || h <= 0 || k <= 0) return 0
  return Math.round(calculateEllipseArea(w, h) * l * k * 1000) / 1000
}

export function calculateVolumeFromSections(sections: LogSection[], length: number, fill: number): number {
  if (!sections.length) return 0
  const avgArea = sections.reduce((s, x) => s + x.areaM2, 0) / sections.length
  return Math.round(avgArea * length * fill * 1000) / 1000
}

export function buildCalibration(pixelLength: number, realLength: number): CalibrationData {
  return { enabled: true, pixelLength, realLength, pixelsPerMeter: pixelLength / realLength }
}

export function estimateDimensionsFromPhoto(
  rect: MarkerRect, imgW: number, imgH: number, calib: CalibrationData
): { width: number; height: number } {
  const pw = (rect.right - rect.left) * imgW
  const ph = (rect.bottom - rect.top) * imgH
  return {
    width:  Math.round((pw / calib.pixelsPerMeter) * 100) / 100,
    height: Math.round((ph / calib.pixelsPerMeter) * 100) / 100,
  }
}

export function recalculateSectionsFromCalibration(
  sections: LogSection[],
  imgW: number,
  imgH: number,
  calibration: CalibrationData | null,
): LogSection[] {
  return sections.map(section => {
    if (!calibration) return { ...section, widthM: 0, heightM: 0, areaM2: 0 }

    const widthPx = (section.rect.right - section.rect.left) * imgW
    const heightPx = (section.rect.bottom - section.rect.top) * imgH
    const widthM = Math.round((widthPx / calibration.pixelsPerMeter) * 100) / 100
    const heightM = Math.round((heightPx / calibration.pixelsPerMeter) * 100) / 100

    return {
      ...section,
      widthM,
      heightM,
      areaM2: calculateEllipseArea(widthM, heightM),
    }
  })
}

export function parseDecimal(v: string): number {
  if (!v) return NaN
  return parseFloat(v.replace(',', '.'))
}

export function formatDecimal(v: number, d = 2): string {
  return isNaN(v) ? '-' : v.toFixed(d).replace('.', ',')
}

export function validateDimensions(length: number, fill: number): string[] {
  const e: string[] = []
  if (isNaN(length) || length <= 0) e.push('Duzina mora biti pozitivan broj.')
  if (isNaN(fill) || fill <= 0 || fill > 1) e.push('Koeficijent mora biti izmedju 0,01 i 1,00.')
  if (!isNaN(length) && length > 200) e.push('Duzina iznad 200 m je neobicna, provjeri unos.')
  return e
}

export function validateSection(w: number, h: number): string[] {
  const e: string[] = []
  if (isNaN(w) || w <= 0) e.push('Sirina mora biti pozitivan broj.')
  if (isNaN(h) || h <= 0) e.push('Visina mora biti pozitivan broj.')
  if (!isNaN(w) && w > 20) e.push('Sirina iznad 20 m je neobicna.')
  if (!isNaN(h) && h > 20) e.push('Visina iznad 20 m je neobicna.')
  return e
}

export function makeSection(id: number, widthM: number, heightM: number): LogSection {
  const areaM2 = calculateEllipseArea(widthM, heightM)
  const step = 1.0 / Math.max(id, 1)
  return {
    id,
    widthM,
    heightM,
    areaM2,
    rect: { left: (id - 1) * step, right: id * step, top: 0.08, bottom: 0.92 },
  }
}

export function avgSections(sections: LogSection[]) {
  if (!sections.length) return { width: 0, height: 0, area: 0 }
  const w = sections.reduce((s, x) => s + x.widthM, 0) / sections.length
  const h = sections.reduce((s, x) => s + x.heightM, 0) / sections.length
  const area = sections.reduce((s, x) => s + x.areaM2, 0) / sections.length
  return {
    width: Math.round(w * 100) / 100,
    height: Math.round(h * 100) / 100,
    area: Math.round(area * 10000) / 10000,
  }
}

export function summarizeMeasurements(list: Measurement[]) {
  const total = list.reduce((s, m) => s + m.volume, 0)
  return {
    count: list.length,
    totalVolume: Math.round(total * 1000) / 1000,
    avgVolume: list.length ? Math.round((total / list.length) * 1000) / 1000 : 0,
  }
}
