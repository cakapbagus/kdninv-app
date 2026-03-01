import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id, no_rekening, bank, nama, created_by, created_at
    FROM rekening
    ORDER BY bank ASC, nama ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { no_rekening, bank, nama } = await req.json()

  if (!no_rekening?.trim()) return NextResponse.json({ error: 'Nomor rekening wajib diisi' }, { status: 400 })
  if (!bank?.trim())        return NextResponse.json({ error: 'Bank wajib diisi' },            { status: 400 })
  if (!nama?.trim())        return NextResponse.json({ error: 'Nama wajib diisi' },            { status: 400 })

  const rows = await sql`
    INSERT INTO rekening (no_rekening, bank, nama, created_by)
    VALUES (${no_rekening.trim()}, ${bank.trim()}, ${nama.trim()}, ${session.sub})
    ON CONFLICT (no_rekening, bank) DO UPDATE SET
      nama = EXCLUDED.nama,
      created_at = NOW()
    RETURNING *
  `
  return NextResponse.json({ success: true, rekening: rows[0] })
}

// PATCH: edit rekening (cari by no_rekening + bank dari body)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { no_rekening, bank, nama, new_no_rekening, new_bank } = await req.json()
  if (!no_rekening || !bank) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  if (!nama?.trim())         return NextResponse.json({ error: 'Nama wajib diisi' },    { status: 400 })

  const rows = await sql`
    UPDATE rekening
    SET
      no_rekening = ${(new_no_rekening ?? no_rekening).trim()},
      bank        = ${(new_bank ?? bank).trim()},
      nama        = ${nama.trim()}
    WHERE no_rekening = ${no_rekening} AND bank = ${bank}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true, rekening: rows[0] })
}

// DELETE: hapus rekening by no_rekening + bank dari body
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'manager'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { no_rekening, bank } = await req.json()
  if (!no_rekening || !bank) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

  await sql`DELETE FROM rekening WHERE no_rekening = ${no_rekening} AND bank = ${bank}`
  return NextResponse.json({ success: true })
}