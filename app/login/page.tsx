'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, FileText, Loader2, KeyRound } from 'lucide-react'
import { ACCENT } from '@/lib/constants'
import InstallPWA from '@/components/InstallPWA'
import { startAuthentication } from '@simplewebauthn/browser'
import Script from 'next/script'

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''
const LS_USERNAME_KEY    = 'kdninv_last_username'
const LS_REMEMBER_KEY    = 'kdninv_remember_me'
const LS_PASSKEY_KEY     = 'kdninv_credential_ids'

export default function LoginPage() {
  const [username,         setUsername]         = useState('')
  const [password,         setPassword]         = useState('')
  const [showPassword,     setShowPassword]     = useState(false)
  const [rememberMe,       setRememberMe]       = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [passkeyLoading,   setPasskeyLoading]   = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [hasPasskey,       setHasPasskey]       = useState(false)
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const router = useRouter()

  // ── Restore last username + remember me preference ─────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_USERNAME_KEY)
      if (saved) setUsername(saved)
      const rem = localStorage.getItem(LS_REMEMBER_KEY)
      if (rem === 'true') setRememberMe(true)
      const creds = localStorage.getItem(LS_PASSKEY_KEY)
      const ids: string[] = creds ? JSON.parse(creds) : []
      setHasPasskey(ids.length > 0)
    } catch { /* private mode */ }

    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setPasskeySupported(ok))
        .catch(() => {})
    }
  }, [])

  // ── Push subscribe ──────────────────────────────────────────────────────
  const autoSubscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
      if (Notification.permission === 'denied') return
      const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
      if (!VAPID) return
      let permission: string = Notification.permission
      if (permission === 'default') {
        const t = new Promise<string>(r => setTimeout(() => r('default'), 4500))
        permission = await Promise.race([Notification.requestPermission(), t])
      }
      if (permission !== 'granted') return
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const old = await reg.pushManager.getSubscription()
      if (old) await old.unsubscribe()
      const padding = '='.repeat((4 - (VAPID.length % 4)) % 4)
      const b64 = (VAPID + padding).replace(/-/g, '+').replace(/_/g, '/')
      const raw = window.atob(b64)
      const key = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i)
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      const j = sub.toJSON()
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }),
      })
    } catch { /* silent */ }
  }

  const afterLogin = (uname: string, credentialIds: string[] = []) => {
    try {
      localStorage.setItem(LS_USERNAME_KEY, uname)
      localStorage.setItem(LS_REMEMBER_KEY, rememberMe ? 'true' : 'false')
      if (credentialIds.length > 0) {
        localStorage.setItem(LS_PASSKEY_KEY, JSON.stringify(credentialIds))
        setHasPasskey(true)
      }
    } catch { /* ignore */ }
    autoSubscribe()
    toast.success('Login berhasil!')
    router.push('/dashboard')
    router.refresh()
  }

  const executeRecaptcha = (action: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!recaptchaReady || !window.grecaptcha || !RECAPTCHA_SITE_KEY) {
        resolve('')
        return
      }
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
          .then(resolve)
          .catch(() => resolve(''))  // resolve kosong jika error, jangan block login
      })
    })
  }

  // ── Login biasa ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Execute reCAPTCHA di background — tidak ada prompt ke user
      const recaptchaToken = await executeRecaptcha('login')

      // Check recaptcha (debug)
      // console.log('recaptchaReady:', recaptchaReady)  // ← tambah ini
      // console.log('recaptchaToken:', recaptchaToken ? recaptchaToken.slice(0, 30) + '...' : 'EMPTY')  // ← dan ini

      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username:       username.trim().toLowerCase(),
          password,
          rememberMe,
          recaptchaToken,
        }),
      })
      const data: { error?: string; credentialIds?: string[] } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Login gagal')
      afterLogin(username.trim().toLowerCase(), data.credentialIds ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login gagal')
    } finally { setLoading(false) }
  }

  // ── Login passkey ────────────────────────────────────────
  const handlePasskeyLogin = async () => {
    const uname = username.trim().toLowerCase()
    if (!uname) { toast.error('Masukkan username terlebih dahulu'); return }
    setPasskeyLoading(true)
    try {
      const startRes = await fetch('/api/webauthn/login?step=start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: uname }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) {
        if (startData.error === 'no_credential') {
          toast.error('Belum ada passkey terdaftar. Login dengan password dulu, lalu daftarkan passkey di sidebar.')
          return
        }
        throw new Error(startData.error ?? 'Gagal memulai autentikasi')
      }
      const { userId, ...options } = startData
      const credential = await startAuthentication({ optionsJSON: options })
      const finishRes = await fetch('/api/webauthn/login?step=finish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, response: credential, rememberMe: true }),
      })
      setRememberMe(true) // otomatis diaktifkan karena autentikasi passkey
      const finishData: { error?: string; username?: string; credentialIds?: string[] } = await finishRes.json()
      if (!finishRes.ok) throw new Error(finishData.error ?? 'Autentikasi gagal')
      afterLogin(uname, finishData.credentialIds ?? [])
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') toast.error('Dibatalkan atau timeout')
        else toast.error(err.message)
      }
    } finally { setPasskeyLoading(false) }
  }

  const showPasskeyBtn = passkeySupported && hasPasskey
  const busy           = loading || passkeyLoading

  return (
    <>
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
          onLoad={() => setRecaptchaReady(true)}
        />
      )}

      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #eef2f7 0%, #e8edf6 50%, #eef0fb 100%)' }}>
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
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="label-field">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="input-field" placeholder="Masukkan username"
                  required disabled={busy} autoComplete="username" />
              </div>

              {/* Password */}
              <div>
                <label className="label-field">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10" placeholder="••••••••"
                    required disabled={busy} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-4)' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <div className="relative">
                  <input type="checkbox" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)} disabled={busy} className="sr-only" />
                  <div className="w-4 h-4 rounded flex items-center justify-center transition-all"
                    style={{ background: rememberMe ? ACCENT : 'var(--surface)', border: `1.5px solid ${rememberMe ? ACCENT : 'var(--border)'}` }}>
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Ingat saya</span>
              </label>

              {/* Tombol */}
              <div className="flex gap-2">
                <button type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold !text-white transition-all disabled:opacity-60"
                  style={{ background: ACCENT, fontFamily: "'Poppins',sans-serif" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </span>
                  ) : 'Masuk'}
                </button>

                {showPasskeyBtn && (
                  <button type="button" onClick={handlePasskeyLogin} disabled={busy}
                    title={'Masuk dengan Passkey'}
                    className="flex items-center justify-center w-12 rounded-xl transition-all disabled:opacity-60"
                    style={{ border: `1.5px solid ${ACCENT}`, color: ACCENT, background: 'var(--accent-soft)' }}>
                    {passkeyLoading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <KeyRound className="w-5 h-5" />
                    }
                  </button>
                )}
              </div>
            </form>

            {showPasskeyBtn && (
              <p className="text-xs text-center mt-3 flex items-center justify-center gap-1" style={{ color: 'var(--text-4)' }}>
                Ketuk
                <KeyRound className="w-3 h-3" />
                untuk login dengan passkey
              </p>
            )}

            {/* Recaptcha */}
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-4)' }}>
              Protected by reCAPTCHA —{' '}
              <a href="https://policies.google.com/privacy" target="_blank" style={{ color: ACCENT }}>Privacy</a>
              {' & '}
              <a href="https://policies.google.com/terms" target="_blank" style={{ color: ACCENT }}>Terms</a>
            </p>

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
                Hubungi administrator jika mengalami kendala
              </p>
            </div>
            <div className="mt-2 pt-2 text-center">
              <a href="https://github.com/cakapbagus/kdninv-app" target="blank" style={{ color: ACCENT }}>Github</a>
            </div>
          </div>
        </div>
        <InstallPWA />
      </div>
    </>
  )
}