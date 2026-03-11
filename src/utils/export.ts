import type { Measurement } from '../types'
import { formatDecimal } from './calculations'

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
  return str
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })
}

const WOOD: Record<string, string> = { jela:'Jela', smreka:'Smreka', bor:'Bor', bukva:'Bukva', hrast:'Hrast', grab:'Grab', jasen:'Jasen', topola:'Topola', ostalo:'Ostalo' }
const STATUS: Record<string, string> = { procjena:'Procjena', provjereno:'Provjereno', sporno:'Sporno' }

export function exportToCSV(measurements: Measurement[]): void {
  const headers = [
    'Datum','Vrijeme','Lokacija','Vrsta drveta','Metoda',
    'Broj presjeka','Dužina (m)','Prosj. širina (m)','Prosj. visina (m)',
    'Koeficijent','Zapremina (m3)',
    'GPS Lat','GPS Lng','GPS Tačnost (m)','Status','Napomena'
  ]

  const rows = measurements.map(m => [
    formatDate(m.createdAt), formatTime(m.createdAt), m.location,
    m.woodTypeCustom || WOOD[m.woodType] || m.woodType,
    m.captureMode === 'video' ? 'Video' : 'Foto',
    String(m.sections?.length ?? 0),
    formatDecimal(m.length, 2), formatDecimal(m.width, 2), formatDecimal(m.height, 2),
    formatDecimal(m.fillCoefficient, 2), formatDecimal(m.volume, 3),
    m.gps ? formatDecimal(m.gps.lat, 6) : '',
    m.gps ? formatDecimal(m.gps.lng, 6) : '',
    m.gps ? String(Math.round(m.gps.accuracy)) : '',
    STATUS[m.status] || m.status, m.notes
  ])

  const csv = ['\uFEFF', headers.join(';'), ...rows.map(r => r.map(escapeCSV).join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `premjer-slozaja-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
