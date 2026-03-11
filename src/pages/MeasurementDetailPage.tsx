import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Trash2, RefreshCw, MapPin, AlertTriangle,
  Navigation, Video, Camera, Copy, Edit3, Check, X
} from 'lucide-react'
import { Layout } from '../components/Layout'
import { DisclaimerBanner } from '../components/DisclaimerBanner'
import { getMeasurement, deleteMeasurement, updateMeasurement, saveMeasurement } from '../utils/db'
import { ToastContainer } from '../components/ToastContainer'
import { useToast } from '../hooks/useToast'
import { woodTypeLabel, statusInfo, formatDateTime, STATUS_OPTIONS } from '../utils/format'
import { formatDecimal } from '../utils/calculations'
import { generateId } from '../utils/format'
import type { Measurement, MeasurementStatus } from '../types'

export function MeasurementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [m, setM]         = useState<Measurement | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState(false)
  const [noteVal, setNoteVal]         = useState('')
  const [duplicated, setDuplicated]   = useState(false)
  const { toasts, show: showToast, dismiss } = useToast()

  useEffect(() => {
    if (!id) return
    getMeasurement(id).then(data => {
      setM(data ?? null)
      setNoteVal(data?.notes ?? '')
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!m || !confirm('Obrisati ovo mjerenje?')) return
    await deleteMeasurement(m.id)
    navigate('/historija', { replace: true })
  }

  async function handleStatusChange(status: MeasurementStatus) {
    if (!m) return
    const updated = { ...m, status, updatedAt: new Date().toISOString() }
    await updateMeasurement(updated)
    setM(updated)
  }

  async function handleSaveNote() {
    if (!m) return
    const updated = { ...m, notes: noteVal, updatedAt: new Date().toISOString() }
    await updateMeasurement(updated)
    setM(updated)
    setEditingNote(false)
  }

  async function handleDuplicate() {
    if (!m) return
    const copy: Measurement = {
      ...m,
      id:        generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status:    'procjena',
      notes:     m.notes ? `Kopija: ${m.notes}` : 'Kopija mjerenja',
    }
    await saveMeasurement(copy)
    setDuplicated(true)
    showToast('Mjerenje kopirano!', { type: 'success' })
    setTimeout(() => setDuplicated(false), 2000)
  }

  if (loading) return (
    <Layout title="Detalji" back>
      <div className="flex items-center justify-center py-16 text-stone-400 dark:text-forest-600">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 bg-stone-200 dark:bg-forest-800 rounded-full mx-auto mb-3" />
          <p className="text-sm">Učitavanje...</p>
        </div>
      </div>
    </Layout>
  )

  if (!m) return (
    <Layout title="Detalji" back>
      <div className="flex flex-col items-center justify-center py-16 text-center p-4">
        <AlertTriangle className="w-12 h-12 text-red-300 mb-4" />
        <h2 className="font-semibold text-stone-600 dark:text-stone-400">Mjerenje nije pronađeno</h2>
        <button onClick={() => navigate('/historija')} className="mt-4 text-sm text-forest-600 underline">Nazad</button>
      </div>
    </Layout>
  )

  const si          = statusInfo(m.status)
  const hasSections = m.sections && m.sections.length > 0

  return (
    <Layout title="Detalji mjerenja" back>
      <div className="p-4 flex flex-col gap-4 pb-32">

        {/* Photo */}
        {m.photoDataUrl && (
          <div className="rounded-2xl overflow-hidden shadow-card relative">
            <img src={m.photoDataUrl} alt="Složaj" className="w-full" />
            <div className={`absolute top-2 left-2 flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full backdrop-blur-sm
              ${m.captureMode === 'video' ? 'bg-red-500/80 text-white' : 'bg-black/60 text-blue-300'}`}>
              {m.captureMode === 'video' ? <Video className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
              {m.captureMode === 'video' ? 'VIDEO' : 'FOTO'}
            </div>
            {hasSections && (
              <div className="absolute bottom-2 left-2 flex gap-1">
                {m.sections!.map(s => (
                  <span key={s.id} className="w-5 h-5 bg-amber-400 text-black text-[10px] font-bold rounded flex items-center justify-center">{s.id}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 shadow-card dark:shadow-card-dark flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Status</span>
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${si.color}`}>{si.label}</span>
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(so => (
              <button key={so.value} onClick={() => handleStatusChange(so.value)}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-all
                  ${m.status === so.value ? so.color + ' font-bold' : 'border-stone-200 dark:border-forest-700 text-stone-500 dark:text-stone-400'}`}>
                {so.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sections table */}
        {hasSections && (
          <div className="bg-white dark:bg-forest-900 rounded-xl shadow-card dark:shadow-card-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 dark:border-forest-800 flex items-center justify-between">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest">
                Poprečni presjeci · {m.sections!.length} detektovana
              </p>
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-4 py-2 text-[10px] font-mono text-stone-400 uppercase border-b border-stone-50 dark:border-forest-800">
              <span>#</span><span>Š (m)</span><span>H (m)</span><span>m²</span>
            </div>
            {m.sections!.map(s => (
              <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 items-center px-4 py-2.5 border-b border-stone-50 dark:border-forest-800 last:border-0">
                <span className="w-5 h-5 bg-amber-400 text-black text-[10px] font-bold rounded flex items-center justify-center">{s.id}</span>
                <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{formatDecimal(s.widthM, 2)}</span>
                <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{formatDecimal(s.heightM, 2)}</span>
                <span className="font-mono text-sm text-forest-600 dark:text-forest-400">{formatDecimal(s.areaM2, 3)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-forest-50 dark:bg-forest-800/50 border-t border-forest-100 dark:border-forest-800">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Prosj. presjek × {formatDecimal(m.length, 2)} m × k {formatDecimal(m.fillCoefficient, 2)}
              </span>
              <span className="font-mono font-bold text-forest-700 dark:text-forest-300 text-lg">
                {formatDecimal(m.volume, 3)} m³
              </span>
            </div>
          </div>
        )}

        {/* Data */}
        <div className="bg-white dark:bg-forest-900 rounded-xl shadow-card dark:shadow-card-dark overflow-hidden">
          {[
            { k: 'Datum i vrijeme',       v: formatDateTime(m.createdAt) },
            { k: 'Lokacija',              v: m.location || '—' },
            { k: 'Vrsta drveta',          v: woodTypeLabel(m.woodType, m.woodTypeCustom) },
            { k: 'Metoda',                v: m.captureMode === 'video' ? 'Video' : 'Fotografija' },
            { k: 'Dužina složaja',        v: `${formatDecimal(m.length, 2)} m` },
            ...(!hasSections ? [
              { k: 'Širina',   v: `${formatDecimal(m.width, 2)} m` },
              { k: 'Visina',   v: `${formatDecimal(m.height, 2)} m` },
            ] : []),
            { k: 'Koeficijent',           v: formatDecimal(m.fillCoefficient, 2) },
            { k: 'Procijenjena zapremina', v: `${formatDecimal(m.volume, 3)} m³`, highlight: true },
          ].map((row, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-3 gap-4 border-b border-stone-50 dark:border-forest-800 last:border-0
              ${(row as { highlight?: boolean }).highlight ? 'bg-forest-50 dark:bg-forest-800/50' : ''}`}>
              <span className="text-xs text-stone-500 dark:text-stone-400 flex-shrink-0">{row.k}</span>
              <span className={`text-sm font-medium text-right
                ${(row as { highlight?: boolean }).highlight
                  ? 'font-mono font-bold text-forest-700 dark:text-forest-300 text-base'
                  : 'text-stone-800 dark:text-stone-100'}`}>
                {row.v}
              </span>
            </div>
          ))}
        </div>

        {/* GPS */}
        {m.gps && (
          <div className="bg-white dark:bg-forest-900 rounded-xl p-4 shadow-card dark:shadow-card-dark">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-forest-600 dark:text-forest-400" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">GPS koordinate</span>
            </div>
            <p className="font-mono text-xs text-stone-600 dark:text-stone-400">
              {m.gps.lat.toFixed(6)}, {m.gps.lng.toFixed(6)}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">Tačnost: ±{Math.round(m.gps.accuracy)} m</p>
            <a href={`https://maps.google.com/?q=${m.gps.lat},${m.gps.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-forest-600 dark:text-forest-400 underline">
              <MapPin className="w-3 h-3" /> Otvori na karti
            </a>
          </div>
        )}

        {/* Notes (editable inline) */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 shadow-card dark:shadow-card-dark">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">Napomena</h3>
            {!editingNote ? (
              <button onClick={() => setEditingNote(true)}
                className="flex items-center gap-1 text-xs text-forest-600 dark:text-forest-400 hover:underline">
                <Edit3 className="w-3 h-3" /> Izmijeni
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSaveNote}
                  className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <Check className="w-3 h-3" /> Sačuvaj
                </button>
                <button onClick={() => { setEditingNote(false); setNoteVal(m.notes) }}
                  className="flex items-center gap-1 text-xs text-stone-400">
                  <X className="w-3 h-3" /> Otkaži
                </button>
              </div>
            )}
          </div>
          {editingNote ? (
            <textarea
              value={noteVal}
              onChange={e => setNoteVal(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-forest-700 bg-stone-50 dark:bg-forest-950 text-sm text-stone-700 dark:text-stone-300 resize-none outline-none focus:ring-1 focus:ring-forest-500"
              autoFocus
            />
          ) : (
            <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap min-h-[2rem]">
              {m.notes || <span className="text-stone-300 dark:text-stone-600 italic">Nema napomene</span>}
            </p>
          )}
        </div>

        <DisclaimerBanner />
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 dark:from-forest-950 to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto flex gap-2">
          <button onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 font-semibold py-3.5 px-4 rounded-xl text-sm">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={handleDuplicate}
            className={`flex items-center justify-center gap-1.5 border font-semibold py-3.5 px-4 rounded-xl text-sm transition-all
              ${duplicated
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 text-green-600'
                : 'bg-white dark:bg-forest-900 border-stone-200 dark:border-forest-700 text-stone-600 dark:text-stone-400'}`}>
            {duplicated ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {duplicated ? 'Kopirano!' : 'Kopiraj'}
          </button>
          <button onClick={() => navigate('/novo')}
            className="flex-1 flex items-center justify-center gap-2 bg-forest-600 text-white font-semibold py-3.5 rounded-xl text-sm shadow-lg">
            <RefreshCw className="w-4 h-4" />
            Novo mjerenje
          </button>
        </div>
      </div>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </Layout>
  )
}
