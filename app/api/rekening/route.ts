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
    RETURNING *
  `
  return NextResponse.json({ success: true, rekening: rows[0] })
}