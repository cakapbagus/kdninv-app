'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2, Upload, Image as ImageIcon, FileText } from 'lucide-react'
import Img from 'next/image'
import toast from 'react-hot-toast'
import { formatCurrency, angkaTerbilang } from '@/lib/utils'
import type { Pengajuan, PengajuanItem, FileAttachment } from '@/types'

const ACCENT = '#4f6ef7'
const LIMIT_UPLOAD = 3
const ALLOWED_MIME = ['image/jpeg','image/png','image/jpg','image/webp','image/gif','application/pdf']
const emptyItem = (): PengajuanItem => ({ nama_barang: '', jumlah: 1, satuan: '', harga: 0, total: 0 })

type LocalFile = { file: File; previewUrl?: string }
type ExistingFile = FileAttachment & { previewUrl?: string }

// ── Reusable sub-components ──────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-soft)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text' }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label htmlFor={`edit-${name}`} className="label-field">{label}</label>
      <input id={`edit-${name}`} type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder} className="input-field" />
    </div>
  )
}

// ── Compress image via canvas ─────────────────────────────────────────────────
function compressImage(file: File, maxSizeMB = 1.5): Promise<File> {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const MAX_DIM = 1920
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const tryCompress = (quality: number) => {
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp', lastModified: Date.now() }))
          } else { tryCompress(Math.round((quality - 0.1) * 10) / 10) }
        }, 'image/webp', quality)
      }
      tryCompress(0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  pengajuan: Pengajuan
  onClose: () => void
  onSuccess: () => void
}

export default function EditModal({ pengajuan: p, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state — hanya field yang boleh diedit
  const [divisi,           setDivisi]          = useState(p.divisi ?? '')
  const [rekeningS,        setRekeningS]        = useState(p.rekening_sumber ?? '')
  const [bankS,            setBankS]            = useState(p.bank_sumber ?? '')
  const [namaS,            setNamaS]            = useState(p.nama_sumber ?? '')
  const [rekeningP,        setRekeningP]        = useState(p.rekening_penerima ?? '')
  const [bankP,            setBankP]            = useState(p.bank_penerima ?? '')
  const [namaP,            setNamaP]            = useState(p.nama_penerima ?? '')
  const [catatan,          setCatatan]          = useState(p.keterangan ?? '')
  const [items,            setItems]            = useState<PengajuanItem[]>(
    p.items?.length ? p.items.map(i => ({ ...i })) : [emptyItem()]
  )

  // Files state: existing (sudah di Cloudinary) + new local files
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>(
    p.files && p.files.length > 0
      ? p.files.map(f => ({ ...f }))
      : p.file_url
        ? [{ url: p.file_url, public_id: p.file_public_id ?? '', name: p.file_name ?? 'Lampiran' }]
        : []
  )
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([])
  const [loading, setLoading] = useState(false)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      localFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
    }
  }, [localFiles])

  const totalFiles = existingFiles.length + localFiles.length

  // ── Items ─────────────────────────────────────────────────────────────────
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

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileSelect = async (files: FileList) => {
    const remaining = LIMIT_UPLOAD - totalFiles
    if (remaining <= 0) { toast.error(`Maksimum ${LIMIT_UPLOAD} file lampiran`); return }
    const toAdd = Array.from(files).slice(0, remaining)
    for (const file of toAdd) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`File "${file.name}" tidak didukung`); continue
      }
      let f = file
      if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
        toast.loading(`Mengompres "${file.name}"...`, { id: `c-${file.name}` })
        f = await compressImage(file)
        toast.dismiss(`c-${file.name}`)
        if (f.size > 2 * 1024 * 1024) { toast.error(`"${file.name}" masih terlalu besar`); continue }
        toast.success(`"${file.name}" dikompres ke ${(f.size / 1024).toFixed(0)} KB`)
      } else if (f.size > 2 * 1024 * 1024) {
        toast.error(`File "${file.name}" melebihi 2 MB`); continue
      }
      const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined
      setLocalFiles(prev => [...prev, { file: f, previewUrl }])
    }
  }

  const removeExisting = (idx: number) => setExistingFiles(prev => prev.filter((_, i) => i !== idx))
  const removeLocal    = (idx: number) => {
    setLocalFiles(prev => {
      const removed = prev[idx]
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    for (const item of items) {
      if (!item.nama_barang.trim()) { toast.error('Nama barang wajib diisi'); return }
      if (!item.jumlah || item.jumlah <= 0) { toast.error('Jumlah harus > 0'); return }
      if (!item.harga  || item.harga  <= 0) { toast.error('Harga harus > 0');  return }
    }
    setLoading(true)
    try {
      // Upload file baru
      const noNotaSlug = p.no_nota.replace(/\//g, '-')
      const newUploaded: FileAttachment[] = []
      for (let i = 0; i < localFiles.length; i++) {
        const { file } = localFiles[i]
        const ext = file.name.split('.').pop() || 'webp'
        const filenameOverride = `lampiran_${existingFiles.length + i + 1}_${noNotaSlug}.${ext}`
        const fd = new FormData()
        fd.append('file', file)
        fd.append('filename_override', filenameOverride)
        const res  = await fetch('/api/upload', { method: 'POST', body: fd })
        const data: { error?: string; url?: string; public_id?: string } = await res.json()
        if (!res.ok) throw new Error(data.error ?? `Gagal upload lampiran ${i + 1}`)
        newUploaded.push({ url: data.url ?? '', public_id: data.public_id ?? '', name: filenameOverride })
      }

      const allFiles = [...existingFiles.map(f => ({ url: f.url, public_id: f.public_id, name: f.name })), ...newUploaded]
      const itemsWithTotal = items.map(i => ({ ...i, jumlah: Number(i.jumlah), harga: Number(i.harga), total: Number(i.jumlah) * Number(i.harga) }))
      const gt = itemsWithTotal.reduce((s, i) => s + i.total, 0)

      const res = await fetch(`/api/pengajuan/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          divisi:            divisi || null,
          rekening_sumber:   rekeningS || null,
          bank_sumber:       bankS     || null,
          nama_sumber:       namaS     || null,
          rekening_penerima: rekeningP || null,
          bank_penerima:     bankP     || null,
          nama_penerima:     namaP     || null,
          items:             itemsWithTotal,
          grand_total:       gt,
          grand_total_terbilang: angkaTerbilang(gt),
          files:             allFiles,
          file_url:          allFiles[0]?.url          ?? null,
          file_public_id:    allFiles[0]?.public_id    ?? null,
          file_name:         allFiles[0]?.name         ?? null,
          keterangan:        catatan   || null,
        }),
      })
      const data: { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan')
      toast.success('Pengajuan berhasil diperbarui')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(30,50,80,0.18)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className='min-w-0 mr-3'>
            <p className="font-mono font-semibold text-sm truncate" style={{ color: ACCENT }}>{p.no_nota}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Edit Pengajuan</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0" style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Divisi */}
          <Section title="Informasi Nota">
            <Field label="Divisi" name="divisi" value={divisi} onChange={e => setDivisi(e.target.value)} placeholder="Contoh: Keuangan" />
          </Section>

          {/* Transfer */}
          <Section title="Informasi Transfer">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider pb-2"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border-soft)' }}>Sumber Dana</h4>
                <Field label="Rekening Sumber"  name="rekening_sumber" value={rekeningS} onChange={e => setRekeningS(e.target.value)} placeholder="Nomor rekening" />
                <Field label="Bank Sumber"       name="bank_sumber"     value={bankS}     onChange={e => setBankS(e.target.value)}     placeholder="Nama bank" />
                <Field label="Nama Sumber"       name="nama_sumber"     value={namaS}     onChange={e => setNamaS(e.target.value)}     placeholder="Nama pemilik rekening" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider pb-2"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border-soft)' }}>Penerima Dana</h4>
                <Field label="Rekening Penerima" name="rekening_penerima" value={rekeningP} onChange={e => setRekeningP(e.target.value)} placeholder="Nomor rekening" />
                <Field label="Bank Penerima"      name="bank_penerima"    value={bankP}     onChange={e => setBankP(e.target.value)}     placeholder="Nama bank" />
                <Field label="Nama Penerima"      name="nama_penerima"    value={namaP}     onChange={e => setNamaP(e.target.value)}     placeholder="Nama pemilik rekening" />
              </div>
            </div>
          </Section>

          {/* Detail Barang */}
          <Section title="Detail Barang">
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl p-4 relative"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 p-1 rounded-lg"
                      style={{ color: '#ef4444', background: '#fef2f2' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 pr-8">
                    <div className="col-span-2">
                      <label className="label-field">Nama Barang/Jasa</label>
                      <input type="text" value={item.nama_barang}
                        onChange={e => updateItem(idx, 'nama_barang', e.target.value)}
                        className="input-field" placeholder="Nama barang atau jasa" />
                    </div>
                    <div>
                      <label className="label-field">Jumlah</label>
                      <input type="number" min={1} value={item.jumlah || ''}
                        onChange={e => updateItem(idx, 'jumlah', Number(e.target.value))}
                        className="input-field" />
                    </div>
                    <div>
                      <label className="label-field">Satuan</label>
                      <input type="text" value={item.satuan}
                        onChange={e => updateItem(idx, 'satuan', e.target.value)}
                        className="input-field" placeholder="pcs, kg, dll" />
                    </div>
                    <div>
                      <label className="label-field">Harga Satuan</label>
                      <input type="number" min={0} value={item.harga || ''}
                        onChange={e => updateItem(idx, 'harga', Number(e.target.value))}
                        className="input-field" />
                    </div>
                    <div>
                      <label className="label-field">Subtotal</label>
                      <div className="input-field font-semibold cursor-default select-none"
                        style={{ background: 'var(--surface-soft)', color: ACCENT }}>
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button type="button"
                  onClick={() => setItems(prev => [...prev, emptyItem()])}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl"
                  style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                  <Plus className="w-4 h-4" /> Tambah Barang
                </button>
                <div className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--accent-soft)', color: ACCENT, border: '1px solid rgba(79,110,247,0.2)' }}>
                  Total: {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>
          </Section>

          {/* Catatan */}
          <Section title="Catatan">
            <textarea value={catatan}
              onChange={e => setCatatan(e.target.value)}
              className="input-field resize-none" rows={3}
              placeholder="Catatan tambahan (opsional)" />
          </Section>

          {/* Lampiran */}
          <Section title="Lampiran">
            <p className="text-xs mb-3" style={{ color: 'var(--text-4)' }}>
              Maks. {LIMIT_UPLOAD} file · maks. 2 MB per file
            </p>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple
              onChange={e => e.target.files && handleFileSelect(e.target.files)} className="hidden" />

            {/* Existing files */}
            {existingFiles.length > 0 && (
              <div className="space-y-2 mb-2">
                {existingFiles.map((f, idx) => {
                  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url) || f.url.includes('/image/upload/')
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: '#fff', border: '1px solid rgba(79,110,247,0.2)' }}>
                        {isImg ? <ImageIcon className="w-4 h-4" style={{ color: '#22c55e' }} /> : <FileText className="w-4 h-4" style={{ color: '#22c55e' }} />}
                      </div>
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-2)' }}>{f.name || `Lampiran ${idx + 1}`}</span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium shrink-0" style={{ color: ACCENT }}>Lihat →</a>
                      <button type="button" onClick={() => removeExisting(idx)}
                        className="p-1.5 rounded-lg shrink-0" style={{ color: '#ef4444', background: '#fef2f2' }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* New local files */}
            {localFiles.length > 0 && (
              <div className="space-y-2 mb-2">
                {localFiles.map((f, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                        {f.previewUrl ? <ImageIcon className="w-4 h-4" style={{ color: ACCENT }} /> : <FileText className="w-4 h-4" style={{ color: ACCENT }} />}
                      </div>
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-1)' }}>{f.file.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-4)' }}>Baru</span>
                      <button type="button" onClick={() => removeLocal(idx)}
                        className="p-1.5 rounded-lg shrink-0" style={{ color: '#ef4444', background: '#fef2f2' }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {f.previewUrl && (
                      <div className="rounded-xl overflow-hidden mt-1" style={{ border: '1px solid var(--border-soft)', maxHeight: '120px' }}>
                        <Img src={f.previewUrl} alt="Preview" className="w-full object-contain" width={400} height={300} style={{ maxHeight: '120px' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalFiles < LIMIT_UPLOAD && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl"
                style={{ border: '2px dashed var(--border)', color: 'var(--text-3)' }}>
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {totalFiles === 0 ? 'Pilih File / Ambil Foto' : `Tambah File (${totalFiles}/${LIMIT_UPLOAD})`}
                </span>
              </button>
            )}
          </Section>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}>
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
              style={{ background: ACCENT }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
                : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}