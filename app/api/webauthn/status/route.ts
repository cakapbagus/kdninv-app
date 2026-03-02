import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET — cek apakah user sudah punya credential terdaftar
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ registered: false })

  const rows = await sql`
    SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = ${session.sub}
  `
  const count = Number(rows[0]?.count ?? 0)
  return NextResponse.json({ registered: count > 0 })
}
