'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pengajuan } from '@/types'
import { formatCurrency, formatDateTime, getStatusLabel } from '@/lib/utils'
import { Shield, Filter, RefreshCw, CreditCard, Plus, Pencil, Trash2, X, Check, Loader2, ClipboardList, Users, KeyRound, Eye, EyeOff } from 'lucide-react'
import DetailModal from '@/components/DetailModal'
import { ACCENT } from '@/lib/constants'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Rekening { no_rekening: string; bank: string; nama: string; created_at: string }
interface UserRow  { id: number; username: string; full_name: string | null; role: string; created_at: string }
type MyRole = 'admin' | 'manager' | ''

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', finished: 'badge-finished' }[status] || 'badge-pending'
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>{getStatusLabel(status)}</span>
}

const rolePill = (role: string) => ({
  user:    'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin:   'bg-blue-50   text-blue-600   border-blue-200',
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
}[role] ?? 'bg-gray-50 text-gray-600 border-gray-200')

function Field({ label, type = 'text', req = false, placeholder = '', value, numberOnly = false, alphaOnly = false, onChange }: {
  label: string; type?: string; req?: boolean; placeholder?: string; value: string
  numberOnly?: boolean; alphaOnly?: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (numberOnly) v = v.replace(/[^0-9]/g, '')
    if (alphaOnly)  v = v.replace(/[^a-zA-Z\s]/g, '')
    e.target.value = v
    onChange(e)
  }
  return (
    <div>
      <label className="label-field">{label} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>
      <input type={type} value={value} onChange={handleChange} className="input-field" placeholder={placeholder}
        required={req} inputMode={numberOnly ? 'numeric' : undefined} />
    </div>
  )
}

// ── Modal: Tambah / Edit Rekening ─────────────────────────────────────────────
function RekeningModal({ initial, onClose, onSuccess }: { initial?: Rekening; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!initial
  const [noRek,   setNoRek]   = useState(initial?.no_rekening ?? '')
  const [bank,    setBank]    = useState(initial?.bank ?? '')
  const [nama,    setNama]    = useState(initial?.nama ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noRek.trim()) { toast.error('Nomor rekening wajib diisi'); return }
    if (!bank.trim())  { toast.error('Bank wajib diisi');           return }
    if (!nama.trim())  { toast.error('Nama wajib diisi');           return }
    setLoading(true)
    try {
      const res = await fetch('/api/rekening', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit
          ? { no_rekening: initial!.no_rekening, bank: initial!.bank, new_no_rekening: noRek.trim(), new_bank: bank.trim(), nama: nama.trim() }
          : { no_rekening: noRek.trim(), bank: bank.trim(), nama: nama.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan')
      toast.success(isEdit ? 'Rekening berhasil diubah' : 'Rekening berhasil ditambahkan')
      onSuccess(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>{isEdit ? 'Edit Rekening' : 'Tambah Rekening'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nomor Rekening" req numberOnly placeholder="1234567890" value={noRek} onChange={e => setNoRek(e.target.value)} />
          <Field label="Bank" req alphaOnly placeholder="BCA, BRI, Mandiri..." value={bank} onChange={e => setBank(e.target.value)} />
          <Field label="Nama Pemilik" req alphaOnly placeholder="Nama sesuai rekening" value={nama} onChange={e => setNama(e.target.value)} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Batal</button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
              style={{ background: ACCENT }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Check className="w-4 h-4" />{isEdit ? 'Simpan' : 'Tambah'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Hapus Rekening ─────────────────────────────────────────────────────
function DeleteRekeningModal({ rekening, onClose, onSuccess }: { rekening: Rekening; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rekening', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_rekening: rekening.no_rekening, bank: rekening.bank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus')
      toast.success('Rekening berhasil dihapus')
      onSuccess(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-xs rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Hapus Rekening</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm font-medium" style={{ color: '#991b1b' }}>{rekening.nama}</p>
          <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>{rekening.bank} · {rekening.no_rekening}</p>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>Yakin ingin menghapus rekening ini?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Batal</button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
            style={{ background: '#ef4444' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Menghapus...</> : <><Trash2 className="w-4 h-4" />Hapus</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Reset Password ─────────────────────────────────────────────────────
function ResetPwModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [newPw,   setNewPw]   = useState('')
  const [confPw,  setConfPw]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showCon, setShowCon] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 6) { toast.error('Password minimal 6 karakter'); return }
    if (newPw !== confPw)  { toast.error('Konfirmasi password tidak cocok'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal reset password')
      toast.success(`Password ${user.username} berhasil direset`)
      onSuccess(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Reset Password</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
              Akun: <strong>{user.username}</strong>
              <span className={`inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${rolePill(user.role)}`}>{user.role}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Password Baru</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                className="input-field pr-10" placeholder="Min. 6 karakter" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label-field">Konfirmasi Password Baru</label>
            <div className="relative">
              <input type={showCon ? 'text' : 'password'} value={confPw} onChange={e => setConfPw(e.target.value)}
                className="input-field pr-10" placeholder="Ulangi password baru" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowCon(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Batal</button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
              style={{ background: ACCENT }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Check className="w-4 h-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Hapus User ─────────────────────────────────────────────────────────
function DeleteUserModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm !== user.username) { toast.error('Username tidak cocok'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus')
      toast.success(`User ${user.username} berhasil dihapus`)
      onSuccess(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Hapus User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm" style={{ color: '#991b1b' }}>Tindakan ini <strong>tidak dapat dibatalkan</strong>.</p>
        </div>
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="label-field">KETIK <strong className="lowercase italic">{user.username}</strong> UNTUK KONFIRMASI</label>
            <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="input-field" placeholder={user.username} required autoComplete="off" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Batal</button>
            <button type="submit" disabled={loading || confirm !== user.username}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-40"
              style={{ background: '#ef4444' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Menghapus...</> : <><Trash2 className="w-4 h-4" />Hapus</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Tambah User ────────────────────────────────────────────────────────
function AddUserModal({ myRole, onClose, onSuccess }: { myRole: MyRole; onClose: () => void; onSuccess: () => void }) {
  const targetRole = myRole === 'manager' ? 'admin' : 'user'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confPw,   setConfPw]   = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCon,  setShowCon]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim())    { toast.error('Username wajib diisi'); return }
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return }
    if (password !== confPw) { toast.error('Konfirmasi password tidak cocok'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password, role: targetRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat user')
      toast.success(`User ${data.user?.username ?? username} (${targetRole}) berhasil dibuat`)
      onSuccess(); onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Tambah User Baru</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
              Role: <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-semibold ${rolePill(targetRole)}`}>{targetRole}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              className="input-field" placeholder="huruf kecil, tanpa spasi" required autoComplete="off" />
          </div>
          <div>
            <label className="label-field">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="input-field pr-10" placeholder="Min. 6 karakter" required minLength={6} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label-field">Konfirmasi Password</label>
            <div className="relative">
              <input type={showCon ? 'text' : 'password'} value={confPw} onChange={e => setConfPw(e.target.value)}
                className="input-field pr-10" placeholder="Ulangi password" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowCon(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Batal</button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
              style={{ background: ACCENT }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Membuat...</> : <><Check className="w-4 h-4" />Buat User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tab: Pengajuan ────────────────────────────────────────────────────────────
function TabPengajuan({ onSelect, refreshKey }: { onSelect: (p: Pengajuan) => void; refreshKey: number }) {
  const [pengajuan, setPengajuan] = useState<Pengajuan[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')
  const [searchQuery,    setSearchQuery]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterDateFrom) params.set('from', filterDateFrom)
    if (filterDateTo)   params.set('to', filterDateTo)
    const res = await fetch('/api/pengajuan?' + params.toString())
    if (res.ok) setPengajuan(await res.json())
    setLoading(false)
  }, [filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => { load() }, [load, refreshKey])

  const filtered = pengajuan.filter(p =>
    !searchQuery ||
    p.no_nota.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.items || []).some(i => i.nama_barang.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.submitted_by_username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusOptions = [
    { value: 'all',      label: 'Semua Status' },
    { value: 'pending',  label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'finished', label: 'Selesai' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-4)' }}>Pencarian</p>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field" placeholder="Nota, barang, pengaju..." />
          </div>
          <div>
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-4)' }}>Status</p>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-4)' }}>Dari Tanggal</p>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-4)' }}>Sampai Tanggal</p>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field" />
          </div>
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: ACCENT }} />
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
                    {['No. Nota', 'Pengaju', 'Barang', 'Total', 'Status', 'Tanggal'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="cursor-pointer transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
                      onClick={() => onSelect(p)}>
                      <td className="px-4 py-3.5"><span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span></td>
                      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: 'var(--text-2)' }}>{p.submitted_by_username}</td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-3)' }}>
                        {p.items?.[0]?.nama_barang || '-'}{p.items?.length > 1 && ` +${p.items.length - 1}`}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-xs" style={{ color: 'var(--text-1)' }}>{formatCurrency(Number(p.grand_total))}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>{formatDateTime(p.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {filtered.map(p => (
                <div key={p.id} className="p-4 cursor-pointer" onClick={() => onSelect(p)}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{p.no_nota}</span>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>oleh {p.submitted_by_username}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{formatCurrency(Number(p.grand_total))}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: Rekening ─────────────────────────────────────────────────────────────
function TabRekening({ onAdd, onEdit, onDelete, refreshKey }: {
  onAdd: () => void; onEdit: (r: Rekening) => void; onDelete: (r: Rekening) => void; refreshKey: number
}) {
  const [rekening, setRekening] = useState<Rekening[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/rekening')
    if (res.ok) setRekening(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{rekening.length} rekening terdaftar</p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold !text-white" style={{ background: ACCENT }}>
            <Plus className="w-4 h-4" />Tambah
          </button>
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: ACCENT }} />
          </div>
        ) : rekening.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
            <p className="font-medium" style={{ color: 'var(--text-3)' }}>Belum ada rekening</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    {['Bank', 'No. Rekening', 'Nama Pemilik', 'Ditambahkan', '', ''].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rekening.map((r, i) => (
                    <tr key={`${r.no_rekening}-${r.bank}`} style={{ borderBottom: i < rekening.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--accent-soft)', color: ACCENT }}>{r.bank}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{r.no_rekening}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-2)' }}>{r.nama}</td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>{fmtDate(r.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => onEdit(r)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => onDelete(r)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {rekening.map(r => (
                <div key={`${r.no_rekening}-${r.bank}`} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'var(--accent-soft)', color: ACCENT }}>{r.bank}</span>
                      <p className="font-mono text-sm font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{r.no_rekening}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{r.nama}</p>
                    </div>
                    <div className="flex gap-2 ml-3 shrink-0">
                      <button onClick={() => onEdit(r)} className="p-2 rounded-lg"
                        style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(r)} className="p-2 rounded-lg"
                        style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: User ─────────────────────────────────────────────────────────────────
function TabUser({ myRole, onResetPw, onDelete, onAdd, refreshKey }: {
  myRole: MyRole; onResetPw: (u: UserRow) => void; onDelete: (u: UserRow) => void; onAdd: () => void; refreshKey: number
}) {
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const canResetPw = (u: UserRow) => {
    if (myRole === 'manager') return ['admin', 'user'].includes(u.role)
    if (myRole === 'admin')   return u.role === 'user'
    return false
  }
  const canDelete = (u: UserRow) => {
    if (myRole === 'manager') return ['admin', 'user'].includes(u.role)
    if (myRole === 'admin')   return u.role === 'user'
    return false
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          {myRole === 'admin'   && <>Manage <strong>User</strong></>}
          {myRole === 'manager' && <>Manage <strong>Admin &amp; User</strong></>}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold !text-white" style={{ background: ACCENT }}>
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: ACCENT }} />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
            <p className="font-medium" style={{ color: 'var(--text-3)' }}>Belum ada user lain</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    {['Username', 'Nama Lengkap', 'Role', 'Dibuat Pada', 'Reset Password', 'Hapus'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-1)' }}>{u.username}</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-2)' }}>
                        {u.full_name || <span style={{ color: 'var(--text-4)', fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${rolePill(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>{fmtDate(u.created_at)}</td>
                      <td className="px-5 py-3.5">
                        {canResetPw(u) ? (
                          <button onClick={() => onResetPw(u)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                            <KeyRound className="w-3.5 h-3.5" /> Reset
                          </button>
                        ) : <span className="text-xs" style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {canDelete(u) ? (
                          <button onClick={() => onDelete(u)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        ) : <span className="text-xs" style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {users.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{u.username}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${rolePill(u.role)}`}>{u.role}</span>
                      </div>
                      {u.full_name && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{u.full_name}</p>}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{fmtDate(u.created_at)}</p>
                    </div>
                    <div className="flex gap-2 ml-3 shrink-0">
                      {canResetPw(u) && (
                        <button onClick={() => onResetPw(u)} className="p-2 rounded-lg"
                          style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete(u) && (
                        <button onClick={() => onDelete(u)} className="p-2 rounded-lg"
                          style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab,      setTab]      = useState<'pengajuan' | 'rekening' | 'user'>('pengajuan')
  const [userRole, setUserRole] = useState('')
  const [myRole,   setMyRole]   = useState<MyRole>('')

  const [selectedPengajuan,  setSelectedPengajuan]  = useState<Pengajuan | null>(null)
  const [pRefresh,           setPRefresh]           = useState(0)
  const [showAddRek,         setShowAddRek]         = useState(false)
  const [editRek,            setEditRek]            = useState<Rekening | null>(null)
  const [deleteRek,          setDeleteRek]          = useState<Rekening | null>(null)
  const [rekRefresh,         setRekRefresh]         = useState(0)
  const [resetPwTarget,      setResetPwTarget]      = useState<UserRow | null>(null)
  const [deleteUserTarget,   setDeleteUserTarget]   = useState<UserRow | null>(null)
  const [showAddUser,        setShowAddUser]        = useState(false)
  const [userRefresh,        setUserRefresh]        = useState(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { setUserRole(d.role); setMyRole(d.role as MyRole) })
      .catch(() => {})
  }, [])

  const tabs = [
    { key: 'pengajuan', label: 'Pengajuan', icon: ClipboardList },
    { key: 'rekening',  label: 'Rekening',  icon: CreditCard },
    { key: 'user',      label: 'User',      icon: Users },
  ] as const

  return (
    <div className="space-y-5">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold flex items-center gap-2.5"
          style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
          <Shield className="w-6 h-6" style={{ color: ACCENT }} />
          Admin Panel
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          Kelola pengajuan, rekening, dan user
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl animate-fadeInUp stagger-1"
        style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? ACCENT : 'var(--text-3)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              <Icon className="w-4 h-4" />
              <span className={active ? '' : 'hidden sm:inline'}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-fadeInUp stagger-2">
        {tab === 'pengajuan' && <TabPengajuan onSelect={p => setSelectedPengajuan(p)} refreshKey={pRefresh} />}
        {tab === 'rekening'  && <TabRekening onAdd={() => setShowAddRek(true)} onEdit={r => setEditRek(r)} onDelete={r => setDeleteRek(r)} refreshKey={rekRefresh} />}
        {tab === 'user'      && <TabUser myRole={myRole} onResetPw={u => setResetPwTarget(u)} onDelete={u => setDeleteUserTarget(u)} onAdd={() => setShowAddUser(true)} refreshKey={userRefresh} />}
      </div>

      {/* Semua modal di root level agar backdrop-blur tidak terpotong */}
      {selectedPengajuan && (
        <DetailModal pengajuan={selectedPengajuan} onClose={() => setSelectedPengajuan(null)}
          showActions={true} userRole={userRole} onUpdate={() => { setSelectedPengajuan(null); setPRefresh(v => v + 1) }} />
      )}
      {showAddRek       && <RekeningModal onClose={() => setShowAddRek(false)} onSuccess={() => setRekRefresh(v => v + 1)} />}
      {editRek          && <RekeningModal initial={editRek} onClose={() => setEditRek(null)} onSuccess={() => setRekRefresh(v => v + 1)} />}
      {deleteRek        && <DeleteRekeningModal rekening={deleteRek} onClose={() => setDeleteRek(null)} onSuccess={() => setRekRefresh(v => v + 1)} />}
      {resetPwTarget    && <ResetPwModal    user={resetPwTarget}    onClose={() => setResetPwTarget(null)}    onSuccess={() => setUserRefresh(v => v + 1)} />}
      {deleteUserTarget && <DeleteUserModal user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onSuccess={() => setUserRefresh(v => v + 1)} />}
      {showAddUser      && <AddUserModal    myRole={myRole}         onClose={() => setShowAddUser(false)}     onSuccess={() => setUserRefresh(v => v + 1)} />}
    </div>
  )
}
