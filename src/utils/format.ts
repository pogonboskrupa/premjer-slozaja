import type { WoodType, MeasurementStatus } from '../types'

export const WOOD_TYPE_OPTIONS: { value: WoodType; label: string }[] = [
  { value: 'jela',    label: 'Jela' },
  { value: 'smreka',  label: 'Smreka' },
  { value: 'bor',     label: 'Bor' },
  { value: 'bukva',   label: 'Bukva' },
  { value: 'hrast',   label: 'Hrast' },
  { value: 'grab',    label: 'Grab' },
  { value: 'jasen',   label: 'Jasen' },
  { value: 'topola',  label: 'Topola' },
  { value: 'ostalo',  label: 'Ostalo' },
]

export const STATUS_OPTIONS: { value: MeasurementStatus; label: string; color: string }[] = [
  { value: 'procjena',   label: 'Procjena',   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'provjereno', label: 'Provjereno', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'sporno',     label: 'Sporno',     color: 'text-red-600 bg-red-50 border-red-200' },
]

export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('bs-BA', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('bs-BA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function woodTypeLabel(type: WoodType, custom?: string): string {
  if (type === 'ostalo' && custom) return custom
  return WOOD_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
}

export function statusInfo(status: MeasurementStatus) {
  return STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
