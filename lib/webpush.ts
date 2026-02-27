import webpush from 'web-push'
import { sql } from '@/lib/db'

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

// Kirim notif ke semua subscriber dengan role tertentu
export async function sendPushToRoles(roles: string[], payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  try {
    const subs = await sql`
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.role = ANY(${roles})
    `

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    )

    // Hapus subscription yang expired (410 Gone)
    const expired: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number }
        if (err?.statusCode === 410) expired.push(subs[i].endpoint)
      }
    })
    if (expired.length > 0) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expired})`
    }
  } catch (err) {
    console.error('Push notification error:', err)
  }
}

// Kirim notif ke user tertentu
export async function sendPushToUser(userId: string | number, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  try {
    const subs = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    )

    const expired: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number }
        if (err?.statusCode === 410) expired.push(subs[i].endpoint)
      }
    })
    if (expired.length > 0) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expired})`
    }
  } catch (err) {
    console.error('Push notification error:', err)
  }
}
