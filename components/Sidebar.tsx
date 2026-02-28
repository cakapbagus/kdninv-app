'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'
import { ACCENT } from '@/lib/constants'
import {
  FileText, LayoutDashboard, ClipboardList, History,
  Shield, LogOut, Menu, X, ChevronRight,
  KeyRound, Eye, EyeOff, Users, Settings,
  Bell, BellOff,
} from 'lucide-react'
import { usePushNotification } from '@/hooks/usePushNotification'

interface SidebarProps { profile: Profile }

const ROLE_PILL: Record<string, string> = {
  user:    'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin:   'bg-blue-50   text-blue-600   border-blue-200',
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard, roles: ['user', 'admin', 'manager'] },
  { href: '/pengajuan', label: 'Form Pengajuan',  icon: ClipboardList,   roles: ['user', 'admin'] },
  { href: '/history',   label: 'History',         icon: History,         roles: ['user', 'admin'] },
  { href: '/admin',     label: 'Admin Panel',     icon: Shield,          roles: ['admin', 'manager'] },
  { href: '/users',     label: 'User Management', icon: Users,           roles: ['admin', 'manager'] },
]

function PwInput({ label, value, onChange, show, toggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void
}) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          className="input-field pr-10" placeholder="••••••••" required />
        <button type="button" onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Push notification ────────────────────────────────────────────────────
  const { supported, subscribed, permission, loading: notifLoading, subscribe, unsubscribe } = usePushNotification()

  // ── Change Password modal state ──────────────────────────────────────────
  const [showPwModal,     setShowPwModal]     = useState(false)
  const [oldPassword,     setOldPassword]     = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld,  setShowOld]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // ── Edit Full Name modal state ───────────────────────────────────────────
  const [showNameModal,  setShowNameModal]  = useState(false)
  const [newFullName,    setNewFullName]    = useState(profile.full_name ?? '')
  const [nameLoading,    setNameLoading]    = useState(false)
  const [localFullName,  setLocalFullName]  = useState(profile.full_name ?? '')
  const [pendingNotif,   setPendingNotif]   = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const resetPwForm = () => {
    setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    setShowOld(false); setShowNew(false); setShowConf(false)
  }
  const openPwModal  = () => { resetPwForm(); setShowPwModal(true); setMobileOpen(false) }
  const closePwModal = () => { resetPwForm(); setShowPwModal(false) }

  const openNameModal  = () => {
    setNewFullName(localFullName)
    setPendingNotif(subscribed)
    setShowNameModal(true); setMobileOpen(false)
  }
  const closeNameModal = () => setShowNameModal(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const handleChangePassword = async (e: React.FormEvent) => {
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
    } finally { setPwLoading(false) }
  }

  const handleUpdateFullName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newFullName.trim() }),
      })
      const data: { error?: string; full_name?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal')
      setLocalFullName(data.full_name ?? newFullName.trim())
      // Terapkan perubahan notifikasi
      if (pendingNotif !== subscribed) {
        if (pendingNotif) await subscribe()
        else await unsubscribe()
      }
      toast.success('Pengaturan berhasil disimpan')
      closeNameModal()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally { setNameLoading(false) }
  }

  const visibleNavItems = NAV_ITEMS.filter(i => i.roles.includes(profile.role))

  // Bell icon — terang jika aktif, slate jika tidak
  const bellColor = subscribed ? ACCENT : '#94a3b8' // slate-400

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
        <button onClick={openNameModal} className="relative text-left mx-3 mt-3 px-4 py-3 rounded-xl transition-all"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(79,110,247,0.1)' }}
          onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(79,110,247,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(79,110,247,0.1)')}>
          {localFullName && (
            <p className="text-sm font-semibold leading-tight truncate pr-10" style={{ color: 'var(--text-1)' }}>
              {localFullName}
            </p>
          )}
          <p className="text-xs mt-0.5 truncate pr-10" style={{ color: 'var(--text-3)' }}>{profile.username}</p>
          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded border font-semibold ${ROLE_PILL[profile.role] ?? ''}`}>
            {profile.role}
          </span>

          {/* Bell icon pojok kiri bawah */}
          {supported && (
          <div className="absolute bottom-2 right-8 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-soft)',
              }}>
              {subscribed
                ? <Bell className="w-3 h-3" style={{ color: bellColor }} />
                : <BellOff className="w-3 h-3" style={{ color: bellColor }} />
              }
            </div>
          )}

          {/* Settings icon kanan bawah */}
          <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
            <Settings className="w-3 h-3" style={{ color: '#8B4513' }} />
          </div>
        </button>

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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: 'var(--text-3)' }}>
            <KeyRound className="w-4 h-4" />
            Ganti Password
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
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
        <div className="lg:hidden fixed inset-0 z-20">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="absolute top-14 left-0 right-0 bottom-0 overflow-y-auto"
            style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-68 flex-col shrink-0 h-screen sticky top-0"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </div>

      {/* ── Modal: Edit Nama Lengkap ─────────────────────────────────────────── */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(30,50,80,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Pengaturan Akun</h2>
              <button onClick={closeNameModal} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateFullName} className="space-y-4">
              <div>
                <label htmlFor="fn-name" className="label-field">
                  Nama Lengkap
                  <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-4)' }}>(kosongkan untuk menghapus)</span>
                </label>
                <input id="fn-name" type="text" value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="input-field" placeholder="Ketik nama atau kosongkan" autoComplete="name" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                  Nama ini akan tampil di sidebar dan tanda tangan dokumen.
                </p>
              </div>

              {/* Notifikasi toggle */}
              {supported && (
                <div>
                  <label className="label-field">Push Notifikasi</label>
                  <button
                    type="button"
                    disabled={permission === 'denied'}
                    onClick={() => setPendingNotif(v => !v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{
                      background: pendingNotif ? 'var(--accent-soft)' : 'var(--surface-soft)',
                      border: `1px solid ${pendingNotif ? 'rgba(79,110,247,0.25)' : 'var(--border-soft)'}`,
                      color: pendingNotif ? ACCENT : '#64748b',
                    }}
                  >
                    {notifLoading
                      ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                      : pendingNotif
                        ? <Bell className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                        : <BellOff className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
                    }
                    <span className="flex-1 text-left">
                      {notifLoading
                        ? 'Memproses...'
                        : permission === 'denied'
                          ? 'Notifikasi diblokir browser'
                          : pendingNotif
                            ? 'Notifikasi aktif'
                            : 'Notifikasi tidak aktif'}
                    </span>
                    {/* Toggle pill */}
                    {permission !== 'denied' && !notifLoading && (
                      <div className="w-9 h-5 rounded-full relative transition-colors shrink-0"
                        style={{ background: pendingNotif ? ACCENT : '#cbd5e1' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                          style={{ left: pendingNotif ? '18px' : '2px' }} />
                      </div>
                    )}
                  </button>
                  {permission === 'denied' && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                      Izin notifikasi diblokir. Aktifkan di pengaturan browser.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeNameModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Batal
                </button>
                <button type="submit" disabled={nameLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
                  style={{ background: ACCENT }}>
                  {nameLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
                    : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Ganti Password ───────────────────────────────────────────── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <PwInput label="Password Lama"            value={oldPassword}     onChange={setOldPassword}     show={showOld}  toggle={() => setShowOld(v => !v)} />
              <PwInput label="Password Baru"            value={newPassword}     onChange={setNewPassword}     show={showNew}  toggle={() => setShowNew(v => !v)} />
              <PwInput label="Konfirmasi Password Baru" value={confirmPassword} onChange={setConfirmPassword} show={showConf} toggle={() => setShowConf(v => !v)} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closePwModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Batal
                </button>
                <button type="submit" disabled={pwLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold !text-white disabled:opacity-60"
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
