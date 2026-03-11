import { useNavigate } from 'react-router-dom'
import { Plus, History, Download, Camera, BarChart2, ChevronRight, AlertTriangle, TreePine, WifiOff } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useMeasurements } from '../hooks/useMeasurements'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { exportToCSV } from '../utils/export'
import { summarizeMeasurements, formatDecimal } from '../utils/calculations'
import { woodTypeLabel, formatDateShort, statusInfo } from '../utils/format'

export function HomePage() {
  const navigate = useNavigate()
  const { measurements, loading } = useMeasurements()
  const online = useOnlineStatus()
  const stats = summarizeMeasurements(measurements)
  const recent = measurements.slice(0, 3)

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-4 pb-32">

        {/* Offline banner */}
        {!online && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>Radite <strong>offline</strong> — sva mjerenja se čuvaju lokalno</span>
          </div>
        )}

        {/* Hero */}
        <div className="bg-gradient-to-br from-forest-700 to-forest-800 dark:from-forest-800 dark:to-forest-900 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-6" />
          <div className="flex items-center gap-2 mb-1 relative">
            <TreePine className="w-5 h-5 text-forest-200" />
            <span className="text-forest-200 text-xs font-mono uppercase tracking-wider">Šumarski terenski alat</span>
          </div>
          <div className="font-bold text-lg text-white mb-4 relative">Premjer Složaja Drveta</div>

          {!loading && measurements.length > 0 && (
            <div className="grid grid-cols-3 gap-2 relative">
              {[
                { val: String(stats.count),                    lbl: 'Mjerenja' },
                { val: `${formatDecimal(stats.totalVolume,1)}`, lbl: 'Ukupno m³' },
                { val: `${formatDecimal(stats.avgVolume,1)}`,   lbl: 'Prosjek m³' },
              ].map((s, i) => (
                <div key={i} className="bg-black/20 rounded-xl p-3 text-center backdrop-blur-sm">
                  <div className="font-mono font-bold text-lg text-white">{s.val}</div>
                  <div className="text-forest-300 text-xs mt-0.5">{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && measurements.length === 0 && (
            <p className="text-forest-300 text-sm">Još nema mjerenja. Dodaj prvo klikom ispod.</p>
          )}
        </div>

        {/* Main actions */}
        <div className="flex flex-col gap-2.5">
          {[
            {
              icon: <Plus className="w-6 h-6" />,
              color: 'bg-forest-100 dark:bg-forest-800 text-forest-600 dark:text-forest-300',
              title: 'Novo mjerenje',
              desc: 'Snimi složaj video ili foto metodom',
              action: () => navigate('/novo'),
            },
            {
              icon: <History className="w-6 h-6" />,
              color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
              title: 'Historija mjerenja',
              desc: loading ? '...' : `${measurements.length} mjerenja · pretraži i filtriraj`,
              action: () => navigate('/historija'),
            },
            {
              icon: <BarChart2 className="w-6 h-6" />,
              color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
              title: 'Statistike',
              desc: 'Grafovi po vrsti drveta, odjelu i trendu',
              action: () => navigate('/statistike'),
            },
            {
              icon: <Download className="w-6 h-6" />,
              color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
              title: 'Izvoz CSV',
              desc: 'Preuzmi sva mjerenja za Excel',
              action: () => measurements.length ? exportToCSV(measurements) : alert('Nema mjerenja za izvoz.'),
            },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="flex items-center gap-4 bg-white dark:bg-forest-900 rounded-2xl p-4 shadow-card dark:shadow-card-dark active:scale-[0.98] transition-transform text-left border border-stone-100 dark:border-forest-800">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-stone-800 dark:text-stone-100">{item.title}</div>
                <div className="text-xs text-stone-400 dark:text-stone-500 truncate">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Recent measurements */}
        {recent.length > 0 && (
          <div className="bg-white dark:bg-forest-900 rounded-2xl border border-stone-100 dark:border-forest-800">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-mono text-stone-400 dark:text-forest-500 uppercase tracking-widest">Zadnja mjerenja</span>
              <button onClick={() => navigate('/historija')} className="text-xs text-forest-600 dark:text-forest-400 font-semibold">
                Sva →
              </button>
            </div>
            {recent.map((m, i) => {
              const si = statusInfo(m.status)
              return (
                <button key={m.id} onClick={() => navigate(`/mjerenje/${m.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-forest-800 transition-colors
                    ${i < recent.length - 1 ? 'border-b border-stone-50 dark:border-forest-800' : ''}`}>
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-forest-100 dark:bg-forest-800 flex-shrink-0">
                    {m.photoDataUrl
                      ? <img src={m.photoDataUrl} alt="" className="w-full h-full object-cover" />
                      : <TreePine className="w-full h-full p-2 text-forest-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-700 dark:text-stone-300 truncate">
                      {woodTypeLabel(m.woodType, m.woodTypeCustom)} · {m.location || '—'}
                    </div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">{formatDateShort(m.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-forest-600 dark:text-forest-300">
                      {formatDecimal(m.volume, 3)} m³
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${si.color}`}>{si.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Tips */}
        <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-forest-600 dark:text-forest-400" />
            <h2 className="font-semibold text-sm text-stone-800 dark:text-stone-100">Kako pravilno snimiti složaj</h2>
          </div>
          <ul className="space-y-2">
            {[
              'Stani frontalno ispred složaja',
              'Drži kameru horizontalno — obuhvati cijeli složaj',
              'VIDEO: sporo snimai od jednog do drugog kraja',
              'Koristi referentnu letvu 1 m za kalibraciju',
              'Provjeri presjeke prije konačnog spremanja',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="w-4 h-4 bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 rounded flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p><strong>Važno:</strong> Rezultati su operativna procjena, ne službeni geodetski premjer. Za zvanične potrebe obavezno potvrditi klasičnim mjerenjem.</p>
        </div>

      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 dark:from-forest-950 to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button onClick={() => navigate('/novo')}
            className="w-full flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 active:bg-forest-800 text-white font-semibold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-base">
            <Plus className="w-6 h-6" />
            Novo mjerenje
          </button>
        </div>
      </div>
    </Layout>
  )
}
