'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, KeyRound, Trash2, X, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ACCENT } from '@/lib/constants'

interface UserRow { id: number; username: string; full_name: string | null; role: string; created_at: string }
type MyRole = 'admin' | 'manager' | ''

const rolePill = (role: string) => ({
  user:    'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin:   'bg-blue-50   text-blue-600   border-blue-200',
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
}[role] ?? 'bg-gray-50 text-gray-600 border-gray-200')

// ── Modal: Reset Password ─────────────────────────────────────────────────────
function ResetPwModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [newPw,   setNewPw]   = useState('')
  const [confPw,  setConfPw]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showCon, setShowCon] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 6)  { toast.error('Password minimal 6 karakter'); return }
    if (newPw !== confPw)  { toast.error('Konfirmasi password tidak cocok'); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/users/${user.id}`, {
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
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
        onClick={e => e.stopPropagation()}>
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
            <label htmlFor="rp-new" className="label-field">Password Baru</label>
            <div className="relative">
              <input id="rp-new" type={showNew ? 'text' : 'password'} value={newPw}
                onChange={e => setNewPw(e.target.value)} className="input-field pr-10"
                placeholder="Min. 6 karakter" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="rp-conf" className="label-field">Konfirmasi Password Baru</label>
            <div className="relative">
              <input id="rp-conf" type={showCon ? 'text' : 'password'} value={confPw}
                onChange={e => setConfPw(e.target.value)} className="input-field pr-10"
                placeholder="Ulangi password baru" required autoComplete="new-password" />
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

// ── Modal: Delete (ketik ulang username untuk konfirmasi) ─────────────────────
function DeleteModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm !== user.username) { toast.error('Username tidak cocok'); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
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
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Hapus User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm" style={{ color: '#991b1b' }}>
            Tindakan ini <strong>tidak dapat dibatalkan</strong>.
          </p>
        </div>
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label htmlFor="del-confirm" className="label-field">
              KETIK <strong className="lowercase italic">{user.username}</strong> UNTUK KONFIRMASI
            </label>
            <input id="del-confirm" type="text" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input-field" placeholder={user.username}
              required autoComplete="off" />
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
    if (!username.trim()) { toast.error('Username wajib diisi'); return }
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return }
    if (password !== confPw) { toast.error('Konfirmasi password tidak cocok'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/users', {
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
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
        onClick={e => e.stopPropagation()}>
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
            <label htmlFor="add-uname" className="label-field">Username</label>
            <input id="add-uname" type="text" value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              className="input-field" placeholder="huruf kecil, tanpa spasi" required autoComplete="off" />
          </div>
          <div>
            <label htmlFor="add-pw" className="label-field">Password</label>
            <div className="relative">
              <input id="add-pw" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field pr-10" placeholder="Min. 6 karakter" required minLength={6} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="add-conf" className="label-field">Konfirmasi Password</label>
            <div className="relative">
              <input id="add-conf" type={showCon ? 'text' : 'password'} value={confPw}
                onChange={e => setConfPw(e.target.value)}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [myRole,       setMyRole]       = useState<MyRole>('')
  const [loading,      setLoading]      = useState(true)
  const [resetTarget,  setResetTarget]  = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [showAdd,      setShowAdd]      = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, usersRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/users')])
      if (meRes.ok)    { const me = await meRes.json(); setMyRole(me.role) }
      if (usersRes.ok) setUsers(await usersRes.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

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

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
            <Users className="w-6 h-6" style={{ color: ACCENT }} />
            User Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {myRole === 'admin'   && 'Lihat semua role · Buat/Hapus/Reset User'}
            {myRole === 'manager' && 'Lihat semua role · Buat/Hapus/Reset Admin & User'}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold !text-white"
          style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" />
          {myRole === 'manager' ? 'Tambah Admin' : 'Tambah User'}
        </button>
      </div>

      <div className="glass rounded-xl px-4 py-3 animate-fadeInUp stagger-1"
        style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {myRole === 'admin' && <>Anda dapat <strong>membaca</strong> semua role, <strong>membuat</strong> role User, <strong>menghapus</strong> role User, dan <strong>mereset password</strong> role User.</>}
          {myRole === 'manager' && <>Anda dapat <strong>membaca</strong> semua role, <strong>membuat</strong> role Admin, <strong>menghapus</strong> role Admin &amp; User, dan <strong>mereset password</strong> role Admin &amp; User.</>}
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden animate-fadeInUp stagger-2">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                  {['Username', 'Nama Lengkap', 'Role', 'Dibuat Pada', 'Reset Password', 'Hapus'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-3)' }}>{h}</th>
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
                        <button onClick={() => setResetTarget(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ color: ACCENT, background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
                          <KeyRound className="w-3.5 h-3.5" /> Reset
                        </button>
                      ) : <span className="text-xs" style={{ color: 'var(--text-4)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {canDelete(u) ? (
                        <button onClick={() => setDeleteTarget(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
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
        )}
      </div>

      {resetTarget  && <ResetPwModal  user={resetTarget}  onClose={() => setResetTarget(null)}  onSuccess={load} />}
      {deleteTarget && <DeleteModal   user={deleteTarget} onClose={() => setDeleteTarget(null)} onSuccess={load} />}
      {showAdd      && <AddUserModal  myRole={myRole}     onClose={() => setShowAdd(false)}     onSuccess={load} />}
    </div>
  )
}