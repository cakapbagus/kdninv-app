import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { oldPassword, newPassword } = await req.json()
  if (!oldPassword || !newPassword)
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  if (newPassword.length < 6)
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })

  const rows = await sql`SELECT password FROM users WHERE id = ${session.sub}`
  const user = rows[0]
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const valid = await bcrypt.compare(oldPassword, user.password as string)
  if (!valid) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await sql`UPDATE users SET password = ${hashed}, updated_at = NOW() WHERE id = ${session.sub}`

  return NextResponse.json({ success: true })
}
