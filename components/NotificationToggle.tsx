'use client'

import { Bell, BellOff } from 'lucide-react'
import { usePushNotification } from '@/hooks/usePushNotification'

const ACCENT = '#4f6ef7'

export default function NotificationToggle() {
  const { supported, subscribed, permission, loading, subscribe, unsubscribe } = usePushNotification()

  if (!supported) return null

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || permission === 'denied'}
      title={
        permission === 'denied'
          ? 'Notifikasi diblokir browser. Aktifkan di pengaturan browser.'
          : subscribed
            ? 'Nonaktifkan notifikasi'
            : 'Aktifkan notifikasi'
      }
      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-40"
      style={{
        background: subscribed ? 'var(--accent-soft)' : 'var(--surface-soft)',
        border: `1px solid ${subscribed ? 'rgba(79,110,247,0.25)' : 'var(--border-soft)'}`,
        color: subscribed ? ACCENT : 'var(--text-3)',
      }}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : subscribed ? (
        <Bell className="w-4 h-4 shrink-0" />
      ) : (
        <BellOff className="w-4 h-4 shrink-0" />
      )}
      <span className="text-xs font-medium">
        {loading
          ? 'Memproses...'
          : permission === 'denied'
            ? 'Notifikasi diblokir'
            : subscribed
              ? 'Notifikasi aktif'
              : 'Aktifkan notifikasi'}
      </span>
    </button>
  )
}
