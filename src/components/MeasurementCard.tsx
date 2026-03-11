import { Trash2, ChevronRight, MapPin, TreePine, Video, Camera } from 'lucide-react'
import type { Measurement } from '../types'
import { formatDateShort, woodTypeLabel, statusInfo } from '../utils/format'
import { formatDecimal } from '../utils/calculations'

interface Props { measurement: Measurement; onDelete: () => void; onClick: () => void }

export function MeasurementCard({ measurement: m, onDelete, onClick }: Props) {
  const si    = statusInfo(m.status)
  const thumb = m.photoDataUrl
  const nSec  = m.sections?.length ?? 0

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
      <button onClick={onClick} className="w-full text-left p-4 flex gap-3 items-start active:bg-stone-800/50 transition-colors">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-stone-800 flex items-center justify-center relative">
          {thumb ? (
            <>
              <img src={thumb} alt="" className="w-full h-full object-cover" />
              <div className={`absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center rounded-tl-lg
                ${m.captureMode === 'video' ? 'bg-red-600' : 'bg-blue-600'}`}>
                {m.captureMode === 'video'
                  ? <Video className="w-2.5 h-2.5 text-white" />
                  : <Camera className="w-2.5 h-2.5 text-white" />}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <TreePine className="w-6 h-6 text-stone-600" />
              <div className={`w-3 h-3 flex items-center justify-center rounded ${m.captureMode === 'video' ? 'bg-red-900' : 'bg-blue-900'}`}>
                {m.captureMode === 'video'
                  ? <Video className="w-2 h-2 text-red-400" />
                  : <Camera className="w-2 h-2 text-blue-400" />}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-semibold text-sm text-stone-100 truncate">{woodTypeLabel(m.woodType, m.woodTypeCustom)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${si.color}`}>{si.label}</span>
          </div>
          {m.location && (
            <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{m.location}</span>
              {nSec > 0 && <span className="flex-shrink-0 text-amber-600 font-mono ml-1">· {nSec}×</span>}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500">{formatDateShort(m.createdAt)}</div>
            <div className="font-mono font-bold text-sm text-forest-300">{formatDecimal(m.volume, 3)} m³</div>
          </div>
          <div className="text-xs text-stone-600 mt-0.5">
            {formatDecimal(m.length, 1)} m
            {nSec > 0 ? ` · ${nSec} presjeka` : ` · ${formatDecimal(m.width,1)}×${formatDecimal(m.height,1)} m`}
            {' · k='}{formatDecimal(m.fillCoefficient, 2)}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-600 flex-shrink-0 mt-1" />
      </button>

      <div className="border-t border-stone-800/60 px-4 py-2 flex justify-end">
        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete() }}
          className="flex items-center gap-1.5 text-xs text-red-500 py-1 px-2 rounded-lg hover:bg-red-950 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Obriši
        </button>
      </div>
    </div>
  )
}
