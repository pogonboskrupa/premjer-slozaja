import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
          <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full text-center border border-stone-800">
            <h1 className="text-lg font-bold text-stone-100 mb-2">Greška u aplikaciji</h1>
            <p className="text-stone-400 text-sm mb-4">
              {this.state.error?.message || 'Došlo je do neočekivane greške.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Ponovo učitaj
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
