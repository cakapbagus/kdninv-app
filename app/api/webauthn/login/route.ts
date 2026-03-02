import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { signToken, cookieName } from '@/lib/auth'
import { sql } from '@/lib/db'

const RP_ID  = process.env.WEBAUTHN_RP_ID  ?? 'localhost'
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const step = req.nextUrl.searchParams.get('step')

  // ── STEP 1: start ──────────────────────────────────────────────────────────
  if (step === 'start') {
    const { username } = await req.json()
    if (!username) return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 })

    const users = await sql`
      SELECT id, username, role FROM users
      WHERE username = ${username.trim().toLowerCase()} LIMIT 1
    `
    if (!users.length) return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 404 })
    const user = users[0]

    const creds = await sql`
      SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ${user.id}
    `
    if (!creds.length) {
      return NextResponse.json({ error: 'no_credential' }, { status: 404 })
    }

    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      userVerification: 'required',
      allowCredentials: (creds as { credential_id: string; transports: string }[]).map(c => ({
        id:         c.credential_id,
        type:       'public-key' as const,
        transports: JSON.parse(c.transports ?? '[]'),
      })),
    })

    await sql`
      INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
      VALUES (${user.id}, ${options.challenge}, NOW() + INTERVAL '5 minutes')
      ON CONFLICT (user_id) DO UPDATE SET
        challenge  = EXCLUDED.challenge,
        expires_at = EXCLUDED.expires_at
    `

    return NextResponse.json({ ...options, userId: user.id })
  }

  // ── STEP 2: finish ─────────────────────────────────────────────────────────
  if (step === 'finish') {
    const { userId, response } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId missing' }, { status: 400 })

    const challenges = await sql`
      SELECT challenge FROM webauthn_challenges
      WHERE user_id = ${userId} AND expires_at > NOW()
    `
    if (!challenges.length) return NextResponse.json({ error: 'Challenge kadaluarsa' }, { status: 400 })

    const credRows = await sql`
      SELECT credential_id, public_key, counter FROM webauthn_credentials
      WHERE user_id = ${userId} AND credential_id = ${response.id}
    `
    if (!credRows.length) return NextResponse.json({ error: 'Credential tidak ditemukan' }, { status: 404 })

    const userRows = await sql`SELECT id, username, role FROM users WHERE id = ${userId} LIMIT 1`
    if (!userRows.length) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    const cred = credRows[0]
    const user = userRows[0]

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenges[0].challenge as string,
        expectedOrigin:    ORIGIN,
        expectedRPID:      RP_ID,
        credential: {
          id:        cred.credential_id as string,
          publicKey: Buffer.from(cred.public_key as string, 'base64'),
          counter:   cred.counter as number,
        },
        requireUserVerification: true,
      })

      if (!verification.verified) return NextResponse.json({ error: 'Verifikasi gagal' }, { status: 401 })

      await sql`
        UPDATE webauthn_credentials
        SET counter = ${verification.authenticationInfo.newCounter}
        WHERE credential_id = ${response.id}
      `
      await sql`DELETE FROM webauthn_challenges WHERE user_id = ${userId}`

      const token = await signToken({
        sub:      String(user.id),
        username: user.username as string,
        role:     user.role as 'user' | 'admin' | 'manager',
      })

      const res = NextResponse.json({ success: true, role: user.role })
      res.cookies.set(cookieName(), token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   60 * 60 * 24 * 7,
        path:     '/',
      })
      return res
    } catch (err) {
      console.error('WebAuthn login error:', err)
      return NextResponse.json({ error: 'Autentikasi gagal' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Step tidak valid' }, { status: 400 })
}
