import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { angkaTerbilang } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const mine = searchParams.get('mine') === '1'

  try {
    let rows

    if (session.role === 'user' || mine) {
      if (status && status !== 'all') {
        rows = await sql`
          SELECT * FROM pengajuan
          WHERE submitted_by = ${session.sub} AND status = ${status}
          ORDER BY submitted_at DESC
        `
      } else {
        rows = await sql`
          SELECT * FROM pengajuan
          WHERE submitted_by = ${session.sub}
          ORDER BY submitted_at DESC
        `
      }
    } else {
      // Admin / Manager
      if (status && status !== 'all' && from && to) {
        rows = await sql`SELECT * FROM pengajuan WHERE status = ${status} AND tanggal >= ${from} AND tanggal <= ${to} ORDER BY submitted_at DESC`
      } else if (status && status !== 'all') {
        rows = await sql`SELECT * FROM pengajuan WHERE status = ${status} ORDER BY submitted_at DESC`
      } else if (from && to) {
        rows = await sql`SELECT * FROM pengajuan WHERE tanggal >= ${from} AND tanggal <= ${to} ORDER BY submitted_at DESC`
      } else if (from) {
        rows = await sql`SELECT * FROM pengajuan WHERE tanggal >= ${from} ORDER BY submitted_at DESC`
      } else if (to) {
        rows = await sql`SELECT * FROM pengajuan WHERE tanggal <= ${to} ORDER BY submitted_at DESC`
      } else {
        rows = await sql`SELECT * FROM pengajuan ORDER BY submitted_at DESC`
      }
    }

    return NextResponse.json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'manager')
    return NextResponse.json({ error: 'Manager tidak bisa membuat pengajuan' }, { status: 403 })

  try {
    const body = await req.json()
    const {
      tanggal, divisi, rekening_sumber, bank_sumber, nama_sumber,
      rekening_penerima, bank_penerima, nama_penerima,
      items, signature_user, file_url, file_public_id, file_name, files, keterangan,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Minimal satu barang' }, { status: 400 })
    }

    const itemsWithTotal = (items as Array<{
      nama_barang: string; jumlah: number; satuan: string; harga: number; total: number
    }>).map(i => ({
      ...i,
      jumlah: Number(i.jumlah),
      harga: Number(i.harga),
      total: Number(i.jumlah) * Number(i.harga),
    }))
    const grandTotal = itemsWithTotal.reduce((s, i) => s + i.total, 0)

    const year = new Date().getFullYear()
    const notaRows = await sql`SELECT public.generate_no_nota(${year}) as no_nota`
    const noNota = notaRows[0].no_nota as string

    const userRows = await sql`SELECT full_name FROM users WHERE id = ${session.sub}`
    const submittedByFullName = userRows[0]?.full_name ?? null

    // Support both legacy single-file fields and new multi-file `files` array
    const filesArray = files && Array.isArray(files) && files.length > 0
      ? files
      : file_url
        ? [{ url: file_url, public_id: file_public_id ?? '', name: file_name ?? '' }]
        : null

    const result = await sql`
      INSERT INTO pengajuan (
        no_nota, tanggal, divisi,
        rekening_sumber, bank_sumber, nama_sumber,
        rekening_penerima, bank_penerima, nama_penerima,
        items, grand_total, grand_total_terbilang,
        file_url, file_public_id, file_name, files,
        submitted_by, submitted_by_username, submitted_by_full_name,
        signature_user, keterangan, status
      ) VALUES (
        ${noNota}, ${tanggal}, ${divisi ?? null},
        ${rekening_sumber ?? null}, ${bank_sumber ?? null}, ${nama_sumber ?? null},
        ${rekening_penerima ?? null}, ${bank_penerima ?? null}, ${nama_penerima ?? null},
        ${JSON.stringify(itemsWithTotal)}, ${grandTotal}, ${angkaTerbilang(grandTotal)},
        ${filesArray?.[0]?.url ?? null}, ${filesArray?.[0]?.public_id ?? null}, ${filesArray?.[0]?.name ?? null},
        ${filesArray ? JSON.stringify(filesArray) : null},
        ${session.sub}, ${session.username}, ${submittedByFullName},
        ${signature_user ?? null}, ${keterangan ?? null}, 'pending'
      )
      RETURNING id, no_nota
    `

    // Push notif ke manager
    import('@/lib/webpush').then(({ sendPushToRoles }) => {
      const displayName = submittedByFullName || session.username
      sendPushToRoles(["manager"], {
        title: "📋 Pengajuan Nota Baru",
        body: `${displayName} mengajukan nota ${result[0].no_nota}`,
        url: "/admin",
      }).catch(() => {})
    })

    return NextResponse.json({ success: true, id: result[0].id, no_nota: result[0].no_nota })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuat pengajuan'
    console.error('Pengajuan error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
