import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

const ALLOWED_ROLES: Record<string, string[]> = {
  manager: ['admin'],
  admin: ['user'],
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await sql`
    SELECT id, username, full_name, role, created_at FROM users
    WHERE id != ${session.sub}
    ORDER BY
      CASE role WHEN 'manager' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
      username ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, password, role } = await req.json()

  if (!username?.trim())
    return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 })
  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })

  const allowedRoles = ALLOWED_ROLES[session.role] ?? []
  if (!allowedRoles.includes(role)) {
    const msg = session.role === 'manager'
      ? 'Manager hanya bisa membuat role Admin'
      : 'Admin hanya bisa membuat role User'
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  const existing = await sql`SELECT id FROM users WHERE username = ${username.trim().toLowerCase()}`
  if (existing.length > 0)
    return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })

  const hashed = await bcrypt.hash(password, 12)
  const rows = await sql`
    INSERT INTO users (username, password, role, full_name)
    VALUES (${username.trim().toLowerCase()}, ${hashed}, ${role}, '')
    RETURNING id, username, role, created_at
  `

  return NextResponse.json({ success: true, user: rows[0] })
}
