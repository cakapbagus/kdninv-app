import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, cookieName } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, username, full_name, password, role FROM users
      WHERE username = ${username.trim().toLowerCase()}
      LIMIT 1
    `
    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password as string)
    if (!valid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    const token = await signToken({
      sub: user.id as number,
      username: user.username as string,
      role: user.role as 'user' | 'admin' | 'manager',
    })

    const response = NextResponse.json({ success: true, role: user.role, username: user.username })
    response.cookies.set(cookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('Login error:', message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
