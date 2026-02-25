'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/types'
import { Users, Plus, Eye, EyeOff, X, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ACCENT = '#4f6ef7'

const ALLOWED_ROLES: Record<string, { value: string; label: string }[]> = {
  manager: [{ value: 'admin', label: 'Admin' }],
  admin: [{ value: 'user', label: 'User' }],
}

const rolePill = (role: string) => ({
  user: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin: 'bg-blue-50 text-blue-600 border-blue-200',
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
}[role] || 'bg-gray-50 text-gray-600 border-gray-200')

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [meRes, usersRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/users'),
    ])
    if (meRes.ok) {
      const me = await meRes.json()
      setCurrentUserRole(me.role)
      const allowed = ALLOWED_ROLES[me.role] || []
      if (allowed.length > 0) setNewRole(allowed[0].value)
    }
    if (usersRes.ok) setUsers(await usersRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) { toast.error('Username wajib diisi'); return }
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }

    setAddLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat user')

      toast.success(`User ${newUsername} berhasil dibuat`)
      setNewPasswords(p => ({ ...p, [newUsername.trim()]: newPassword }))

      setNewUsername('')
      setNewPassword('')
      const allowed = ALLOWED_ROLES[currentUserRole] || []
      setNewRole(allowed.length > 0 ? allowed[0].value : '')
      setShowAddForm(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAddLoading(false)
    }
  }

  const roleOptions = ALLOWED_ROLES[currentUserRole] || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
            <Users className="w-6 h-6" style={{ color: ACCENT }} />
            User Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Kelola seluruh akun pengguna sistem</p>
        </div>
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Info */}
      <div className="glass rounded-xl px-4 py-3 animate-fadeInUp stagger-1"
        style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.15)' }}>
        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          <span className="font-semibold">Catatan:</span> Password hanya tampil sesaat setelah user baru dibuat. Login menggunakan username (tanpa email).
          {currentUserRole === 'manager' && <> Manager hanya dapat membuat akun <span className="font-semibold">Admin</span>.</>}
          {currentUserRole === 'admin' && <> Admin hanya dapat membuat akun <span className="font-semibold">User</span>.</>}
        </span>
      </div>

      {/* Table */}
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
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
                    {['Username', 'Role', 'Password', 'Bergabung'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-1)' }}>{u.username}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${rolePill(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm" style={{ color: 'var(--text-2)', letterSpacing: newPasswords[u.username] && showPasswords[u.id] ? 'normal' : '0.1em' }}>
                            {newPasswords[u.username]
                              ? (showPasswords[u.id] ? newPasswords[u.username] : '••••••••')
                              : <span style={{ color: 'var(--text-4)', fontFamily: 'sans-serif', letterSpacing: 'normal', fontSize: '0.75rem' }}>tidak tersedia</span>
                            }
                          </span>
                          {newPasswords[u.username] && (
                            <button onClick={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}
                              className="p-1 rounded" style={{ color: 'var(--text-4)' }}>
                              {showPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-4)' }}>
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {users.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{u.username}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${rolePill(u.role)}`}>{u.role}</span>
                  </div>
                  {newPasswords[u.username] && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                        {showPasswords[u.id] ? newPasswords[u.username] : '••••••••'}
                      </span>
                      <button onClick={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))} style={{ color: 'var(--text-4)' }}>
                        {showPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Tambah User Baru</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="label-field">Username</label>
                <input type="text" value={newUsername}
                  onChange={e => setNewUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                  className="input-field" placeholder="Contoh: johndoe" required />
              </div>
              <div>
                <label className="label-field">Password</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input-field pr-10" placeholder="Min. 6 karakter" required minLength={6} />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-field">Role</label>
                {roleOptions.length === 1 ? (
                  <div className="input-field flex items-center gap-2" style={{ cursor: 'default', background: 'var(--surface-soft)' }}>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${rolePill(roleOptions[0].value)}`}>
                      {roleOptions[0].label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-4)' }}>(satu-satunya pilihan)</span>
                  </div>
                ) : (
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="input-field">
                    {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Batal
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: ACCENT }}>
                  {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Membuat...</> : <><Check className="w-4 h-4" />Buat User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
