import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TreePine, Download, BarChart2, SlidersHorizontal, X, Video, Camera, ChevronDown } from 'lucide-react'
import { Layout } from '../components/Layout'
import { MeasurementCard } from '../components/MeasurementCard'
import { ToastContainer } from '../components/ToastContainer'
import { useMeasurements } from '../hooks/useMeasurements'
import { useToast } from '../hooks/useToast'
import { exportToCSV } from '../utils/export'
import { summarizeMeasurements, formatDecimal } from '../utils/calculations'
import { WOOD_TYPE_OPTIONS } from '../utils/format'
import { saveMeasurement } from '../utils/db'
import type { Measurement, MeasurementStatus, WoodType, CaptureMode } from '../types'

type SortKey = 'date_desc' | 'date_asc' | 'vol_desc' | 'vol_asc'

interface Filters {
  search: string
  status: MeasurementStatus | 'all'
  woodType: WoodType | 'all'
  captureMode: CaptureMode | 'all'
  dateFrom: string
  dateTo: string
  sort: SortKey
}

const DEFAULTS: Filters = {
  search: '', status: 'all', woodType: 'all',
  captureMode: 'all', dateFrom: '', dateTo: '', sort: 'date_desc',
}

export function HistoryPage() {
  const navigate   = useNavigate()
  const { measurements, loading, remove } = useMeasurements()
  const { toasts, show: showToast, dismiss } = useToast()
  const [filters, setFilters] = useState<Filters>(DEFAULTS)
  const [showF, setShowF]     = useState(false)
  const undoMap = useRef<Record<string, Measurement>>({})

  const set = (k: keyof Filters, v: string) => setFilters(f => ({ ...f, [k]: v }))

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.status !== 'all') n++
    if (filters.woodType !== 'all') n++
    if (filters.captureMode !== 'all') n++
    if (filters.dateFrom) n++
    if (filters.dateTo) n++
    return n
  }, [filters])

  const filtered = useMemo(() => {
    let list = [...measurements]
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      list = list.filter(m =>
        m.location.toLowerCase().includes(q) ||
        m.woodType.toLowerCase().includes(q) ||
        (m.woodTypeCustom ?? '').toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q)
      )
    }
    if (filters.status !== 'all')      list = list.filter(m => m.status === filters.status)
    if (filters.woodType !== 'all')    list = list.filter(m => m.woodType === filters.woodType)
    if (filters.captureMode !== 'all') list = list.filter(m => m.captureMode === filters.captureMode)
    if (filters.dateFrom) list = list.filter(m => m.createdAt >= filters.dateFrom)
    if (filters.dateTo)   list = list.filter(m => m.createdAt <= filters.dateTo + 'T23:59:59')
    switch (filters.sort) {
      case 'date_desc': list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
      case 'date_asc':  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break
      case 'vol_desc':  list.sort((a, b) => b.volume - a.volume); break
      case 'vol_asc':   list.sort((a, b) => a.volume - b.volume); break
    }
    return list
  }, [measurements, filters])

  const stats = summarizeMeasurements(filtered)
  const hasActiveFilters = activeFilterCount > 0 || !!filters.search.trim()

  async function handleDelete(m: Measurement) {
    undoMap.current[m.id] = m
    await remove(m.id)
    showToast(`Obrisano: ${m.location || 'mjerenje'}`, {
      type: 'info',
      action: {
        label: 'Poništi',
        fn: async () => {
          const saved = undoMap.current[m.id]
          if (saved) { await saveMeasurement(saved); window.location.reload() }
        },
      },
    })
  }

  return (
    <Layout
      title="Historija mjerenja"
      back
      actions={
        <button onClick={() => filtered.length ? exportToCSV(filtered) : alert('Nema mjerenja za izvoz.')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Izvoz CSV">
          <Download className="w-5 h-5" />
        </button>
      }
    >
      <div className="flex flex-col gap-3 p-4 pb-8">

        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-forest-900 border border-stone-200 dark:border-forest-700 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input type="text" value={filters.search} onChange={e => set('search', e.target.value)}
              placeholder="Pretraži lokaciju, vrstu…"
              className="flex-1 bg-transparent text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none" />
            {filters.search && (
              <button onClick={() => set('search', '')}><X className="w-4 h-4 text-stone-400" /></button>
            )}
          </div>
          <button onClick={() => setShowF(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors
              ${showF || activeFilterCount > 0
                ? 'bg-forest-600 border-forest-600 text-white'
                : 'bg-white dark:bg-forest-900 border-stone-200 dark:border-forest-700 text-stone-600 dark:text-stone-400'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showF && (
          <div className="bg-white dark:bg-forest-900 border border-stone-200 dark:border-forest-700 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Filteri</span>
              {hasActiveFilters && (
                <button onClick={() => setFilters(DEFAULTS)} className="text-xs text-red-500 font-semibold">Resetuj sve</button>
              )}
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Sortiraj po</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([['date_desc','Datum ↓'],['date_asc','Datum ↑'],['vol_desc','m³ ↓'],['vol_asc','m³ ↑']] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} onClick={() => set('sort', k)}
                    className={`text-xs py-2 rounded-lg border font-medium transition-all
                      ${filters.sort === k
                        ? 'bg-forest-600 border-forest-600 text-white'
                        : 'border-stone-200 dark:border-forest-700 text-stone-500 dark:text-stone-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {(['all','procjena','provjereno','sporno'] as const).map(s => (
                  <button key={s} onClick={() => set('status', s)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                      ${filters.status === s ? 'bg-forest-600 border-forest-600 text-white' : 'border-stone-200 dark:border-forest-700 text-stone-500 dark:text-stone-400'}`}>
                    {s === 'all' ? 'Svi' : s === 'procjena' ? 'Procjena' : s === 'provjereno' ? 'Provjereno' : 'Sporno'}
                  </button>
                ))}
              </div>
            </div>

            {/* Method */}
            <div>
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Metoda</label>
              <div className="flex gap-1.5">
                {(['all','video','photo'] as const).map(mode => (
                  <button key={mode} onClick={() => set('captureMode', mode)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                      ${filters.captureMode === mode ? 'bg-forest-600 border-forest-600 text-white' : 'border-stone-200 dark:border-forest-700 text-stone-500 dark:text-stone-400'}`}>
                    {mode === 'video' && <Video className="w-3 h-3" />}
                    {mode === 'photo' && <Camera className="w-3 h-3" />}
                    {mode === 'all' ? 'Sve' : mode === 'video' ? 'Video' : 'Foto'}
                  </button>
                ))}
              </div>
            </div>

            {/* Wood type */}
            <div>
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Vrsta drveta</label>
              <div className="relative">
                <select value={filters.woodType} onChange={e => set('woodType', e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl border border-stone-200 dark:border-forest-700 bg-white dark:bg-forest-950 text-sm text-stone-700 dark:text-stone-300 outline-none focus:ring-1 focus:ring-forest-500">
                  <option value="all">Sve vrste</option>
                  {WOOD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              {[['dateFrom','Od datuma'],['dateTo','Do datuma']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">{l}</label>
                  <input type="date" value={filters[k as keyof Filters] as string} onChange={e => set(k as keyof Filters, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-forest-700 bg-white dark:bg-forest-950 text-sm text-stone-700 dark:text-stone-300 outline-none focus:ring-1 focus:ring-forest-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 bg-forest-50 dark:bg-forest-900 border border-forest-100 dark:border-forest-800 rounded-xl px-4 py-3">
            <BarChart2 className="w-4 h-4 text-forest-600 dark:text-forest-400 flex-shrink-0" />
            <div className="flex gap-4 text-xs text-stone-600 dark:text-stone-400 flex-wrap">
              <span><strong className="text-stone-800 dark:text-stone-200">{stats.count}</strong> mjerenja</span>
              <span><strong className="text-stone-800 dark:text-stone-200">{formatDecimal(stats.totalVolume, 2)}</strong> m³ ukupno</span>
              <span><strong className="text-stone-800 dark:text-stone-200">{formatDecimal(stats.avgVolume, 2)}</strong> m³ prosjek</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 animate-pulse text-stone-400">
            <div className="text-center">
              <TreePine className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">Učitavanje…</p>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <TreePine className="w-14 h-14 text-stone-200 dark:text-forest-800" />
            <h3 className="text-stone-600 dark:text-stone-400 font-medium">
              {hasActiveFilters ? 'Nema rezultata' : 'Još nema mjerenja'}
            </h3>
            {hasActiveFilters && (
              <button onClick={() => setFilters(DEFAULTS)} className="text-sm text-forest-600 dark:text-forest-400 font-semibold underline">Resetuj filtere</button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map(m => (
              <MeasurementCard key={m.id} measurement={m}
                onDelete={() => { handleDelete(m) }}
                onClick={() => navigate(`/mjerenje/${m.id}`)} />
            ))}
          </div>
        )}

      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Layout>
  )
}
