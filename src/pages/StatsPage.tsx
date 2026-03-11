import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TreePine, MapPin, BarChart2, Video, Camera, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useMeasurements } from '../hooks/useMeasurements'
import { formatDecimal } from '../utils/calculations'
import { woodTypeLabel, formatDateShort } from '../utils/format'
import type { Measurement } from '../types'

// ── Simple bar chart ──────────────────────────────────────────────────────────
function BarChart({ data, color = '#22c55e' }: { data: { label: string; value: number; sub?: string }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 0.001)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 text-xs text-stone-500 dark:text-stone-400 text-right truncate flex-shrink-0">{d.label}</div>
          <div className="flex-1 h-6 bg-stone-100 dark:bg-forest-800 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: color, minWidth: d.value > 0 ? '2rem' : 0 }}
            >
              <span className="text-xs font-mono font-bold text-white whitespace-nowrap">{formatDecimal(d.value, 2)}</span>
            </div>
          </div>
          {d.sub && <div className="text-xs text-stone-400 dark:text-stone-500 w-10 flex-shrink-0">{d.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Donut-like pill chart ─────────────────────────────────────────────────────
function PillChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} className="h-full transition-all duration-500" style={{ flex: d.value / total, background: d.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">{formatDecimal(d.value, 2)} m³</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trend mini-chart ──────────────────────────────────────────────────────────
function TrendLine({ measurements }: { measurements: Measurement[] }) {
  // Group by day (last 14 days)
  const days: Record<string, number> = {}
  const now = Date.now()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    days[d.toISOString().slice(0, 10)] = 0
  }
  measurements.forEach(m => {
    const day = m.createdAt.slice(0, 10)
    if (day in days) days[day] = (days[day] || 0) + m.volume
  })

  const vals = Object.values(days)
  const max = Math.max(...vals, 0.001)
  const labels = Object.keys(days)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 h-16">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{ height: `${(v / max) * 52}px`, minHeight: v > 0 ? '4px' : '2px', background: v > 0 ? '#22c55e' : '#1e3322' }}
              title={`${labels[i]}: ${formatDecimal(v, 2)} m³`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-stone-400 dark:text-stone-600">
        <span>{new Date(now - 13 * 86400000).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit' })}</span>
        <span>danas</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function StatsPage() {
  const navigate = useNavigate()
  const { measurements, loading } = useMeasurements()

  const stats = useMemo(() => {
    if (measurements.length === 0) return null

    const total = measurements.reduce((s, m) => s + m.volume, 0)
    const avg   = total / measurements.length

    // By wood type
    const byWood: Record<string, { vol: number; count: number }> = {}
    measurements.forEach(m => {
      const k = woodTypeLabel(m.woodType, m.woodTypeCustom)
      if (!byWood[k]) byWood[k] = { vol: 0, count: 0 }
      byWood[k].vol   += m.volume
      byWood[k].count += 1
    })

    // By location
    const byLoc: Record<string, number> = {}
    measurements.forEach(m => {
      const k = m.location || 'Bez lokacije'
      byLoc[k] = (byLoc[k] || 0) + m.volume
    })

    // By status
    const byStatus = {
      procjena:   measurements.filter(m => m.status === 'procjena').reduce((s, m) => s + m.volume, 0),
      provjereno: measurements.filter(m => m.status === 'provjereno').reduce((s, m) => s + m.volume, 0),
      sporno:     measurements.filter(m => m.status === 'sporno').reduce((s, m) => s + m.volume, 0),
    }

    // By method
    const videoCount = measurements.filter(m => m.captureMode === 'video').length
    const photoCount = measurements.filter(m => m.captureMode === 'photo').length

    // Recent (last 30d)
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
    const recent = measurements.filter(m => m.createdAt >= cutoff)
    const recentVol = recent.reduce((s, m) => s + m.volume, 0)

    // Largest / smallest
    const sorted = [...measurements].sort((a, b) => b.volume - a.volume)
    const largest  = sorted[0]
    const smallest = sorted[sorted.length - 1]

    return { total, avg, byWood, byLoc, byStatus, videoCount, photoCount, recentVol, recent, largest, smallest }
  }, [measurements])

  if (loading) return (
    <Layout title="Statistike" back>
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400 text-sm">Učitavanje...</div>
      </div>
    </Layout>
  )

  if (!stats || measurements.length === 0) return (
    <Layout title="Statistike" back>
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-8">
        <BarChart2 className="w-14 h-14 text-stone-200 dark:text-forest-800" />
        <h2 className="font-semibold text-stone-600 dark:text-stone-400">Nema podataka za statistiku</h2>
        <p className="text-sm text-stone-400 dark:text-stone-600">Dodaj barem jedno mjerenje pa se vrati ovdje.</p>
        <button onClick={() => navigate('/novo')}
          className="bg-forest-600 text-white px-6 py-3 rounded-xl text-sm font-semibold mt-2">
          Novo mjerenje
        </button>
      </div>
    </Layout>
  )

  const woodChartData = (Object.entries(stats.byWood) as [string, { vol: number; count: number }][])
    .sort((a, b) => b[1].vol - a[1].vol)
    .slice(0, 8)
    .map(([label, d]) => ({ label, value: Math.round(d.vol * 100) / 100, sub: `×${d.count}` }))

  const locChartData = (Object.entries(stats.byLoc) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))

  return (
    <Layout title="Statistike" back>
      <div className="p-4 flex flex-col gap-4 pb-10">

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BarChart2 className="w-4 h-4" />, label: 'Ukupno m³',   val: formatDecimal(stats.total, 2),   color: 'text-forest-600 dark:text-forest-300' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Prosjek m³',  val: formatDecimal(stats.avg, 2),    color: 'text-forest-600 dark:text-forest-300' },
            { icon: <TreePine className="w-4 h-4" />,   label: 'Mjerenja',    val: String(measurements.length),    color: 'text-bark-600 dark:text-bark-300' },
            { icon: <Clock className="w-4 h-4" />,      label: 'Zadnjih 30d', val: `${formatDecimal(stats.recentVol, 2)} m³`, color: 'text-blue-600 dark:text-blue-300' },
          ].map((k, i) => (
            <div key={i} className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
              <div className={`flex items-center gap-1.5 text-xs mb-2 ${k.color}`}>{k.icon}{k.label}</div>
              <div className={`font-mono text-xl font-bold ${k.color}`}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-forest-600 dark:text-forest-400" />
            <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Trend zadnjih 14 dana (m³/dan)</span>
          </div>
          <TrendLine measurements={measurements} />
        </div>

        {/* Method split */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-forest-600 dark:text-forest-400" />
            <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Metoda snimanja</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-100 dark:border-red-900/30">
              <Video className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <div className="font-mono font-bold text-lg text-red-600 dark:text-red-400">{stats.videoCount}</div>
              <div className="text-xs text-stone-400">Video</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900/30">
              <Camera className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <div className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">{stats.photoCount}</div>
              <div className="text-xs text-stone-400">Foto</div>
            </div>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-forest-600 dark:text-forest-400" />
            <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Raspodjela po statusu (m³)</span>
          </div>
          <PillChart data={[
            { label: 'Procjena',   value: stats.byStatus.procjena,   color: '#f59e0b' },
            { label: 'Provjereno', value: stats.byStatus.provjereno, color: '#22c55e' },
            { label: 'Sporno',     value: stats.byStatus.sporno,     color: '#ef4444' },
          ]} />
        </div>

        {/* By wood type */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <TreePine className="w-4 h-4 text-forest-600 dark:text-forest-400" />
            <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Po vrsti drveta (m³)</span>
          </div>
          <BarChart data={woodChartData} color="#16a34a" />
        </div>

        {/* By location */}
        {locChartData.length > 1 && (
          <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-forest-600 dark:text-forest-400" />
              <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Po lokaciji / odjelu (m³)</span>
            </div>
            <BarChart data={locChartData} color="#0284c7" />
          </div>
        )}

        {/* Records */}
        <div className="bg-white dark:bg-forest-900 rounded-xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Rekordna mjerenja</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Najveće', m: stats.largest,  badge: 'bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300' },
              { label: 'Najmanje', m: stats.smallest, badge: 'bg-stone-100 dark:bg-forest-800 text-stone-600 dark:text-stone-400' },
            ].map(({ label, m: rec, badge }) => (
              <button key={label} onClick={() => navigate(`/mjerenje/${rec.id}`)}
                className="flex items-center justify-between p-3 bg-stone-50 dark:bg-forest-950 rounded-xl hover:bg-stone-100 dark:hover:bg-forest-900 transition-colors">
                <div className="text-left">
                  <div className="text-xs text-stone-400 mb-0.5">{label}</div>
                  <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    {woodTypeLabel(rec.woodType, rec.woodTypeCustom)} · {rec.location || '—'}
                  </div>
                  <div className="text-xs text-stone-400">{formatDateShort(rec.createdAt)}</div>
                </div>
                <span className={`font-mono font-bold text-lg px-2 py-1 rounded-lg ${badge}`}>
                  {formatDecimal(rec.volume, 3)} m³
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
