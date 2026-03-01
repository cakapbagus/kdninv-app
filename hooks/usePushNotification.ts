'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer
}

export function usePushNotification() {
  const [supported, setSupported]     = useState(false)
  const [subscribed, setSubscribed]   = useState(false)
  const [permission, setPermission]   = useState<NotificationPermission>('default')
  const [loading, setLoading]         = useState(false)
  const resolvePermissionRef = useRef<((val: string) => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) setPermission(Notification.permission)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Cek langsung saat mount
    if (Notification.permission === 'granted') {
      fetch('/api/push')
        .then(r => r.json())
        .then(d => { if (d.subscribed) setSubscribed(true) })
        .catch(() => {})
    }

    // Re-check setelah 5 detik untuk menangkap autoSubscribe yang baru selesai
    const timer = setTimeout(() => {
      if (Notification.permission !== 'granted') return
      fetch('/api/push')
        .then(r => r.json())
        .then(d => { if (d.subscribed) setSubscribed(true) })
        .catch(() => {})
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const subscribe = async () => {
    if (!supported || !VAPID_PUBLIC) return
    setLoading(true)
    try {
      let perm = Notification.permission
      if (perm === 'default') {
        perm = await new Promise<string>(resolve => {
          resolvePermissionRef.current = resolve
          Notification.requestPermission().then(resolve)
        }) as NotificationPermission
        resolvePermissionRef.current = null
      }

      // Minta izin notifikasi
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
      // toast.success('Notifikasi berhasil diaktifkan')
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
          // ← Simpan endpoint DULU sebelum unsubscribe
          const endpoint = sub.endpoint

          // ← Hapus dari server DULU, baru unsubscribe dari browser
          const res = await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
          })
          if (!res.ok) throw new Error('Gagal hapus subscription dari server')

          await sub.unsubscribe()
        } else {
          // Tidak ada subscription di browser, hapus semua milik user dari DB
          await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        }
      }
      setSubscribed(false)
      // toast.success('Notifikasi dinonaktifkan')
    } catch (err) {
      console.error('Unsubscribe error:', err)
      toast.error('Gagal menonaktifkan notifikasi')
    } finally {
      setLoading(false)
    }
  }

  const cancelPermission = () => {
    resolvePermissionRef.current?.('default')
  }

  return { supported, subscribed, permission, loading, subscribe, unsubscribe, cancelPermission }
}
