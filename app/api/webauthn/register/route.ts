import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'KDNINV'
const RP_ID   = process.env.WEBAUTHN_RP_ID   ?? 'localhost'
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  ?? 'http://localhost:3000'

// GET — generate registration options
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await sql`
    SELECT credential_id FROM webauthn_credentials WHERE user_id = ${session.sub}
  `

  const options = await generateRegistrationOptions({
    rpName:   RP_NAME,
    rpID:     RP_ID,
    userID:   new TextEncoder().encode(session.sub),
    userName: session.username,
    userDisplayName: session.username,
    attestationType: 'none',
    authenticatorSelection: {
      // authenticatorAttachment: 'platform',
      userVerification:        'required',
      residentKey:             'preferred',
    },
    excludeCredentials: (existing as { credential_id: string }[]).map(r => ({
      id:   r.credential_id,
      type: 'public-key' as const,
    })),
  })

  await sql`
    INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
    VALUES (${session.sub}, ${options.challenge}, NOW() + INTERVAL '5 minutes')
    ON CONFLICT (user_id) DO UPDATE SET
      challenge  = EXCLUDED.challenge,
      expires_at = EXCLUDED.expires_at
  `

  return NextResponse.json(options)
}

// POST — verify & simpan credential
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const rows = await sql`
    SELECT challenge FROM webauthn_challenges
    WHERE user_id = ${session.sub} AND expires_at > NOW()
  `
  if (!rows.length) return NextResponse.json({ error: 'Challenge kadaluarsa, coba lagi' }, { status: 400 })

  try {
    const verification = await verifyRegistrationResponse({
      response:          body,
      expectedChallenge: rows[0].challenge as string,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verifikasi gagal' }, { status: 400 })
    }

    const { credential } = verification.registrationInfo

    await sql`
      INSERT INTO webauthn_credentials (credential_id, user_id, public_key, counter, transports)
      VALUES (
        ${credential.id},
        ${session.sub},
        ${Buffer.from(credential.publicKey).toString('base64')},
        ${credential.counter},
        ${JSON.stringify(body.response?.transports ?? [])}
      )
      ON CONFLICT (credential_id) DO UPDATE SET counter = EXCLUDED.counter
    `

    await sql`DELETE FROM webauthn_challenges WHERE user_id = ${session.sub}`

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('WebAuthn register error:', err)
    return NextResponse.json({ error: 'Registrasi gagal' }, { status: 500 })
  }
}

// DELETE — hapus semua credential milik user
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sql`DELETE FROM webauthn_credentials WHERE user_id = ${session.sub}`
  return NextResponse.json({ success: true })
}
