import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'cpb-install-hint-dismissed'

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function InstallHint() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos] = useState(isIOS())

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (isIos) {
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIos])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      dismiss()
    }
  }

  if (!visible) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-surface-elevated px-4 py-3 shadow-lg">
        <div className="flex-1 text-sm">
          {isIos ? (
            <p className="text-foreground">
              Install CPB Tracker: tap Share, then &quot;Add to Home Screen&quot;.
            </p>
          ) : (
            <p className="text-foreground">
              Install CPB Tracker for the best experience.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!isIos && deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-background"
            >
              Install
            </button>
          )}
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
    </div>
  )
}
