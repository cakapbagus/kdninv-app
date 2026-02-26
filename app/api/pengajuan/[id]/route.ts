import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { generateSignature } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // In Next.js 15+, params is a Promise — must be awaited
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'user') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, rejection_reason } = await req.json()
  const sig = generateSignature(session.username)
  const now = new Date().toISOString()

  try {
    if (action === 'approved') {
      if (session.role !== 'manager')
        return NextResponse.json({ error: 'Hanya Manager yang bisa menyetujui' }, { status: 403 })

      await sql`
        UPDATE pengajuan SET
          status = 'approved',
          approved_at = ${now},
          approved_by = ${session.sub},
          approved_by_username = ${session.username},
          approved_by_full_name = (SELECT full_name FROM users WHERE id = ${session.sub}),
          signature_manager = ${sig},
          updated_at = ${now}
        WHERE id = ${id}
      `
    } else if (action === 'rejected') {
      if (session.role !== 'manager')
        return NextResponse.json({ error: 'Hanya Manager yang bisa menolak' }, { status: 403 })
      if (!rejection_reason?.trim())
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 })

      await sql`
        UPDATE pengajuan SET
          status = 'rejected',
          rejected_at = ${now},
          rejected_by = ${session.sub},
          rejected_by_username = ${session.username},
          rejection_reason = ${rejection_reason},
          signature_manager = ${sig},
          updated_at = ${now}
        WHERE id = ${id}
      `
    } else if (action === 'finished') {
      if (session.role !== 'admin')
        return NextResponse.json({ error: 'Hanya Admin yang bisa menyelesaikan' }, { status: 403 })

      await sql`
        UPDATE pengajuan SET
          status = 'finished',
          finished_at = ${now},
          finished_by = ${session.sub},
          finished_by_username = ${session.username},
          signature_admin_finish = ${sig},
          updated_at = ${now}
        WHERE id = ${id}
      `
    } else {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
