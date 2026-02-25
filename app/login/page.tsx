'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, FileText } from 'lucide-react'

const ACCENT = '#4f6ef7'

export default function LoginPage() {
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      const data: { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Login gagal')

      toast.success('Login berhasil!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #eef2f7 0%, #e8edf6 50%, #eef0fb 100%)' }}>

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4f6ef7 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f6ef7 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'white', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(79,110,247,0.15)' }}>
            <FileText className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-4xl font-bold mb-1"
            style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
            KDN<span style={{ color: ACCENT }}>INV</span>
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-4)' }}>
            Sistem Pengajuan Nota
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-7 animate-fadeInUp stagger-1">
          <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--text-1)' }}>Masuk ke Sistem</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Masukkan username dan password Anda</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-field">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="Masukkan username"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label-field">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-4)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
              style={{ background: ACCENT, fontFamily: "'Poppins',sans-serif" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
              Hubungi administrator jika mengalami masalah login
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 rounded-xl p-4 animate-fadeInUp stagger-2"
          style={{ background: 'white', border: '1px solid var(--border-soft)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-4)' }}>
            Demo Akun
          </p>
          <div className="space-y-2">
            {[
              { role: 'User',    user: 'userdemo',    pass: 'demo123' },
              { role: 'Admin',   user: 'admindemo',   pass: 'demo123' },
              { role: 'Manager', user: 'managerdemo', pass: 'demo123' },
            ].map(a => (
              <div key={a.role} className="flex items-center justify-between text-xs">
                <span className="w-16 font-medium" style={{ color: 'var(--text-3)' }}>{a.role}</span>
                <span className="font-mono" style={{ color: 'var(--text-2)' }}>{a.user}</span>
                <span className="font-mono" style={{ color: 'var(--text-4)' }}>/ {a.pass}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
