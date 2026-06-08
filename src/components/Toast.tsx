import { useEffect } from 'react'
import { useToastStore } from '../store/toastStore'
import { X, Trophy } from 'lucide-react'

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
    <div className="fixed bottom-28 left-5 right-5 z-50 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-card bg-surface px-5 py-4 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/30">
          <Trophy size={18} className="text-accent-deep" />
        </div>
        <p className="flex-1 text-sm font-bold text-foreground">{message}</p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1.5 text-muted"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
