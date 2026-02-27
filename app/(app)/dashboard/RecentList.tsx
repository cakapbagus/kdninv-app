'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, getStatusLabel } from '@/lib/utils'
import type { Pengajuan } from '@/types'
import DetailModal from '@/components/DetailModal'
import { useRouter } from 'next/navigation'
import { ACCENT } from '@/lib/constants'

function StatusBadge({ status }: { status: string }) {
  const cls = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    finished: 'badge-finished',
  }[status] ?? 'badge-pending'

  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>
      {getStatusLabel(status)}
    </span>
  )
}

interface Props {
  items: Pengajuan[]
  historyLink: string
  userRole: string
}

export default function RecentList({ items, historyLink, userRole }: Props) {
  const [selected, setSelected] = useState<Pengajuan | null>(null)
  const router = useRouter()

  return (
    <>
      <div className="animate-fadeInUp stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>Pengajuan Terbaru</h2>
          <Link href={historyLink} className="text-sm font-medium" style={{ color: ACCENT }}>
            Lihat semua →
          </Link>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          {items.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                {items.slice(0, 5).map((p, i) => (
                  <div key={`desktop-${p.no_nota}`}
                    onClick={() => setSelected(p)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer transition-all"
                    style={{ borderBottom: i < Math.min(items.length, 5) - 1 ? '1px solid var(--border-soft)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-soft)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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

              {/* Mobile */}
              <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
                {items.slice(0, 5).map(p => (
                  <div key={`mobile-${p.no_nota}`} className="p-4 cursor-pointer" onClick={() => setSelected(p)}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                      {p.items?.[0]?.nama_barang ?? '-'}
                      {(p.items?.length ?? 0) > 1 && (
                        <span className="text-xs" style={{ color: 'var(--text-4)' }}> +{(p.items?.length ?? 1) - 1}</span>
                      )}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        {formatCurrency(Number(p.grand_total))}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-4)' }}>
                        {p.submitted_by_username}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-14 text-center">
              <FileText className="w-9 h-9 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Belum ada pengajuan terbaru</p>
              {userRole !== 'manager' && (
                <Link href="/pengajuan" className="inline-block mt-2 text-sm" style={{ color: ACCENT }}>
                  Buat pengajuan →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DetailModal
          pengajuan={selected}
          onClose={() => setSelected(null)}
          showActions={['admin', 'manager'].includes(userRole)}
          userRole={userRole}
          onUpdate={() => { setSelected(null); router.refresh() }}
        />
      )}
    </>
  )
}