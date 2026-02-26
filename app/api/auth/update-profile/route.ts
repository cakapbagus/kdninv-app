import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name, password } = await req.json()

  if (!full_name?.trim())
    return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })
  if (!password)
    return NextResponse.json({ error: 'Password wajib diisi untuk konfirmasi' }, { status: 400 })

  const rows = await sql`SELECT password FROM users WHERE id = ${session.sub}`
  if (!rows.length) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const valid = await bcrypt.compare(password, rows[0].password as string)
  if (!valid) return NextResponse.json({ error: 'Password salah' }, { status: 400 })

  await sql`
    UPDATE users SET full_name = ${full_name.trim()}, updated_at = NOW()
    WHERE id = ${session.sub}
  `
  return NextResponse.json({ success: true, full_name: full_name.trim() })
}
