import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

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
    <div className="fixed top-4 left-5 right-5 z-50 mx-auto max-w-md">
      <div className="flex items-start gap-3 rounded-card bg-surface px-5 py-4 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/30">
          <Download size={18} className="text-accent-deep" />
        </div>
        <div className="flex-1 text-sm">
          {isIos ? (
            <p className="font-semibold text-foreground">
              Install CPB Tracker: tap Share, then &quot;Add to Home Screen&quot;.
            </p>
          ) : (
            <p className="font-semibold text-foreground">
              Install CPB Tracker for the best experience.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!isIos && deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-foreground"
            >
              Install
            </button>
          )}
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
    </div>
  )
}
