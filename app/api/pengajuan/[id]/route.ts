import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { generateSignature } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, rejection_reason } = body
  const sig = generateSignature(session.username)
  const now = new Date().toISOString()

  if (session.role === 'user' && action !== 'edit') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    if (action === 'approved') {
      if (session.role !== 'manager')
        return NextResponse.json({ error: 'Hanya Manager yang bisa menyetujui' }, { status: 403 })

      const rows = await sql`
        UPDATE pengajuan SET
          status = 'approved',
          approved_at = ${now},
          approved_by = ${session.sub},
          approved_by_username = ${session.username},
          approved_by_full_name = (SELECT full_name FROM users WHERE id = ${session.sub}),
          signature_manager = ${sig},
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING no_nota, submitted_by
      `
      if (rows.length > 0) {
        const { sendPushToUser, sendPushToRoles } = await import('@/lib/webpush')
        const approverName = session.username
        // Notif ke user yang submit
        sendPushToUser(rows[0].submitted_by, {
          title: '✅ Pengajuan Disetujui',
          body: `Nota ${rows[0].no_nota} telah disetujui oleh ${approverName}`,
          url: '/dashboard',
        }).catch(() => {})
        // Notif ke admin agar segera ditandai selesai
        sendPushToRoles(['admin'], {
          title: '📬 Nota Menunggu Diselesaikan',
          body: `Nota ${rows[0].no_nota} telah disetujui oleh ${approverName}, siap untuk ditandai selesai`,
          url: '/dashboard',
        },{ excludeUserIds: [rows[0].submitted_by] }).catch(() => {})
      }

    } 
    else if (action === 'rejected') {
      if (session.role !== 'manager')
        return NextResponse.json({ error: 'Hanya Manager yang bisa menolak' }, { status: 403 })
      if (!rejection_reason?.trim())
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 })

      const rows = await sql`
        UPDATE pengajuan SET
          status = 'rejected',
          rejected_at = ${now},
          rejected_by = ${session.sub},
          rejected_by_username = ${session.username},
          rejection_reason = ${rejection_reason},
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING no_nota, submitted_by
      `
      if (rows.length > 0) {
        const { sendPushToUser } = await import('@/lib/webpush')
        sendPushToUser(rows[0].submitted_by, {
          title: '❌ Pengajuan Ditolak',
          body: `Nota ${rows[0].no_nota} ditolak oleh ${session.username}. Alasan: ${rejection_reason}`,
          url: '/history',
        }).catch(() => {})
      }

    } 
    else if (action === 'finished') {
      if (session.role !== 'admin')
        return NextResponse.json({ error: 'Hanya Admin yang bisa menyelesaikan' }, { status: 403 })

      const rows = await sql`
        UPDATE pengajuan SET
          status = 'finished',
          finished_at = ${now},
          finished_by = ${session.sub},
          finished_by_username = ${session.username},
          signature_admin_finish = ${sig},
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING no_nota, submitted_by
      `
      if (rows.length > 0) {
        const { sendPushToUser } = await import('@/lib/webpush')
        sendPushToUser(rows[0].submitted_by, {
          title: '🎉 Pengajuan Selesai',
          body: `Nota ${rows[0].no_nota} telah diselesaikan oleh ${session.username}`,
          url: '/history',
        },{ excludeRoles: ['admin'] }).catch(() => {})
      }

    } 
    else if (action === 'edit') {
      const existing = await sql`SELECT submitted_by, status FROM pengajuan WHERE id = ${id}`
      if (!existing.length) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
      if (String(existing[0].submitted_by) !== String(session.sub))
        return NextResponse.json({ error: 'Bukan pengajuan Anda' }, { status: 403 })
      if (!['pending', 'rejected'].includes(existing[0].status))
        return NextResponse.json({ error: 'Hanya bisa edit status menunggu atau ditolak' }, { status: 400 })

      const {
        divisi, rekening_sumber, bank_sumber, nama_sumber,
        rekening_penerima, bank_penerima, nama_penerima,
        items, grand_total, grand_total_terbilang,
        files, file_url, file_public_id, file_name, keterangan
      } = body

      const rows = await sql`
        UPDATE pengajuan SET
          status                = 'pending',
          divisi                = ${divisi ?? null},
          rekening_sumber       = ${rekening_sumber ?? null},
          bank_sumber           = ${bank_sumber ?? null},
          nama_sumber           = ${nama_sumber ?? null},
          rekening_penerima     = ${rekening_penerima ?? null},
          bank_penerima         = ${bank_penerima ?? null},
          nama_penerima         = ${nama_penerima ?? null},
          items                 = ${JSON.stringify(items)},
          grand_total           = ${grand_total},
          grand_total_terbilang = ${grand_total_terbilang},
          files                 = ${JSON.stringify(files ?? [])},
          file_url              = ${file_url ?? null},
          file_public_id        = ${file_public_id ?? null},
          file_name             = ${file_name ?? null},
          submitted_at          = ${now},
          rejection_reason      = NULL,
          rejected_at           = NULL,
          rejected_by           = NULL,
          rejected_by_username  = NULL,
          signature_manager     = NULL,
          approved_at           = NULL,
          approved_by           = NULL,
          approved_by_username  = NULL,
          keterangan            = ${keterangan ?? null},
          updated_at            = ${now}
        WHERE id = ${id}
        RETURNING no_nota
      `
      if (rows.length > 0) {
        const { sendPushToRoles } = await import('@/lib/webpush')
        sendPushToRoles(['manager'], {
          title: '🔄 Pengajuan Diperbarui',
          body: `Nota ${rows[0].no_nota} telah diperbarui oleh ${session.username} dan menunggu persetujuan`,
          url: '/dashboard',
        }).catch(() => {})
      }

    } 
    else {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
