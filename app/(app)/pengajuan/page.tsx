'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { generateSignature, formatCurrency, angkaTerbilang } from '@/lib/utils'
import toast from 'react-hot-toast'
import { PengajuanItem, Rekening } from '@/types'
import { format } from 'date-fns'
import { Plus, Trash2, CheckCircle, Upload, X, Image, FileText } from 'lucide-react'
import Img from 'next/image'
import { ACCENT, MAX_UPLOAD_SIZE, ALLOWED_MIME_TYPES, LIMIT_UPLOAD } from '@/lib/constants'

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

function Field({
  label,
  type = 'text',
  req = false,
  placeholder = '',
  value,
  numberOnly = false,
  alphaOnly = false,
  onChange
}: {
  label: string
  type?: string
  req?: boolean
  placeholder?: string
  value: string
  numberOnly?: boolean
  alphaOnly?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    if (numberOnly) {
      newValue = newValue.replace(/[^0-9]/g, '')
    }

    if (alphaOnly) {
      newValue = newValue.replace(/[^a-zA-Z\s]/g, '')
    }

    e.target.value = newValue
    onChange(e)
  }

  return (
    <div>
      <label className="label-field">
        {label} {req && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className="input-field"
        placeholder={placeholder}
        required={req}
        inputMode={numberOnly ? "numeric" : undefined}
      />
    </div>
  )
}

export default function PengajuanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [noNota, setNoNota] = useState('')
  const [signature, setSignature] = useState('')
  const [username, setUsername] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl?: string }[]>([])
  const [items, setItems] = useState<PengajuanItem[]>([emptyItem()])

  const [form, setForm] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    divisi: '',
    rekening_sumber: '', bank_sumber: '', nama_sumber: '',
    rekening_penerima: '', bank_penerima: '', nama_penerima: '',
    catatan: '',
  })
  const [rekeningList, setRekeningList] = useState<Rekening[]>([])
  const [saveSumber,   setSaveSumber]   = useState(false)
  const [savePenerima, setSavePenerima] = useState(false)

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

      const rekRes = await fetch('/api/rekening')
      if (rekRes.ok) setRekeningList(await rekRes.json())
    }
    init()
  }, [])

  const fillSumber = (r: Rekening) => setForm(p => ({
    ...p, rekening_sumber: r.no_rekening, bank_sumber: r.bank, nama_sumber: r.nama
  }))

  const fillPenerima = (r: Rekening) => setForm(p => ({
    ...p, rekening_penerima: r.no_rekening, bank_penerima: r.bank, nama_penerima: r.nama
  }))

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
  
  const compressImage = (file: File, maxSize = MAX_UPLOAD_SIZE, defQuality = 0.9): Promise<File> => {
    return new Promise((resolve) => {
      // PDF skip
      if (file.type === 'application/pdf') { resolve(file); return }

      const img = new window.Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        let { width, height } = img
        const MAX_DIM = 1920

        // Perkecil dimensi kalau terlalu besar
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
          else                { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
        }

        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

        // Coba quality 0.9 dulu, kalau masih > maxSizeMB turunkan terus
        const tryCompress = (quality: number) => {
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return }

            if (blob.size <= maxSize || quality <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp', lastModified: Date.now() }))
            } else {
              tryCompress(Math.round((quality - 0.1) * 10) / 10)
            }
          }, 'image/webp', quality)
        }

        tryCompress(defQuality)
      }

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  const handleFileSelect = async (files: FileList) => {
    const remaining = LIMIT_UPLOAD - selectedFiles.length
    const toAdd = Array.from(files).slice(0, remaining)

    if (toAdd.length === 0) {
      toast.error(`Maksimum ${LIMIT_UPLOAD} file lampiran`)
      return
    }

    for (const file of toAdd) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`File "${file.name}" bukan gambar (JPG, PNG, WEBP, GIF) atau PDF`)
        continue
      }

      let fileToAdd = file
      if (file.type !== 'application/pdf' && file.size > MAX_UPLOAD_SIZE) {
        toast.loading(`Mengompres "${file.name}"...`, { id: `compress-${file.name}` })
        fileToAdd = await compressImage(file)
        toast.dismiss(`compress-${file.name}`)
        if (fileToAdd.size <= MAX_UPLOAD_SIZE) {
          toast.success(`"${file.name}" dikompres ke ${(fileToAdd.size / 1024).toFixed(0)} KB`)
        } else {
          toast.error(`"${file.name}" masih terlalu besar setelah dikompres`)
          continue
        }
      }

      const previewUrl = fileToAdd.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      setSelectedFiles(prev => [...prev, { file: fileToAdd, previewUrl }])
    }
  }

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => {
      const removed = prev[idx]
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    for (const item of items) {
      if (!item.nama_barang.trim()) { toast.error('Nama barang wajib diisi'); return }
      if (!item.jumlah || item.jumlah <= 0) { toast.error('Jumlah harus lebih dari 0'); return }
      if (!item.harga || item.harga <= 0) { toast.error('Harga harus lebih dari 0'); return }
    }

    setLoading(true)
    try {
      const sig = generateSignature(username)

      // Upload semua file saat submit dengan nama "lampiran_N_[no_nota]"
      const noNotaSlug = noNota.replace(/\//g, '-') // "001-KDNINV-2025"
      const uploadedFiles: { url: string; public_id: string; name: string }[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const filenameOverride = `lampiran_${i + 1}_${noNotaSlug}.${ext}`
        const formData = new FormData()
        formData.append('file', file)
        formData.append('filename_override', filenameOverride)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data: { error?: string; url?: string; public_id?: string } = await res.json()
        if (!res.ok) throw new Error(data.error ?? `Gagal upload lampiran ${i + 1}`)
        uploadedFiles.push({
          url: data.url ?? '',
          public_id: data.public_id ?? '',
          name: filenameOverride,
        })
      }

      // Simpan rekening ke DB kalau dicentang
      if (saveSumber && form.rekening_sumber && form.bank_sumber && form.nama_sumber) {
        await fetch('/api/rekening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            no_rekening: form.rekening_sumber,
            bank: form.bank_sumber,
            nama: form.nama_sumber,
          }),
        })
      }
      if (savePenerima && form.rekening_penerima && form.bank_penerima && form.nama_penerima) {
        await fetch('/api/rekening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            no_rekening: form.rekening_penerima,
            bank: form.bank_penerima,
            nama: form.nama_penerima,
          }),
        })
      }

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
          files: uploadedFiles,
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
              <Field label="Tanggal" type="date" req value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
              <Field label="Divisi" placeholder="Contoh: Keuangan" value={form.divisi} onChange={e => setForm(p => ({ ...p, divisi: e.target.value }))} />
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

                {/* Pilih dari tersimpan */}
                {rekeningList.length > 0 && (
                  <div>
                    <label className="label-field">Pilih Tersimpan</label>
                    <select className="input-field"
                      onChange={e => { const r = rekeningList.find(x => x.id === Number(e.target.value)); if (r) fillSumber(r) }}
                      defaultValue="">
                      <option value="" disabled>— Pilih rekening —</option>
                      {rekeningList.map(r => (
                        <option key={r.id} value={r.id}>{r.bank} · {r.nama} · {r.no_rekening}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Field label="Rekening Sumber" req numberOnly placeholder="Nomor rekening" value={form.rekening_sumber} onChange={e => setForm(p => ({ ...p, rekening_sumber: e.target.value }))} />
                <Field label="Bank Sumber" req alphaOnly placeholder="Nama bank" value={form.bank_sumber} onChange={e => setForm(p => ({ ...p, bank_sumber: e.target.value }))} />
                <Field label="Nama Sumber" req alphaOnly placeholder="Nama pemilik rekening" value={form.nama_sumber} onChange={e => setForm(p => ({ ...p, nama_sumber: e.target.value }))} />

                {/* Checkbox simpan */}
                {form.rekening_sumber && form.bank_sumber && form.nama_sumber && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={saveSumber} onChange={e => setSaveSumber(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Simpan rekening sumber ini</span>
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-2"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border-soft)' }}>Penerima Dana</h3>

                {/* Pilih dari tersimpan */}
                {rekeningList.length > 0 && (
                  <div>
                    <label className="label-field">Pilih Tersimpan</label>
                    <select className="input-field"
                      onChange={e => { const r = rekeningList.find(x => x.id === Number(e.target.value)); if (r) fillPenerima(r) }}
                      defaultValue="">
                      <option value="" disabled>— Pilih rekening —</option>
                      {rekeningList.map(r => (
                        <option key={r.id} value={r.id}>{r.bank} · {r.nama} · {r.no_rekening}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Field label="Rekening Penerima" req numberOnly placeholder="Nomor rekening" value={form.rekening_penerima} onChange={e => setForm(p => ({ ...p, rekening_penerima: e.target.value }))} />
                <Field label="Bank Penerima" req alphaOnly placeholder="Nama bank" value={form.bank_penerima} onChange={e => setForm(p => ({ ...p, bank_penerima: e.target.value }))} />
                <Field label="Nama Penerima" req alphaOnly placeholder="Nama pemilik rekening" value={form.nama_penerima} onChange={e => setForm(p => ({ ...p, nama_penerima: e.target.value }))} />

                {/* Checkbox simpan */}
                {form.rekening_penerima && form.bank_penerima && form.nama_penerima && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={savePenerima} onChange={e => setSavePenerima(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Simpan rekening penerima ini</span>
                  </label>
                )}
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
                        className="input-field" placeholder="pcs, kg, unit, box, dus..." />
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
              Upload foto/pdf (opsional, maks. {LIMIT_UPLOAD} file)
            </p>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf"
              multiple
              onChange={e => e.target.files && e.target.files.length > 0 && handleFileSelect(e.target.files)}
              className="hidden" />

            {/* File list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedFiles.map((f, idx) => {
                  const isImg = f.previewUrl !== undefined
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: '#fff', border: '1px solid rgba(79,110,247,0.2)' }}>
                          {isImg
                            ? <Image className="w-4 h-4" style={{ color: '#22c55e' }} />
                            : <FileText className="w-4 h-4" style={{ color: '#22c55e' }} />
                          }
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{f.file.name}</p>
                          <p className="text-xs" style={{ color: '#22c55e' }}>
                            {f.file.name}
                          </p>
                        </div>
                        {f.previewUrl && (
                          <a href={f.previewUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-medium shrink-0" style={{ color: ACCENT }}>Lihat →</a>
                        )}
                        <button type="button" onClick={() => removeFile(idx)}
                          className="p-1.5 rounded-lg" style={{ color: '#ef4444', background: '#fef2f2' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Image preview */}
                      {f.previewUrl && (
                        <div className="rounded-xl overflow-hidden mt-1" style={{ border: '1px solid var(--border-soft)', maxHeight: '160px' }}>
                          <Img src={f.previewUrl} alt="Preview" className="w-full object-contain" width={500} height={500} style={{ maxHeight: '160px' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {selectedFiles.length < LIMIT_UPLOAD && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl transition-all"
                style={{ border: '2px dashed var(--border)', color: 'var(--text-3)' }}>
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {selectedFiles.length === 0 ? 'Pilih File / Ambil Foto' : `Tambah File (${selectedFiles.length}/${LIMIT_UPLOAD})`}
                </span>
              </button>
            )}
          </Section>
        </div>

        {/* Submit */}
        <div className="flex gap-3 animate-fadeInUp stagger-5 pb-4">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 px-6 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}>
            Batal
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
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
