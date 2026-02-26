import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

// admin  → bisa aksi pada: user
// manager → bisa aksi pada: admin, user
function canActOn(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'manager') return ['admin', 'user'].includes(targetRole)
  if (actorRole === 'admin')   return targetRole === 'user'
  return false
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (String(id) === String(session.sub))
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })

  const rows = await sql`SELECT id, role FROM users WHERE id = ${id}`
  if (!rows.length)
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (!canActOn(session.role, rows[0].role))
    return NextResponse.json({ error: 'Tidak memiliki izin menghapus user ini' }, { status: 403 })

  await sql`DELETE FROM users WHERE id = ${id}`
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })

  const rows = await sql`SELECT id, role FROM users WHERE id = ${id}`
  if (!rows.length)
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (!canActOn(session.role, rows[0].role))
    return NextResponse.json({ error: 'Tidak memiliki izin mereset password user ini' }, { status: 403 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await sql`UPDATE users SET password = ${hashed}, updated_at = NOW() WHERE id = ${id}`
  return NextResponse.json({ success: true })
}