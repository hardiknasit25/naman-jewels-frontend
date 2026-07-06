import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'njadmin:pwa-dismissed'

/**
 * Shows an "Install this app" banner — only on mobile, only when the browser
 * reports the app is installable, and only if it isn't already installed.
 */
export function InstallPrompt() {
  const isMobile = useIsMobile()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      if (!sessionStorage.getItem(DISMISS_KEY)) setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches

  // Desktop never shows it; mobile only when installable and not installed.
  if (!isMobile || !visible || !deferred || isStandalone) return null

  const install = async () => {
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-popover p-3 shadow-xl">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-foreground">
          NJ
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Naman Jewels</p>
          <p className="truncate text-xs text-muted-foreground">
            Add to your home screen for an app-like experience.
          </p>
        </div>
        <Button size="sm" onClick={install}>
          <Download className="size-4" /> Install
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
