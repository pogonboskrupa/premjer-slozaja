import { AlertTriangle } from 'lucide-react'

export function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2.5 bg-amber-950/60 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-300">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
      <p><strong>Procjena:</strong> Rezultati su operativna procjena, ne službeni premjer. Za zvanične potrebe potvrditi klasičnim mjerenjem.</p>
    </div>
  )
}
