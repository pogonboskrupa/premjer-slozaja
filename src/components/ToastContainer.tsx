import { X } from 'lucide-react'
import type { Toast } from '../hooks/useToast'

interface Props {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 w-full max-w-sm rounded-2xl shadow-xl px-4 py-3 pointer-events-auto
            animate-[slide-up_0.25s_ease-out]
            ${t.type === 'error'   ? 'bg-red-600 text-white'
            : t.type === 'success' ? 'bg-green-700 text-white'
            :                        'bg-stone-800 text-white dark:bg-forest-800'}`}>
          <span className="flex-1 text-sm font-medium leading-tight">{t.message}</span>
          {t.action && (
            <button onClick={() => { t.action!.fn(); onDismiss(t.id) }}
              className="text-xs font-bold underline underline-offset-2 flex-shrink-0 opacity-90 hover:opacity-100">
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
