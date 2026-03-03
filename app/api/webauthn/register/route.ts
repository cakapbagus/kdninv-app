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
    SELECT credential_id FROM webauthn_credentials
    WHERE user_id = ${parseInt(session.sub)}
  `

  const options = await generateRegistrationOptions({
    rpName:          RP_NAME,
    rpID:            RP_ID,
    userID:          new TextEncoder().encode(session.sub),
    userName:        session.username,
    userDisplayName: session.username,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'required',
      residentKey:      'preferred',
    },
    excludeCredentials: (existing as { credential_id: string }[]).map(r => ({
      id:   r.credential_id,
      type: 'public-key' as const,
    })),
  })

  await sql`
    INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
    VALUES (${parseInt(session.sub)}, ${options.challenge}, NOW() + INTERVAL '5 minutes')
    ON CONFLICT (user_id) DO UPDATE SET
      challenge  = EXCLUDED.challenge,
      expires_at = EXCLUDED.expires_at
  `

  return NextResponse.json(options)
}

// POST — verifikasi & simpan credential baru
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const rows = await sql`
    SELECT challenge FROM webauthn_challenges
    WHERE user_id = ${parseInt(session.sub)} AND expires_at > NOW()
  `
  if (!rows.length) {
    return NextResponse.json({ error: 'Challenge kadaluarsa, coba lagi' }, { status: 400 })
  }

  try {
    const verification = await verifyRegistrationResponse({
      response:                body,
      expectedChallenge:       rows[0].challenge as string,
      expectedOrigin:          ORIGIN,
      expectedRPID:            RP_ID,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verifikasi gagal' }, { status: 400 })
    }

    function resolveDeviceName(aaguid: string | undefined): string {
      if (!aaguid || aaguid === '00000000-0000-0000-0000-000000000000') return 'Unknown Device'
      const normalized = aaguid.toLowerCase()
      const map: Record<string, string> = {
        '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
        'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': 'iCloud Keychain',
        'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google Password Manager',
        'b93fd961-f2e6-462f-b122-82002247de78': 'Android Biometrics',
        'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome on macOS',
        '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': 'Microsoft Authenticator (Android)',
        '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': 'Microsoft Authenticator (iOS)',
        'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': 'Samsung Pass',
        '53414d53-554e-4700-0000-000000000000': 'Apple Touch ID (Mac)',
        'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
        'd548826e-79b4-db40-a3d8-11116f7e8349': 'Bitwarden',
        '531126d6-e717-415c-9320-3d9aa6981239': 'Dashlane',
        'b84e4048-15dc-4dd0-8640-f4f60813c8af': 'NordPass',
        '0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6': 'Keeper',
        '66a0ccb3-bd6a-191f-ee06-e375c50b9846': 'LastPass',
        '2fc0579f-8113-47ea-b116-bb5a8db9202a': 'RoboForm / YubiKey 5 Series',
        'fa2b99dc-9e39-4257-8f92-4a30d23c4118': 'YubiKey Bio',
        'c5ef55ff-ad9a-4b9f-b580-adebafe026d0': 'YubiKey 5 NFC',
        '12ded745-4bed-47d4-abaa-e713f51d6393': 'Feitian ePass FIDO2',
        '4e768f2c-5fab-48b3-b300-220eb487752b': 'Feitian BioPass FIDO2',
        '4e768f2c-5fab-48b3-b300-220eb487752c': 'Google Titan Security Key',
      }
      return map[normalized] ?? `Passkey (${normalized.slice(0, 8)})`
    }

    const { credential, aaguid } = verification.registrationInfo
    const deviceName = resolveDeviceName(aaguid)

    await sql`
      INSERT INTO webauthn_credentials
        (credential_id, user_id, public_key, counter, transports, aaguid, device_name)
      VALUES (
        ${credential.id},
        ${parseInt(session.sub)},
        ${Buffer.from(credential.publicKey).toString('base64')},
        ${credential.counter},
        ${JSON.stringify(body.response?.transports ?? [])},
        ${aaguid ?? null},
        ${deviceName}
      )
      ON CONFLICT (credential_id) DO UPDATE SET counter = EXCLUDED.counter
    `

    await sql`DELETE FROM webauthn_challenges WHERE user_id = ${parseInt(session.sub)}`

    return NextResponse.json({ success: true, credentialId: credential.id })
  } catch (err) {
    console.error('WebAuthn register error:', err)
    return NextResponse.json({ error: 'Registrasi gagal' }, { status: 500 })
  }
}