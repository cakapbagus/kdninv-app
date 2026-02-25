import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { formatCurrency, getStatusLabel } from '@/lib/utils'
import { FileText, Clock, CheckCircle, XCircle, CheckSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

const ACCENT = '#4f6ef7'

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  finished: 'badge-finished',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status] ?? 'badge-pending'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>
      {getStatusLabel(status)}
    </span>
  )
}

type PengajuanRow = {
  status: string
  grand_total: string | number
  submitted_at: string
  no_nota: string
  items: Array<{ nama_barang: string }> | null
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const userRows = await sql`
    SELECT id, username, full_name, role, created_at, updated_at
    FROM users WHERE id = ${session.sub}
  `
  const profile = userRows[0] as Profile | undefined
  if (!profile) redirect('/login')

  const allPengajuan = (
    profile.role === 'user'
      ? await sql`
          SELECT status, grand_total, submitted_at, no_nota, items
          FROM pengajuan WHERE submitted_by = ${session.sub}
          ORDER BY submitted_at DESC
        `
      : await sql`
          SELECT status, grand_total, submitted_at, no_nota, items
          FROM pengajuan ORDER BY submitted_at DESC
        `
  ) as PengajuanRow[]

  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, finished: 0 }
  let totalValue = 0
  for (const p of allPengajuan) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
    totalValue += Number(p.grand_total) || 0
  }

  const stats = [
    { label: 'Menunggu',  value: counts.pending  ?? 0, icon: Clock,        bg: '#fef3c7', color: '#92400e' },
    { label: 'Disetujui', value: counts.approved  ?? 0, icon: CheckCircle,  bg: '#dbeafe', color: '#1e40af' },
    { label: 'Ditolak',   value: counts.rejected  ?? 0, icon: XCircle,      bg: '#fee2e2', color: '#991b1b' },
    { label: 'Selesai',   value: counts.finished  ?? 0, icon: CheckSquare,  bg: '#d1fae5', color: '#065f46' },
  ]

  const historyLink = profile.role === 'user' ? '/history' : '/admin'

  return (
    <div className="space-y-5">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
          Selamat datang, <span style={{ color: ACCENT }}>{profile.username}</span>
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          {profile.role === 'user'    && 'Kelola pengajuan nota Anda'}
          {profile.role === 'admin'   && 'Kelola dan proses pengajuan nota'}
          {profile.role === 'manager' && 'Pantau dan setujui pengajuan nota'}
        </p>
      </div>

      {/* Total value */}
      <div className="glass rounded-2xl p-5 glow-indigo animate-fadeInUp stagger-1 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <TrendingUp className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Total Nilai Pengajuan</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`glass rounded-xl p-4 animate-fadeInUp stagger-${i + 2}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Poppins',sans-serif" }}>
                  {s.value}
                </span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent */}
      <div className="animate-fadeInUp stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>Pengajuan Terbaru</h2>
          <Link href={historyLink} className="text-sm font-medium" style={{ color: ACCENT }}>
            Lihat semua →
          </Link>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          {allPengajuan.length > 0 ? (
            <div>
              {allPengajuan.slice(0, 5).map((p, i) => (
                <div key={p.no_nota}
                  className="px-4 py-3 flex items-center justify-between cursor-default"
                  style={{ borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--accent-soft)' }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{p.no_nota}</p>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                        {p.items?.[0]?.nama_barang ?? '-'}
                        {(p.items?.length ?? 0) > 1 && ` +${(p.items?.length ?? 1) - 1}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                      {formatCurrency(Number(p.grand_total))}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center">
              <FileText className="w-9 h-9 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Belum ada pengajuan</p>
              {profile.role !== 'manager' && (
                <Link href="/pengajuan" className="inline-block mt-2 text-sm" style={{ color: ACCENT }}>
                  Buat pengajuan pertama →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
