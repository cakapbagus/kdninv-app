'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pengajuan } from '@/types'
import { formatCurrency, formatDateTime, getStatusLabel } from '@/lib/utils'
import { Shield, Filter, RefreshCw } from 'lucide-react'
import DetailModal from '@/components/DetailModal'

const ACCENT = '#4f6ef7'

function StatusBadge({ status }: { status: string }) {
  const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', finished: 'badge-finished' }[status] || 'badge-pending'
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>{getStatusLabel(status)}</span>
}

export default function AdminPage() {
  const [pengajuan, setPengajuan] = useState<Pengajuan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Pengajuan | null>(null)
  const [userRole, setUserRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterDateFrom) params.set('from', filterDateFrom)
    if (filterDateTo) params.set('to', filterDateTo)

    const [meRes, pRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/pengajuan?' + params.toString()),
    ])
    if (meRes.ok) { const u = await meRes.json(); setUserRole(u.role) }
    if (pRes.ok) setPengajuan(await pRes.json())
    setLoading(false)
  }, [filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => { load() }, [load])

  const filtered = pengajuan.filter(p =>
    !searchQuery ||
    p.no_nota.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.items || []).some(i => i.nama_barang.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.submitted_by_username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'finished', label: 'Selesai' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
            <Shield className="w-6 h-6" style={{ color: ACCENT }} />
            Admin Panel
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {userRole === 'manager' ? 'Setujui atau tolak pengajuan yang masuk' : 'Tandai pengajuan yang disetujui sebagai selesai'}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 animate-fadeInUp stagger-1">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="input-field" placeholder="Dari tanggal" />
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="input-field" placeholder="Sampai tanggal" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="input-field" placeholder="Cari nota, barang, pengaju..." />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden animate-fadeInUp stagger-2">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-200 rounded-full animate-spin mx-auto"
              style={{ borderTopColor: ACCENT }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
            <p className="font-medium" style={{ color: 'var(--text-3)' }}>Tidak ada pengajuan</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    {['No. Nota', 'Pengaju', 'Barang', 'Total', 'Status', 'Tanggal', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="cursor-pointer transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
                      onClick={() => setSelected(p)}>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                        {p.submitted_by_username}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-3)' }}>
                        {p.items?.[0]?.nama_barang || '-'}
                        {p.items?.length > 1 && ` +${p.items.length - 1}`}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-xs" style={{ color: 'var(--text-1)' }}>
                        {formatCurrency(Number(p.grand_total))}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>
                        {formatDateTime(p.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {filtered.map(p => (
                <div key={p.id} className="p-4 cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>oleh {p.submitted_by_username}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      {formatCurrency(Number(p.grand_total))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <DetailModal
          pengajuan={selected}
          onClose={() => setSelected(null)}
          showActions={true}
          userRole={userRole}
          onUpdate={load}
        />
      )}
    </div>
  )
}
