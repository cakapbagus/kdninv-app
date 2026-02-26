'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime, getStatusLabel } from '@/lib/utils'
import { Pengajuan } from '@/types'
import { FileText } from 'lucide-react'
import DetailModal from '@/components/DetailModal'
import { ACCENT } from '@/lib/constants'

function StatusBadge({ status }: { status: string }) {
  const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', finished: 'badge-finished' }[status] || 'badge-pending'
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>{getStatusLabel(status)}</span>
}

export default function HistoryPage() {
  const [pengajuan, setPengajuan] = useState<Pengajuan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Pengajuan | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/pengajuan?mine=1')
    if (res.ok) setPengajuan(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
          History Pengajuan
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Riwayat semua pengajuan Anda</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden animate-fadeInUp stagger-1">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-200 rounded-full animate-spin mx-auto"
              style={{ borderTopColor: ACCENT }} />
          </div>
        ) : pengajuan.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
            <p className="font-medium" style={{ color: 'var(--text-3)' }}>Belum ada pengajuan</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    {['No. Nota', 'Barang', 'Total', 'Status', 'Tanggal Pengajuan', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pengajuan.map((p, i) => (
                    <tr key={p.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: i < pengajuan.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
                      onClick={() => setSelected(p)}>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-2)' }}>
                        {p.items?.[0]?.nama_barang || '-'}
                        {p.items?.length > 1 && <span className="text-xs" style={{ color: 'var(--text-4)' }}> +{p.items.length - 1}</span>}
                      </td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-1)' }}>
                        {formatCurrency(Number(p.grand_total))}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>
                        {formatDateTime(p.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {pengajuan.map(p => (
                <div key={p.id} className="p-4 cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                    {p.items?.[0]?.nama_barang || '-'}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      {formatCurrency(Number(p.grand_total))}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-4)' }}>
                      {formatDateTime(p.submitted_at)}
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
          showActions={false}
        />
      )}
    </div>
  )
}
