import type { CalibrationData, LogSection } from '../types'
import { calculateEllipseArea } from './calculations'

interface ComponentStats {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
}

export function detectSectionsFromImageData(
  imageData: ImageData,
  calibration: CalibrationData | null,
): LogSection[] {
  const width = imageData.width
  const height = imageData.height
  if (width === 0 || height === 0) return []

  const gray = toGray(imageData)
  const edges = sobel(gray, width, height)
  const binary = thresholdEdges(edges)
  const dilated = dilate(binary, width, height)
  const components = connectedComponents(dilated, width, height)

  const candidates = components
    .map(component => toSection(component, width, height, calibration))
    .filter((section): section is LogSection => section !== null)

  return dedupeCandidates(candidates)
    .sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left))
    .map((section, index) => ({ ...section, id: index + 1 }))
}

export function detectSectionsFromFrames(
  frames: ImageData[],
  calibration: CalibrationData | null,
): LogSection[] {
  if (frames.length === 0) return []

  let best: LogSection[] = []
  let bestScore = -1

  for (const frame of frames) {
    const detected = detectSectionsFromImageData(frame, calibration)
    const score = scoreSections(detected)
    if (score > bestScore) {
      best = detected
      bestScore = score
    }
  }

  return best
}

function toGray(imageData: ImageData): Float32Array {
  const out = new Float32Array(imageData.width * imageData.height)
  for (let i = 0; i < out.length; i++) {
    const idx = i * 4
    out[i] = (
      imageData.data[idx] * 0.299 +
      imageData.data[idx + 1] * 0.587 +
      imageData.data[idx + 2] * 0.114
    )
  }
  return out
}

function sobel(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const gx =
        -gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1] +
        gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1]
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1]
      out[i] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  return out
}

function thresholdEdges(edges: Float32Array): Uint8Array {
  let sum = 0
  let sumSq = 0
  for (const value of edges) {
    sum += value
    sumSq += value * value
  }
  const mean = sum / edges.length
  const variance = Math.max(0, (sumSq / edges.length) - mean * mean)
  const threshold = mean + Math.sqrt(variance) * 0.9
  const out = new Uint8Array(edges.length)
  for (let i = 0; i < edges.length; i++) {
    out[i] = edges[i] >= threshold ? 1 : 0
  }
  return out
}

function dilate(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      let on = 0
      for (let oy = -1; oy <= 1 && !on; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (mask[(y + oy) * width + (x + ox)] === 1) {
            on = 1
            break
          }
        }
      }
      out[i] = on
    }
  }
  return out
}

function connectedComponents(mask: Uint8Array, width: number, height: number): ComponentStats[] {
  const seen = new Uint8Array(mask.length)
  const components: ComponentStats[] = []

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || seen[start] === 1) continue

    const queue = [start]
    seen[start] = 1
    let head = 0
    const stats: ComponentStats = {
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
      count: 0,
    }

    while (head < queue.length) {
      const current = queue[head++]
      const x = current % width
      const y = Math.floor(current / width)
      stats.minX = Math.min(stats.minX, x)
      stats.minY = Math.min(stats.minY, y)
      stats.maxX = Math.max(stats.maxX, x)
      stats.maxY = Math.max(stats.maxY, y)
      stats.count += 1

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue
          const nx = x + ox
          const ny = y + oy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const next = ny * width + nx
          if (mask[next] === 0 || seen[next] === 1) continue
          seen[next] = 1
          queue.push(next)
        }
      }
    }

    components.push(stats)
  }

  return components
}

function toSection(
  component: ComponentStats,
  imageWidth: number,
  imageHeight: number,
  calibration: CalibrationData | null,
): LogSection | null {
  const widthPx = component.maxX - component.minX + 1
  const heightPx = component.maxY - component.minY + 1
  if (widthPx < 18 || heightPx < 18) return null
  if (widthPx > imageWidth * 0.45 || heightPx > imageHeight * 0.45) return null

  const aspect = widthPx / heightPx
  if (aspect < 0.55 || aspect > 1.8) return null

  const fill = component.count / (widthPx * heightPx)
  if (fill < 0.08 || fill > 0.82) return null

  const rect = {
    left: component.minX / imageWidth,
    top: component.minY / imageHeight,
    right: (component.maxX + 1) / imageWidth,
    bottom: (component.maxY + 1) / imageHeight,
  }

  const widthM = calibration ? Math.round((widthPx / calibration.pixelsPerMeter) * 100) / 100 : 0
  const heightM = calibration ? Math.round((heightPx / calibration.pixelsPerMeter) * 100) / 100 : 0

  return {
    id: 0,
    widthM,
    heightM,
    areaM2: calibration ? calculateEllipseArea(widthM, heightM) : 0,
    rect,
  }
}

function dedupeCandidates(sections: LogSection[]): LogSection[] {
  const sorted = [...sections].sort((a, b) => areaScore(b) - areaScore(a))
  const kept: LogSection[] = []

  for (const candidate of sorted) {
    const overlaps = kept.some(existing => intersectionOverUnion(existing, candidate) > 0.45)
    if (!overlaps) kept.push(candidate)
  }

  return kept
}

function intersectionOverUnion(a: LogSection, b: LogSection): number {
  const left = Math.max(a.rect.left, b.rect.left)
  const right = Math.min(a.rect.right, b.rect.right)
  const top = Math.max(a.rect.top, b.rect.top)
  const bottom = Math.min(a.rect.bottom, b.rect.bottom)
  const overlapW = Math.max(0, right - left)
  const overlapH = Math.max(0, bottom - top)
  const intersection = overlapW * overlapH
  const areaA = (a.rect.right - a.rect.left) * (a.rect.bottom - a.rect.top)
  const areaB = (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top)
  const union = areaA + areaB - intersection
  return union > 0 ? intersection / union : 0
}

function areaScore(section: LogSection): number {
  return (section.rect.right - section.rect.left) * (section.rect.bottom - section.rect.top)
}

function scoreSections(sections: LogSection[]): number {
  if (!sections.length) return -1
  const covered = sections.reduce((sum, section) => sum + areaScore(section), 0)
  return sections.length * 10 + covered
}
