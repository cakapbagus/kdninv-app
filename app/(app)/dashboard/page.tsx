import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { Clock, CheckCircle, XCircle, CheckSquare, TrendingUp } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ACCENT } from '@/lib/constants'
import RecentList from './RecentList'
import type { Profile } from '@/types'
import type { Pengajuan } from '@/types'

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
      ? await sql`SELECT * FROM pengajuan WHERE submitted_by = ${session.sub} ORDER BY submitted_at DESC`
      : await sql`SELECT * FROM pengajuan ORDER BY submitted_at DESC`
  ) as Pengajuan[]

  const counts:     Record<string, number> = { pending: 0, approved: 0, rejected: 0, finished: 0 }
  const countsMine: Record<string, number> = { pending: 0, approved: 0, rejected: 0, finished: 0 }
  let totalValueAll = 0
  let totalValueMine = 0
  for (const p of allPengajuan) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
    totalValueAll += Number(p.grand_total) || 0
    if (Number(p.submitted_by) === Number(session.sub)) {
      countsMine[p.status] = (countsMine[p.status] ?? 0) + 1
      totalValueMine += Number(p.grand_total) || 0
    }
  }

  const stats = [
    { label: 'Menunggu',  mine: countsMine.pending,  all: counts.pending,  icon: Clock,       bg: '#fef3c7', color: '#92400e' },
    { label: 'Disetujui', mine: countsMine.approved, all: counts.approved, icon: CheckCircle, bg: '#dbeafe', color: '#1e40af' },
    { label: 'Ditolak',   mine: countsMine.rejected, all: counts.rejected, icon: XCircle,     bg: '#fee2e2', color: '#991b1b' },
    { label: 'Selesai',   mine: countsMine.finished, all: counts.finished, icon: CheckSquare, bg: '#d1fae5', color: '#065f46' },
  ]

  const historyLink = profile.role === 'manager' ? '/admin' : '/history'

  const filteredPengajuan = allPengajuan.filter(p => {
    if (profile.role === 'admin') {
      return (
        p.status === 'approved' ||
        (p.status === 'pending' && p.submitted_by === Number(session.sub))
      )
    }

    if (profile.role === 'manager') {
      return p.status === 'pending'
    }

    // user
    return ['pending', 'approved'].includes(p.status) && p.submitted_by === Number(session.sub)
  })

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
      <div className={`grid grid-cols-1 gap-3 animate-fadeInUp stagger-1 ${profile.role === 'admin' ? 'sm:grid-cols-2' : ''}`}>
        {/* User: hanya milik sendiri | Manager: hanya seluruhnya | Admin: keduanya */}
        {profile.role !== 'manager' && (
          <div className="glass rounded-2xl p-5 glow-indigo flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Total Nilai Pengajuan Anda</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
                {formatCurrency(totalValueMine)}
              </p>
            </div>
          </div>
        )}
        {profile.role !== 'user' && (
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.2)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Total Nilai Pengajuan Seluruhnya</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
                {formatCurrency(totalValueAll)}
              </p>
            </div>
          </div>
        )}
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
                {profile.role === 'admin' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Poppins',sans-serif" }}>
                      {s.mine}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-4)' }}>|</span>
                    <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Poppins',sans-serif", opacity: 0.45 }}>
                      {s.all}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Poppins',sans-serif" }}>
                    {s.all}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</p>
              {profile.role === 'admin' && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>Anda | Semua</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent */}
      <RecentList
        items={filteredPengajuan}
        historyLink={historyLink}
        userRole={profile.role}
      />
    </div>
  )
}
