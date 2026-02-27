'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotification() {
  const [supported, setSupported]     = useState(false)
  const [subscribed, setSubscribed]   = useState(false)
  const [permission, setPermission]   = useState<NotificationPermission>('default')
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) setPermission(Notification.permission)

    // Cek status subscription dari server
    fetch('/api/push')
      .then(r => r.json())
      .then(d => { if (d.subscribed) setSubscribed(true) })
      .catch(() => {})
  }, [])

  const subscribe = async () => {
    if (!supported || !VAPID_PUBLIC) return
    setLoading(true)
    try {
      // Minta izin notifikasi
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast.error('Izin notifikasi ditolak')
        return
      }

      // Daftarkan service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Subscribe ke push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })

      // Kirim subscription ke server
      const subJson = sub.toJSON()
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan subscription')

      setSubscribed(true)
      toast.success('Notifikasi berhasil diaktifkan')
    } catch (err) {
      console.error('Subscribe error:', err)
      toast.error('Gagal mengaktifkan notifikasi')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
      }
      setSubscribed(false)
      toast.success('Notifikasi dinonaktifkan')
    } catch (err) {
      console.error('Unsubscribe error:', err)
      toast.error('Gagal menonaktifkan notifikasi')
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscribed, permission, loading, subscribe, unsubscribe }
}
