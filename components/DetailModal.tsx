'use client'

import { useState } from 'react'
import { Pengajuan } from '@/types'
import { formatCurrency, formatDate, formatDateTime, getStatusLabel, generateSignature } from '@/lib/utils'
import { X, ExternalLink, FileText, CheckCircle, XCircle, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const QRSignature = dynamic(() => import('@/components/QRSignature'), { ssr: false })

const ACCENT = '#4f6ef7'

function StatusBadge({ status }: { status: string }) {
  const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', finished: 'badge-finished' }[status] || 'badge-pending'
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>{getStatusLabel(status)}</span>
}

interface DetailModalProps {
  pengajuan: Pengajuan
  onClose: () => void
  showActions?: boolean
  userRole?: string
  onUpdate?: () => void
}

export default function DetailModal({ pengajuan: p, onClose, showActions = false, userRole, onUpdate }: DetailModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showAttachment, setShowAttachment] = useState(false)

  const handleAction = async (action: 'approved' | 'rejected' | 'finished') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/pengajuan/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      })
      const data: { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Terjadi kesalahan')
      toast.success(`Status berhasil diubah ke ${getStatusLabel(action)}`)
      onUpdate?.()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
    } finally { setLoading(null) }
  }

  const items = p.items || []
  const isImage = p.file_url && (p.file_url.includes('/image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(p.file_url))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(30,50,80,0.18)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-mono font-semibold text-sm" style={{ color: ACCENT }}>{p.no_nota}</p>
            <StatusBadge status={p.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Basic info */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
            {[
              ['Tanggal', formatDate(p.tanggal)],
              ['Divisi', p.divisi],
              ['Pengaju', p.submitted_by_username],
              ['Waktu Pengajuan', formatDateTime(p.submitted_at)],
            ].filter(([, v]) => v).map(([label, value], i, arr) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-soft)' : 'none',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-soft)',
                }}>
                <span className="text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-4)' }}>{label}</span>
                <span className="font-medium" style={{ color: 'var(--text-1)' }}>{value as string}</span>
              </div>
            ))}
          </div>

          {/* Transfer info */}
          {(p.bank_sumber || p.bank_penerima) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Informasi Transfer</h3>
              <div className="grid grid-cols-2 gap-3">
                {p.bank_sumber && (
                  <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                    <p className="font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-4)', fontSize: '0.65rem' }}>Sumber</p>
                    <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{p.nama_sumber}</p>
                    <p style={{ color: 'var(--text-3)' }}>{p.bank_sumber}</p>
                    <p className="font-mono" style={{ color: 'var(--text-3)' }}>{p.rekening_sumber}</p>
                  </div>
                )}
                {p.bank_penerima && (
                  <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                    <p className="font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-4)', fontSize: '0.65rem' }}>Penerima</p>
                    <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{p.nama_penerima}</p>
                    <p style={{ color: 'var(--text-3)' }}>{p.bank_penerima}</p>
                    <p className="font-mono" style={{ color: 'var(--text-3)' }}>{p.rekening_penerima}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Detail Barang</h3>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)' }}>
                    {['Nama', 'Jml', 'Satuan', 'Harga', 'Subtotal'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-4)', fontSize: '0.65rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-1)' }}>{item.nama_barang}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-2)' }}>{item.jumlah}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-3)' }}>{item.satuan || '-'}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-2)' }}>{formatCurrency(item.harga)}</td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: ACCENT }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-right"
                      style={{ color: 'var(--text-3)' }}>Grand Total</td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: ACCENT }}>{formatCurrency(p.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {p.grand_total_terbilang && (
              <p className="text-xs mt-2 italic" style={{ color: 'var(--text-4)' }}>
                Terbilang: <span className="capitalize">{p.grand_total_terbilang}</span>
              </p>
            )}
          </div>

          {/* Attachment */}
          {p.file_url && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Lampiran</h3>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                {isImage && (
                  <div className="relative">
                    <img
                      src={p.file_url}
                      alt={p.file_name || 'Lampiran'}
                      className="w-full object-contain cursor-pointer"
                      style={{ maxHeight: showAttachment ? '500px' : '160px', transition: 'max-height 0.3s' }}
                      onClick={() => setShowAttachment(v => !v)}
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button onClick={() => setShowAttachment(v => !v)}
                        className="text-xs px-2 py-1 rounded-lg font-medium text-white"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        {showAttachment ? 'Perkecil' : 'Perbesar'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3"
                  style={{ background: 'var(--surface-soft)', borderTop: isImage ? '1px solid var(--border-soft)' : 'none' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent-soft)' }}>
                    {isImage ? <Image className="w-3.5 h-3.5" style={{ color: ACCENT }} /> : <FileText className="w-3.5 h-3.5" style={{ color: ACCENT }} />}
                  </div>
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                    {p.file_name || 'Lampiran'}
                  </span>
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: ACCENT }}>
                    Buka <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Keterangan */}
          {p.keterangan && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Catatan</h3>
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)', color: 'var(--text-2)' }}>
                {p.keterangan}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {p.rejection_reason && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#dc2626' }}>Alasan Penolakan</p>
              <p className="text-sm" style={{ color: '#7f1d1d' }}>{p.rejection_reason}</p>
            </div>
          )}

          {/* Status timeline */}
          {(p.approved_at || p.rejected_at || p.finished_at) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Riwayat Status</h3>
              <div className="space-y-2">
                {p.approved_at && (
                  <div className="flex justify-between text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#dbeafe', border: '1px solid #bfdbfe' }}>
                    <span className="font-medium" style={{ color: '#1e40af' }}>Disetujui oleh {p.approved_by_username}</span>
                    <span style={{ color: '#3b82f6' }}>{formatDateTime(p.approved_at)}</span>
                  </div>
                )}
                {p.rejected_at && (
                  <div className="flex justify-between text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                    <span className="font-medium" style={{ color: '#991b1b' }}>Ditolak oleh {p.rejected_by_username}</span>
                    <span style={{ color: '#ef4444' }}>{formatDateTime(p.rejected_at)}</span>
                  </div>
                )}
                {p.finished_at && (
                  <div className="flex justify-between text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#d1fae5', border: '1px solid #a7f3d0' }}>
                    <span className="font-medium" style={{ color: '#065f46' }}>Diselesaikan oleh {p.finished_by_username}</span>
                    <span style={{ color: '#10b981' }}>{formatDateTime(p.finished_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Signatures */}
          {(p.signature_user || p.signature_manager || p.signature_admin_finish) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Tanda Tangan</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Pengaju', value: p.signature_user },
                  { label: 'Manager', value: p.signature_manager },
                  { label: 'Admin', value: p.signature_admin_finish },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <QRSignature value={value || ''} label={value || ''} size={80} />
                    <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {showActions && (
            <div className="pt-2 space-y-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
              {/* Manager: approve / reject */}
              {userRole === 'manager' && p.status === 'pending' && (
                <div className="space-y-3">
                  {!showRejectForm ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleAction('approved')}
                        disabled={!!loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: '#22c55e' }}>
                        {loading === 'approved'
                          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <CheckCircle className="w-4 h-4" />}
                        Setujui
                      </button>
                      <button onClick={() => setShowRejectForm(true)}
                        disabled={!!loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: '#ef4444' }}>
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="label-field">Alasan Penolakan <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="input-field resize-none" rows={3}
                        placeholder="Jelaskan alasan penolakan..." />
                      <div className="flex gap-2">
                        <button onClick={() => setShowRejectForm(false)}
                          className="flex-1 py-2 rounded-xl text-sm font-medium"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                          Batal
                        </button>
                        <button onClick={() => handleAction('rejected')}
                          disabled={!!loading || !rejectionReason.trim()}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                          style={{ background: '#ef4444' }}>
                          {loading === 'rejected'
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                            : 'Konfirmasi Tolak'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin: finish */}
              {userRole === 'admin' && p.status === 'approved' && (
                <button onClick={() => handleAction('finished')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: '#6366f1' }}>
                  {loading === 'finished'
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Tandai Selesai
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
