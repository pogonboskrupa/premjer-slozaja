import { describe, it, expect } from 'vitest'
import {
  calculateEllipseArea,
  calculateVolume,
  parseDecimal,
  formatDecimal,
  validateDimensions,
  estimateDimensionsFromPhoto,
  buildCalibration,
  summarizeMeasurements,
  recalculateSectionsFromCalibration,
} from './calculations'
import type { Measurement } from '../types'

describe('calculateEllipseArea', () => {
  it('computes ellipse area from width and height', () => {
    expect(calculateEllipseArea(1.2, 1.0)).toBeCloseTo(0.9425, 4)
  })
})

describe('calculateVolume', () => {
  it('computes ellipse based volume', () => {
    expect(calculateVolume(4, 1.2, 1.1, 0.65)).toBeCloseTo(2.695, 3)
  })

  it('returns 0 for invalid inputs', () => {
    expect(calculateVolume(0, 1, 1, 0.65)).toBe(0)
    expect(calculateVolume(4, 0, 1, 0.65)).toBe(0)
    expect(calculateVolume(-1, 1, 1, 0.65)).toBe(0)
  })
})

describe('parseDecimal', () => {
  it('parses dot decimals', () => {
    expect(parseDecimal('3.14')).toBeCloseTo(3.14)
  })

  it('parses comma decimals', () => {
    expect(parseDecimal('3,14')).toBeCloseTo(3.14)
  })

  it('returns NaN for empty string', () => {
    expect(parseDecimal('')).toBeNaN()
  })
})

describe('formatDecimal', () => {
  it('uses comma as separator', () => {
    expect(formatDecimal(3.14159, 2)).toBe('3,14')
  })

  it('returns dash for NaN', () => {
    expect(formatDecimal(Number.NaN, 2)).toBe('-')
  })
})

describe('validateDimensions', () => {
  it('passes for valid inputs', () => {
    expect(validateDimensions(4, 0.65)).toHaveLength(0)
  })

  it('catches invalid inputs', () => {
    expect(validateDimensions(0, 0.65).some(e => e.includes('Duzina'))).toBe(true)
    expect(validateDimensions(4, 1.5).some(e => e.includes('Koeficijent'))).toBe(true)
  })
})

describe('buildCalibration and estimateDimensionsFromPhoto', () => {
  it('converts pixel size to meters', () => {
    const calib = buildCalibration(100, 1)
    const dims = estimateDimensionsFromPhoto(
      { left: 0, top: 0, right: 0.5, bottom: 0.3 },
      1000,
      1000,
      calib,
    )
    expect(dims.width).toBeCloseTo(5)
    expect(dims.height).toBeCloseTo(3)
  })
})

describe('recalculateSectionsFromCalibration', () => {
  it('rebuilds metric dimensions from normalized rects', () => {
    const calib = buildCalibration(200, 1)
    const updated = recalculateSectionsFromCalibration([
      {
        id: 1,
        widthM: 0,
        heightM: 0,
        areaM2: 0,
        rect: { left: 0.1, right: 0.3, top: 0.2, bottom: 0.4 },
      },
    ], 1000, 1000, calib)

    expect(updated[0].widthM).toBeCloseTo(1)
    expect(updated[0].heightM).toBeCloseTo(1)
    expect(updated[0].areaM2).toBeCloseTo(0.7854, 4)
  })
})

describe('summarizeMeasurements', () => {
  it('sums volumes', () => {
    const dummy: Partial<Measurement>[] = [{ volume: 2.5 }, { volume: 3.5 }]
    const s = summarizeMeasurements(dummy as Measurement[])
    expect(s.totalVolume).toBeCloseTo(6.0, 3)
    expect(s.avgVolume).toBeCloseTo(3.0, 3)
    expect(s.count).toBe(2)
  })
})
