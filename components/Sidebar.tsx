'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'
import {
  FileText, LayoutDashboard, ClipboardList, History,
  Shield, LogOut, Menu, X, ChevronRight,
  KeyRound, Eye, EyeOff, Users,
} from 'lucide-react'

interface SidebarProps { profile: Profile }

const ACCENT = '#4f6ef7'

const ROLE_PILL: Record<string, string> = {
  user: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin: 'bg-blue-50 text-blue-600 border-blue-200',
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard, roles: ['user', 'admin', 'manager'] },
  { href: '/pengajuan', label: 'Form Pengajuan',   icon: ClipboardList,   roles: ['user', 'admin'] },
  { href: '/history',   label: 'History',          icon: History,         roles: ['user'] },
  { href: '/admin',     label: 'Admin Panel',      icon: Shield,          roles: ['admin', 'manager'] },
  { href: '/users',     label: 'User Management',  icon: Users,           roles: ['admin', 'manager'] },
]

// ─── Password input helper ────────────────────────────────────────────────────
function PwInput({
  label, value, onChange, show, toggle,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  toggle: () => void
}) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field pr-10"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-4)' }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [oldPassword,     setOldPassword]     = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld,  setShowOld]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const resetPwForm = () => {
    setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    setShowOld(false); setShowNew(false); setShowConf(false)
  }
  const openPwModal  = () => { resetPwForm(); setShowPwModal(true);  setMobileOpen(false) }
  const closePwModal = () => { resetPwForm(); setShowPwModal(false) }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return }
    if (newPassword.length < 6)          { toast.error('Password minimal 6 karakter');     return }
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data: { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal')
      toast.success('Password berhasil diubah')
      closePwModal()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah password')
    } finally {
      setPwLoading(false)
    }
  }

  const visibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(profile.role))

  // ─── Sidebar content (shared between desktop + mobile) ──────────────────
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.2)' }}>
            <FileText className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-1)', fontFamily: "'Poppins',sans-serif" }}>
              KDN<span style={{ color: ACCENT }}>INV</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>Pengajuan Nota</p>
          </div>
        </div>

        {/* Profile pill */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{profile.username}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${ROLE_PILL[profile.role] ?? ''}`}>
            {profile.role}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {visibleNavItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: active ? ACCENT : 'var(--text-2)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <button onClick={openPwModal}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'var(--text-3)' }}>
            <KeyRound className="w-4 h-4" />
            Ganti Password
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#ef4444' }}>
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: '56px' }}>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: ACCENT }} />
          <span className="font-bold text-sm" style={{ fontFamily: "'Poppins',sans-serif", color: 'var(--text-1)' }}>
            KDN<span style={{ color: ACCENT }}>INV</span>
          </span>
        </div>
        <button onClick={() => setMobileOpen(v => !v)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-2)' }}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="absolute top-14 left-0 right-0 bottom-0 overflow-y-auto"
            style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 flex-col shrink-0 h-screen sticky top-0"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </div>

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closePwModal}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Ganti Password</h2>
              <button onClick={closePwModal} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PwInput label="Password Lama"              value={oldPassword}     onChange={setOldPassword}     show={showOld}  toggle={() => setShowOld(v => !v)} />
              <PwInput label="Password Baru"              value={newPassword}     onChange={setNewPassword}     show={showNew}  toggle={() => setShowNew(v => !v)} />
              <PwInput label="Konfirmasi Password Baru"   value={confirmPassword} onChange={setConfirmPassword} show={showConf} toggle={() => setShowConf(v => !v)} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closePwModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Batal
                </button>
                <button type="submit" disabled={pwLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: ACCENT }}>
                  {pwLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
