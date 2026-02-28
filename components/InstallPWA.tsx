'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { ACCENT } from '@/lib/constants'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Cek apakah sudah berjalan sebagai PWA (standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  // Tidak tampil jika sudah installed (PWA mode) atau prompt tidak tersedia
  if (isInstalled || !prompt) return null

  return (
    <button
      onClick={handleInstall}
      className="fixed top-2 right-2 md:top-6 md:right-12 z-50 flex items-center gap-2 px-3 py-2 md:px-5 md:py-3 rounded-2xl
        text-xs md:text-sm font-thin md:font-semibold !text-white shadow-lg transition-all hover:opacity-90 active:scale-95 animate-fadeInUp"
      style={{
        background: `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
      }}
    >
      <Download className="w-4 h-4" />
      Install App
    </button>
  )
}
