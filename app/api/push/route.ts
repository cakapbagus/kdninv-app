import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET: cek status subscription user saat ini
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subs = await sql`
    SELECT id FROM push_subscriptions WHERE user_id = ${session.sub}
  `
  return NextResponse.json({ subscribed: subs.length > 0 })
}

// POST: simpan subscription baru
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Data subscription tidak valid' }, { status: 400 })
  }

  // Upsert — kalau endpoint sudah ada update saja
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${session.sub}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = ${session.sub},
      p256dh  = ${keys.p256dh},
      auth    = ${keys.auth},
      updated_at = NOW()
  `
  return NextResponse.json({ success: true })
}

// DELETE: hapus subscription
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (endpoint) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${session.sub}`
  } else {
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${session.sub}`
  }
  return NextResponse.json({ success: true })
}
