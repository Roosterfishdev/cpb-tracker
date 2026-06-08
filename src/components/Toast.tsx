import { useEffect } from 'react'
import { useToastStore } from '../store/toastStore'
import { X } from 'lucide-react'

export function Toast() {
  const message = useToastStore((s) => s.message)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(dismiss, 3000)
    return () => clearTimeout(timer)
  }, [message, dismiss])

  if (!message) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-surface-elevated px-4 py-3 shadow-lg">
        <span className="text-lg">🏆</span>
        <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
