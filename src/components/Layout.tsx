import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Sun, Moon, WifiOff } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface LayoutProps { children: ReactNode; title?: string; back?: boolean; actions?: ReactNode }

export function Layout({ children, title, back, actions }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { dark, toggle } = useDarkMode()
  const online = useOnlineStatus()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-stone-900 border-b border-stone-800 text-stone-100">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          {back && !isHome && (
            <button onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg hover:bg-stone-800 active:bg-stone-700 transition-colors" aria-label="Nazad">
              <ArrowLeft className="w-5 h-5 text-stone-400" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {title ? (
              <h1 className="font-semibold text-base truncate text-stone-100">{title}</h1>
            ) : (
              <div>
                <div className="font-bold text-sm text-forest-300 leading-tight">Premjer Složaja Drveta</div>
                <div className="text-stone-500 text-xs leading-tight font-mono">terenski alat</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!online && (
              <div className="flex items-center gap-1 bg-amber-950 text-amber-400 border border-amber-800 px-2 py-1 rounded-full text-xs font-mono">
                <WifiOff className="w-3 h-3" /><span>Offline</span>
              </div>
            )}
            {actions}
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-stone-800 active:bg-stone-700 transition-colors" aria-label={dark ? 'Svijetli' : 'Tamni'}>
              {dark ? <Sun className="w-5 h-5 text-stone-400" /> : <Moon className="w-5 h-5 text-stone-400" />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full">{children}</main>
    </div>
  )
}
