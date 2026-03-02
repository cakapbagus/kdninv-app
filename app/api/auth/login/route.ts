import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, cookieName, SESSION_REMEMBER, SESSION_DEFAULT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY ?? ''

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, rememberMe, turnstileToken } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    // ── Verifikasi Turnstile ─────────────────────────────────────────────
    if (TURNSTILE_SECRET) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'Verifikasi CAPTCHA diperlukan' }, { status: 400 })
      }
      const ip = req.headers.get('cf-connecting-ip')
        ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? '0.0.0.0'
      const valid = await verifyTurnstile(turnstileToken, ip)
      if (!valid) {
        return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal, coba lagi' }, { status: 400 })
      }
    }

    // ── Cek user ─────────────────────────────────────────────────────────
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

    // ── Buat token & cookie sesuai remember me ───────────────────────────
    const maxAge    = rememberMe ? SESSION_REMEMBER : SESSION_DEFAULT
    const expiresIn = rememberMe ? '30d' : '8h'

    const token = await signToken(
      { sub: user.id as string, username: user.username as string, role: user.role as 'user' | 'admin' | 'manager' },
      expiresIn
    )

    const response = NextResponse.json({ success: true, role: user.role, username: user.username })
    response.cookies.set(cookieName(), token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path:     '/',
    })
    return response

  } catch (err: unknown) {
    console.error('Login error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}