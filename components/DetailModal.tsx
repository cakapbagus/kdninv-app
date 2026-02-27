'use client'

import { useState } from 'react'
import { Pengajuan } from '@/types'
import { formatCurrency, formatDate, formatDateTime, formatTime, getStatusLabel } from '@/lib/utils'
import { X, ExternalLink, FileText, CheckCircle, XCircle, Image, Printer, Download, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import Img from 'next/image'
import { KODEIN_LOGO_BASE64 } from '@/lib/logo-base64'
import { ACCENT } from '@/lib/constants'
import EditModal from '@/components/EditModal'

const QRSignature = dynamic(() => import('@/components/QRSignature'), { ssr: false })

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

// ─── Generate QR as data:image/png ──────────────────────────────────────────
async function generateQRDataUrl(value: string, size = 90): Promise<string> {
  if (!value) return ''
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch { return '' }
}

// ─── Build full print HTML string ───────────────────────────────────────────
function buildPrintHtml(p: Pengajuan, qrUser: string, qrManager: string): string {
  const items = p.items || []
  const padded = items.length > 0 ? items : [null]

  const qrCell = (src: string, label: string) =>
    src
      ? `<div style="text-align:center">
            <img src="${src}" width="80" height="80" style="display:inline-block;border:1px solid #ccc;border-radius:4px" />
            <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>${label}</p>
         </div>`
      : `<div style="text-align:center">
            <div style="width:80px;height:80px;border:1px dashed #bbb;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;text-align:center;line-height:1.4">Belum<br/>ditandatangani</div>
        </div>`
        
  const itemRows = padded.map(item => `
    <tr style="border-bottom:1px solid #ddd;height:22px">
      <td style="padding:3px 8px;text-align:center;border-right:1px solid #000;white-space:nowrap">
        ${item ? `${item.jumlah}${item.satuan ? ' ' + item.satuan : ''}` : '&nbsp;'}
      </td>
      <td style="padding:3px 10px;border-right:1px solid #000">
        ${item ? item.nama_barang : '&nbsp;'}
      </td>
      <td style="padding:3px 10px;text-align:right;border-right:1px solid #000">
        ${item && item.harga > 0 ? formatCurrency(item.harga) : '&nbsp;'}
      </td>
      <td style="padding:3px 10px;text-align:right">
        ${item && item.total > 0 ? formatCurrency(item.total) : '&nbsp;'}
      </td>
    </tr>`).join('')

  const block = `
  <div style="border:1px solid #000;font-family:Arial,sans-serif;font-size:11px;width:100%;margin-bottom:14px;page-break-inside:avoid">
    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000">
      <tr>
        <td style="width:28%;padding:8px 12px;vertical-align:middle;border-right:1px solid #000">
          <img src="${KODEIN_LOGO_BASE64}" alt="KODEIN" style="height:44px;display:block" />
        </td>
        <td style="padding:8px 14px;vertical-align:middle">
          <div style="font-weight:bold;font-size:14px;text-align:center">SEKOLAH DEVELOPER INDONESIA</div>
          <div style="margin-top:2px;text-align:center">Kp. Sadang RT. 001 RW. 002</div>
          <div style="text-align:center">Desa Ragemanunggal Kecamatan Setu, Kabupaten Bekasi</div>
        </td>
      </tr>
    </table>
    <div style="text-align:center;font-weight:bold;font-size:13px;padding:6px;border-bottom:1px solid #000;letter-spacing:0.5px">
      BUKTI KAS / BANK KELUAR
    </div>
    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000">
      <tr>
        <td style="padding:4px 10px;width:80px">Tanggal</td><td style="padding:4px 2px;width:8px">:</td>
        <td style="padding:4px 10px;font-weight:500">${formatDate(p.tanggal)}</td>
        <td style="padding:4px 10px;width:90px">Rekening Sumber</td><td style="padding:4px 2px;width:8px">:</td>
        <td style="padding:4px 8px">${p.rekening_sumber || ''}</td>
        <td style="padding:4px 10px;width:40px">Bank Sumber</td><td style="padding:4px 2px;width:8px">:</td>
        <td style="padding:4px 8px">${p.bank_sumber || ''}</td>
        <td style="padding:4px 6px;width:42px">Nama Sumber</td><td style="padding:4px 2px;width:8px">:</td>
        <td style="padding:4px 8px">${p.nama_sumber || ''}</td>
      </tr>
      <tr>
        <td style="padding:4px 10px">No. Nota</td><td style="padding:4px 2px">:</td>
        <td style="padding:4px 10px;font-family:monospace;font-size:10px;font-weight:600">${p.no_nota}</td>
        <td style="padding:4px 10px">Rekening Penerima</td><td style="padding:4px 2px">:</td>
        <td style="padding:4px 8px">${p.rekening_penerima || ''}</td>
        <td style="padding:4px 10px">Bank Penerima</td><td style="padding:4px 2px">:</td>
        <td style="padding:4px 8px">${p.bank_penerima || ''}</td>
        <td style="padding:4px 6px">Nama Penerima</td><td style="padding:4px 2px">:</td>
        <td style="padding:4px 8px">${p.nama_penerima || ''}</td>
      </tr>
      <tr>
        <td style="padding:4px 10px">Divisi</td><td style="padding:4px 2px">:</td>
        <td colspan="10" style="padding:4px 10px">${p.divisi || ''}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:1px solid #000">
          <th style="padding:6px 8px;text-align:center;font-weight:bold;border-right:1px solid #000;width:14%">BANYAKNYA</th>
          <th style="padding:6px 10px;text-align:center;font-weight:bold;border-right:1px solid #000">NAMA BARANG</th>
          <th style="padding:6px 10px;text-align:center;font-weight:bold;border-right:1px solid #000;width:22%">HARGA</th>
          <th style="padding:6px 10px;text-align:center;font-weight:bold;width:22%">JUMLAH</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td colspan="3" style="padding:5px 10px;text-align:right;font-weight:bold;border-top:1px solid #000;border-right:1px solid #000">TOTAL</td>
          <td style="padding:5px 10px;text-align:right;font-weight:bold;border-top:1px solid #000">${formatCurrency(p.grand_total)}</td>
        </tr>
        <tr style="border-top:1px solid #000">
          <td colspan="4" style="padding:5px 10px">
            <span style="font-weight:bold">Terbilang</span>&nbsp;&nbsp;
            <span style="display:inline-block;border-bottom:1px solid #000;min-width:75%;padding-bottom:1px;font-style:italic;text-transform:capitalize">
              ${p.grand_total_terbilang || '&nbsp;'}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #000">
      <tr>
        <td style="padding:10px 14px;width:38%;vertical-align:top;border-right:1px solid #000">
          <div style="margin-bottom:6px">Pemohon,</div>
          ${qrCell(qrUser, p.submitted_by_full_name || p.submitted_by_username || '')}
          <div style="font-size:9px;color:#555;margin-top:6px;text-align:center">(ditandatangani secara elektronik)</div>
        </td>
        <td style="padding:10px 14px;width:38%;vertical-align:top;border-right:1px solid #000">
          <div style="margin-bottom:6px">Disetujui oleh,</div>
          ${qrCell(qrManager, p.approved_by_full_name || p.approved_by_username || '')}
          <div style="font-size:9px;color:#555;margin-top:6px;text-align:center">(ditandatangani secara elektronik)</div>
        </td>
        <td style="padding:10px 14px;width:24%;vertical-align:top;font-size:9px">
          <div style="font-weight:bold;margin-bottom:4px">Catatan:</div>
          <div>${p.keterangan ? p.keterangan : ''}</div>
        </td>
      </tr>
    </table>
  </div>`

  return `<!DOCTYPE html>
<html>
<head>
  <title>Bukti Kas / Bank Keluar - ${p.no_nota}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; background: #fff; color: #000; }
    @page { size: A4 portrait; margin: 12mm; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div style="padding:8px">
    ${block}
  </div>
  <div class="no-print" style="text-align:center;margin:20px 0;padding-bottom:16px">
    <button onclick="window.print()" style="padding:8px 28px;font-size:13px;cursor:pointer;background:#4f6ef7;color:#fff;border:none;border-radius:6px;margin-right:10px;font-weight:600">
      🖨️&nbsp; Cetak
    </button>
    <button onclick="window.close()" style="padding:8px 20px;font-size:13px;cursor:pointer;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;font-weight:500">
      Tutup
    </button>
  </div>
</body>
</html>`
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DetailModal({ pengajuan: p, onClose, showActions = false, userRole, onUpdate }: DetailModalProps) {
  console.log(p.signature_user)

  const [loading, setLoading] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showAttachment, setShowAttachment] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

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

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const [qrUser, qrManager] = await Promise.all([
        generateQRDataUrl(p.signature_user || ''),
        generateQRDataUrl(p.signature_manager || ''),
      ])
      const html = buildPrintHtml(p, qrUser, qrManager)
      const win = window.open('', '_blank', 'width=900,height=720')
      if (!win) { toast.error('Popup diblokir browser'); return }
      win.document.write(html)
      win.document.close()
      win.focus()
    } catch (err) {
      toast.error('Gagal membuka preview cetak')
      console.error(err)
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadZip = async () => {
    if (attachments.length === 0) return
    const toastId = toast.loading('Menyiapkan ZIP...')
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      await Promise.all(
        attachments.map(async (att, idx) => {
          const res = await fetch(att.url)
          const blob = await res.blob()
          const ext = att.url.split('?')[0].split('.').pop() || 'jpg'
          const filename = att.name
            ? att.name
            : `lampiran_${idx + 1}.${ext}`
          zip.file(filename, blob)
        })
      )

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `lampiran_${p.no_nota}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('ZIP berhasil didownload', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat ZIP', { id: toastId })
    }
  }

  const items = p.items || []
  const attachments = p.files && p.files.length > 0
    ? p.files
    : p.file_url
      ? [{ url: p.file_url, public_id: p.file_public_id ?? '', name: p.file_name ?? 'Lampiran' }]
      : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(30,50,80,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <p className="font-mono font-semibold text-sm" style={{ color: ACCENT }}>{p.no_nota}</p>
            <StatusBadge status={p.status} />
          </div>
          <div className="flex items-center gap-2">
            {['pending', 'rejected'].includes(p.status) && (
              <button
                onClick={e => { e.stopPropagation(); setShowEdit(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--surface-soft)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                title="Edit Pengajuan"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); handlePrint() }}
              disabled={printing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--accent-soft)', color: ACCENT, border: '1px solid rgba(79,110,247,0.25)' }}
              title="Cetak Bukti Kas / Bank Keluar"
            >
              {printing
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Printer className="w-3.5 h-3.5" />
              }
              {printing ? 'Menyiapkan...' : 'Print'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Basic info */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
            {[
              ['Tanggal', formatDate(p.tanggal)],
              ['Waktu Pengajuan', formatTime(p.submitted_at)],
              ['Pengaju', p.submitted_by_username],
              ['Divisi', p.divisi],
            ].filter(([, v]) => v).map(([label, value], i, arr) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-soft)' : 'none',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-soft)',
                }}>
                <span className="text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-4)' }}>{label}</span>
                <span className="font-medium text-right" style={{ color: 'var(--text-1)' }}>{value as string}</span>
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

            {/* Desktop: tabel */}
            <div className="hidden sm:block rounded-xl overflow-hidden overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs" style={{ minWidth: '420px' }}>
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
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-1)', wordBreak: 'break-word', minWidth: '120px' }}>{item.nama_barang}</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{item.jumlah}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{item.satuan || '-'}</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatCurrency(item.harga)}</td>
                      <td className="px-3 py-2.5 font-semibold text-right" style={{ color: ACCENT, whiteSpace: 'nowrap' }}>{formatCurrency(item.total)}</td>
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

            {/* Mobile: card per item */}
            <div className="sm:hidden space-y-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl px-4 py-3"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                  <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-1)' }}>{item.nama_barang}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span style={{ color: 'var(--text-4)' }}>Jumlah</span>
                    <span style={{ color: 'var(--text-2)' }}>{item.jumlah} {item.satuan || ''}</span>
                    <span style={{ color: 'var(--text-4)' }}>Harga Satuan</span>
                    <span style={{ color: 'var(--text-2)' }}>{formatCurrency(item.harga)}</span>
                    <span style={{ color: 'var(--text-4)' }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: ACCENT }}>{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-xl px-4 py-3 flex justify-between items-center"
                style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Grand Total</span>
                <span className="font-bold text-sm" style={{ color: ACCENT }}>{formatCurrency(p.grand_total)}</span>
              </div>
            </div>

            {p.grand_total_terbilang && (
              <p className="text-xs mt-2 italic" style={{ color: 'var(--text-4)' }}>
                Terbilang: <span className="capitalize">{p.grand_total_terbilang}</span>
              </p>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  Lampiran ({attachments.length})
                </h3>
              </div>
              <div className="space-y-2">
                {attachments.map((att, idx) => {
                  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url)
                  const formattedUrl = isImg ? att.url : att.url.replace('.pdf','.jpg')
                  return (
                    <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                      {formattedUrl && (
                        <div className="relative">
                          <Img
                            src={formattedUrl}
                            alt={att.name || 'Lampiran'}
                            className="w-full object-contain cursor-pointer"
                            width={500}
                            height={500}
                            style={{ maxHeight: showAttachment ? '500px' : '160px', transition: 'max-height 0.3s' }}
                            onClick={() => setShowAttachment(v => !v)}
                          />
                          <div className="absolute bottom-2 right-2">
                            <button onClick={() => setShowAttachment(v => !v)}
                              className="text-xs px-2 py-1 rounded-lg font-medium !text-white"
                              style={{ background: 'rgba(0,0,0,0.5)' }}>
                              {showAttachment ? 'Perkecil' : 'Perbesar'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 px-4 py-3"
                        style={{ background: 'var(--surface-soft)', borderTop: '1px solid var(--border-soft)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--accent-soft)' }}>
                          {isImg ? <Image className="w-3.5 h-3.5" style={{ color: ACCENT }} /> : <FileText className="w-3.5 h-3.5" style={{ color: ACCENT }} />}
                        </div>
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                          {att.name || `Lampiran ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <a href={att.url} download={att.name || `lampiran_${idx + 1}`}
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: 'var(--text-3)' }}
                            onClick={async e => {
                              // Cloudinary URL lintas domain — harus fetch dulu lalu blob download
                              e.preventDefault()
                              try {
                                const res = await fetch(att.url)
                                const blob = await res.blob()
                                const ext = att.url.split('?')[0].split('.').pop() || 'jpg'
                                const filename = att.name || `lampiran_${idx + 1}.${ext}`
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = filename
                                a.click()
                                URL.revokeObjectURL(url)
                              } catch {
                                toast.error('Gagal mendownload file')
                              }
                            }}>
                            <Download className="w-3 h-3" />
                            Unduh
                          </a>
                          <a href={att.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: ACCENT }}>
                            Buka <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end mt-2">
                {attachments.length > 1 && (
                  <button onClick={handleDownloadZip}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                    <Download className="w-3.5 h-3.5" />
                    Download Lampiran (zip)
                  </button>
                )}
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
                ]
                .map(({ label, value }) => (
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
              {userRole === 'manager' && p.status === 'pending' && (
                <div className="space-y-3">
                  {!showRejectForm ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleAction('approved')}
                        disabled={!!loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
                        style={{ background: '#22c55e' }}>
                        {loading === 'approved'
                          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <CheckCircle className="w-4 h-4" />}
                        Setujui
                      </button>
                      <button onClick={() => setShowRejectForm(true)}
                        disabled={!!loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
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
                          className="flex-1 py-2 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
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

              {userRole === 'admin' && p.status === 'approved' && (
                <button onClick={() => handleAction('finished')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
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

      {showEdit && (
        <EditModal
          pengajuan={p}
          onClose={() => { setShowEdit(false); onClose() }}
          onSuccess={() => { setShowEdit(false); onUpdate?.(); onClose() }}
        />
      )}
    </div>
  )
}
