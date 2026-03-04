import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, cookieName, SESSION_REMEMBER, SESSION_DEFAULT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? ''
const RECAPTCHA_MIN_SCORE = 0.5  // 0.0 (bot) sampai 1.0 (manusia), sesuaikan jika perlu

async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!RECAPTCHA_SECRET) return true  // skip jika tidak dikonfigurasi
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `secret=${RECAPTCHA_SECRET}&response=${token}`,
    })
    const data = await res.json()

    return data.success === true && data.score >= RECAPTCHA_MIN_SCORE
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, rememberMe, recaptchaToken } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    // ── Verifikasi Recaptcha ─────────────────────────────────────────────
    if (RECAPTCHA_SECRET) {
      if (!recaptchaToken) {
        return NextResponse.json({ error: 'Verifikasi gagal' }, { status: 400 })
      }
      const valid = await verifyRecaptcha(recaptchaToken)
      if (!valid) {
        return NextResponse.json({ error: 'Terdeteksi aktivitas mencurigakan, coba lagi' }, { status: 400 })
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

    // Ambil credential IDs milik user
    const creds = await sql`
      SELECT credential_id FROM webauthn_credentials
      WHERE user_id = ${user.id}
    `

    const response = NextResponse.json({
      success:       true,
      role:          user.role,
      username:      user.username,
      credentialIds: (creds as {credential_id: string}[]).map(r => r.credential_id),
    })
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