-- ── WebAuthn Migration ───────────────────────────────────────────────────────
-- Jalankan di Neon / Supabase SQL editor

-- Tabel credential (kunci publik fingerprint per device)
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  credential_id  TEXT        PRIMARY KEY,
  user_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key     TEXT        NOT NULL,   -- base64 encoded public key bytes
  counter        INTEGER     NOT NULL DEFAULT 0,
  transports     TEXT        NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id
  ON webauthn_credentials(user_id);

-- Tabel challenge sementara (1 baris per user, auto-replace)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  user_id    INTEGER     PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  challenge  TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Bersihkan challenge kadaluarsa secara periodik (opsional, cron job)
-- DELETE FROM webauthn_challenges WHERE expires_at < NOW();
