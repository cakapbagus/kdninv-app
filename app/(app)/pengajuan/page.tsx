'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { generateSignature, formatCurrency, angkaTerbilang } from '@/lib/utils'
import toast from 'react-hot-toast'
import { PengajuanItem } from '@/types'
import { format } from 'date-fns'
import { Plus, Trash2, CheckCircle, Upload, X, Image } from 'lucide-react'
import dynamic from 'next/dynamic'

const QRSignature = dynamic(() => import('@/components/QRSignature'), { ssr: false })

const ACCENT = '#4f6ef7'
const emptyItem = (): PengajuanItem => ({ nama_barang: '', jumlah: 1, satuan: '', harga: 0, total: 0 })

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider mb-5 pb-3"
        style={{ color: ACCENT, borderBottom: '1px solid var(--border-soft)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function PengajuanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [noNota, setNoNota] = useState('')
  const [signature, setSignature] = useState('')
  const [username, setUsername] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ url: string; public_id: string; name: string } | null>(null)
  const [items, setItems] = useState<PengajuanItem[]>([emptyItem()])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    divisi: '',
    rekening_sumber: '', bank_sumber: '', nama_sumber: '',
    rekening_penerima: '', bank_penerima: '', nama_penerima: '',
    catatan: '',
  })

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return
      const user = await res.json()
      setUsername(user.username)
      setSignature(generateSignature(user.username))

      const noteRes = await fetch('/api/nota-counter')
      if (noteRes.ok) {
        const { no_nota } = await noteRes.json()
        setNoNota(no_nota)
      }
    }
    init()
  }, [])

  const updateItem = (idx: number, field: keyof PengajuanItem, value: string | number) => {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[idx], [field]: value }
      if (field === 'jumlah' || field === 'harga') {
        item.total = Number(field === 'jumlah' ? value : item.jumlah) * Number(field === 'harga' ? value : item.harga)
      }
      next[idx] = item
      return next
    })
  }

  const grandTotal = items.reduce((s, i) => s + (i.total || 0), 0)

  const handleFileSelect = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimal 5 MB'); return }
    setSelectedFile(file)

    // Preview for images
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }

    // Upload immediately to Cloudinary
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData: { error?: string; url?: string; public_id?: string } = await res.json()
      if (!res.ok) throw new Error(uploadData.error ?? 'Upload gagal')
      setUploadedFile({ url: uploadData.url ?? '', public_id: uploadData.public_id ?? '', name: file.name })
      toast.success('File berhasil diupload')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setSelectedFile(null)
      setPreviewUrl(null)
    } finally {
      setUploadingFile(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploadingFile) { toast.error('Tunggu file selesai diupload'); return }

    for (const item of items) {
      if (!item.nama_barang.trim()) { toast.error('Nama barang wajib diisi'); return }
      if (!item.jumlah || item.jumlah <= 0) { toast.error('Jumlah harus lebih dari 0'); return }
      if (!item.harga || item.harga <= 0) { toast.error('Harga harus lebih dari 0'); return }
    }

    setLoading(true)
    try {
      const sig = generateSignature(username)
      const res = await fetch('/api/pengajuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: form.tanggal,
          divisi: form.divisi || null,
          rekening_sumber: form.rekening_sumber || null,
          bank_sumber: form.bank_sumber || null,
          nama_sumber: form.nama_sumber || null,
          rekening_penerima: form.rekening_penerima || null,
          bank_penerima: form.bank_penerima || null,
          nama_penerima: form.nama_penerima || null,
          items,
          signature_user: sig,
          file_url: uploadedFile?.url || null,
          file_public_id: uploadedFile?.public_id || null,
          file_name: uploadedFile?.name || null,
          keterangan: form.catatan || null,
        }),
      })
      const submitData: { error?: string; id?: string; no_nota?: string } = await res.json()
      if (!res.ok) throw new Error(submitData.error ?? 'Terjadi kesalahan')
      toast.success('Pengajuan berhasil dikirim!')
      router.push('/history')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim pengajuan')
    } finally {
      setLoading(false)
    }
  }

  const F = ({ label, name, type = 'text', req = false, placeholder = '' }: {
    label: string; name: keyof typeof form; type?: string; req?: boolean; placeholder?: string
  }) => (
    <div>
      <label className="label-field">{label} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>
      <input type={type} value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        className="input-field" placeholder={placeholder} required={req} />
    </div>
  )

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
          Form Pengajuan
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Buat nota pengajuan baru</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informasi Nota */}
        <div className="animate-fadeInUp stagger-1">
          <Section title="Informasi Nota">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">No. Nota</label>
                <div className="input-field font-mono font-semibold cursor-not-allowed select-none"
                  style={{ background: 'var(--surface-soft)', color: ACCENT }}>
                  {noNota || 'Generating...'}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Otomatis digenerate saat submit</p>
              </div>
              <F label="Tanggal" name="tanggal" type="date" req />
              <F label="Divisi" name="divisi" placeholder="Contoh: Keuangan" />
            </div>
          </Section>
        </div>

        {/* Informasi Transfer */}
        <div className="animate-fadeInUp stagger-2">
          <Section title="Informasi Transfer">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-2"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border-soft)' }}>Sumber Dana</h3>
                <F label="Rekening Sumber" name="rekening_sumber" placeholder="Nomor rekening" />
                <F label="Bank Sumber" name="bank_sumber" placeholder="Nama bank" />
                <F label="Nama Sumber" name="nama_sumber" placeholder="Nama pemilik rekening" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-2"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border-soft)' }}>Penerima Dana</h3>
                <F label="Rekening Penerima" name="rekening_penerima" placeholder="Nomor rekening" />
                <F label="Bank Penerima" name="bank_penerima" placeholder="Nama bank" />
                <F label="Nama Penerima" name="nama_penerima" placeholder="Nama pemilik rekening" />
              </div>
            </div>
          </Section>
        </div>

        {/* Detail Barang */}
        <div className="animate-fadeInUp stagger-3">
          <Section title="Detail Barang">
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl p-4 relative"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 p-1.5 rounded-lg"
                      style={{ color: '#ef4444', background: '#fef2f2' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-4)' }}>Barang {idx + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="label-field">Nama Barang <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="text" value={item.nama_barang}
                        onChange={e => updateItem(idx, 'nama_barang', e.target.value)}
                        className="input-field" placeholder="Deskripsi barang atau jasa" required />
                    </div>
                    <div>
                      <label className="label-field">Jumlah <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="number" value={item.jumlah || ''}
                        onChange={e => updateItem(idx, 'jumlah', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        className="input-field" placeholder="0" min="1" step="1" required />
                    </div>
                    <div>
                      <label className="label-field">Satuan</label>
                      <input type="text" value={item.satuan}
                        onChange={e => updateItem(idx, 'satuan', e.target.value)}
                        className="input-field" placeholder="pcs, kg, unit..." />
                    </div>
                    <div>
                      <label className="label-field">Harga Satuan <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="number" value={item.harga || ''}
                        onChange={e => updateItem(idx, 'harga', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        className="input-field" placeholder="0" min="1" step="1" required />
                    </div>
                    <div>
                      <label className="label-field">Subtotal</label>
                      <div className="input-field font-semibold cursor-not-allowed"
                        style={{ background: 'var(--border-soft)', color: ACCENT }}>
                        {item.total > 0 ? formatCurrency(item.total) : 'Rp 0'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl"
                style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px dashed rgba(79,110,247,0.3)' }}>
                <Plus className="w-4 h-4" />
                Tambah Barang
              </button>
            </div>

            {grandTotal > 0 && (
              <div className="mt-5 space-y-2">
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Total Keseluruhan</span>
                  <span className="text-lg font-bold" style={{ color: ACCENT, fontFamily: "'Poppins',sans-serif" }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
                <div className="rounded-xl px-4 py-2.5"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Terbilang: <span className="italic capitalize" style={{ color: 'var(--text-2)' }}>
                      {angkaTerbilang(grandTotal)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Catatan */}
        <div className="animate-fadeInUp stagger-4">
          <Section title="Catatan">
            <textarea value={form.catatan}
              onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
              className="input-field resize-none" rows={3}
              placeholder="Catatan tambahan (opsional)" />
          </Section>
        </div>

        {/* Lampiran */}
        <div className="animate-fadeInUp stagger-4">
          <Section title="Lampiran">
            <p className="text-xs mb-3" style={{ color: 'var(--text-4)' }}>
              Upload foto/file bukti (opsional, maks. 5 MB) — disimpan di Cloudinary
            </p>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden" />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#fff', border: '1px solid rgba(79,110,247,0.2)' }}>
                    {uploadingFile
                      ? <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                      : uploadedFile
                        ? <Image className="w-4 h-4" style={{ color: '#22c55e' }} />
                        : <Upload className="w-4 h-4" style={{ color: ACCENT }} />
                    }
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{selectedFile.name}</p>
                    <p className="text-xs" style={{ color: uploadedFile ? '#22c55e' : 'var(--text-4)' }}>
                      {uploadingFile ? 'Mengupload ke Cloudinary...' : uploadedFile ? '✓ Tersimpan di Cloudinary' : 'Menunggu upload'}
                    </p>
                  </div>
                  <button type="button" onClick={removeFile}
                    className="p-1.5 rounded-lg" style={{ color: '#ef4444', background: '#fef2f2' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Image preview */}
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)', maxHeight: '200px' }}>
                    <img src={previewUrl} alt="Preview" className="w-full object-contain" style={{ maxHeight: '200px' }} />
                  </div>
                )}

                {/* Cloudinary URL display */}
                {uploadedFile && (
                  <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                    style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                    <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-4)' }}>
                      {uploadedFile.url}
                    </span>
                    <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium shrink-0" style={{ color: ACCENT }}>
                      Lihat →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-5 rounded-xl transition-all"
                style={{ border: '2px dashed var(--border)', color: 'var(--text-3)' }}>
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">Pilih File / Ambil Foto</span>
              </button>
            )}
          </Section>
        </div>

        {/* QR Signature */}
        <div className="animate-fadeInUp stagger-5">
          <Section title="Tanda Tangan">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center gap-3">
                <QRSignature value={signature} label={signature} size={110} />
                <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>Tanda tangan pengaju</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <QRSignature value="" label="" size={110} />
                <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
                  Tanda tangan manager<br />
                  <span style={{ color: 'var(--text-4)', fontSize: '0.7rem' }}>Diisi setelah persetujuan</span>
                </p>
              </div>
            </div>
          </Section>
        </div>

        {/* Submit */}
        <div className="flex gap-3 animate-fadeInUp stagger-5 pb-4">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 px-6 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}>
            Batal
          </button>
          <button type="submit" disabled={loading || uploadingFile}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: ACCENT }}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
              : <><CheckCircle className="w-4 h-4" />Kirim Pengajuan</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
