import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id, username, full_name, role, created_at, updated_at
    FROM users WHERE id = ${session.sub}
  `
  const user = rows[0]
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  return NextResponse.json(user)
}
