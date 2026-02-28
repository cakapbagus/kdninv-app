import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name } = await req.json()

  if (full_name === undefined)
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

  const newName = full_name?.trim() || null

  await sql`
    UPDATE users SET full_name = ${newName}, updated_at = NOW()
    WHERE id = ${session.sub}
  `
  return NextResponse.json({ success: true, full_name: newName })
}
