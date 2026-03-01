import { NextRequest, NextResponse } from 'next/server'
import { cookieName, getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (session) {
      let endpoint: string | null = null
      try {
        const body = await req.json()
        endpoint = body?.endpoint ?? null
      } catch { /* body kosong atau bukan JSON */ }

      if (endpoint) {
        // Hapus hanya endpoint browser ini saja
        await sql`
          DELETE FROM push_subscriptions
          WHERE user_id = ${session.sub} AND endpoint = ${endpoint}
        `
      } else {
        // Fallback: tidak ada endpoint dikirim, hapus semua milik user
        await sql`DELETE FROM push_subscriptions WHERE user_id = ${session.sub}`
      }
    }
  } catch {
    // Silent
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(cookieName())
  return response
}
