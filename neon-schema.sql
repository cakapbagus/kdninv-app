-- =====================================================
-- KDNINV System - Neon PostgreSQL Schema (v3)
-- Run this in your Neon SQL Editor
-- =====================================================

-- =====================================================
-- USERS TABLE (replaces Supabase auth.users + profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          SERIAL PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  password    TEXT NOT NULL,         -- bcrypt hash
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('user', 'admin', 'manager')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTA COUNTER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nota_counter (
  year     INTEGER PRIMARY KEY,
  counter  INTEGER DEFAULT 0
);

-- =====================================================
-- PENGAJUAN TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pengajuan (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_nota                 TEXT UNIQUE NOT NULL,
  tanggal                 DATE NOT NULL,
  divisi                  TEXT,
  rekening_sumber         TEXT,
  bank_sumber             TEXT,
  nama_sumber             TEXT,
  rekening_penerima       TEXT,
  bank_penerima           TEXT,
  nama_penerima           TEXT,
  -- Items stored as JSONB array
  -- Each: { nama_barang, jumlah, satuan, harga, total }
  items                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  grand_total             DECIMAL(15, 2) NOT NULL DEFAULT 0,
  grand_total_terbilang   TEXT,

  -- Cloudinary file
  file_url                TEXT,
  file_public_id          TEXT,
  file_name               TEXT,

  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'finished')),

  submitted_by            INTEGER REFERENCES public.users(id) NOT NULL,
  submitted_by_username   TEXT NOT NULL,
  submitted_at            TIMESTAMPTZ DEFAULT NOW(),

  -- QR signatures: "username | dd/MM/yyyy HH:mm:ss"
  signature_user          TEXT,
  signature_manager       TEXT,
  signature_admin_finish  TEXT,

  approved_at             TIMESTAMPTZ,
  approved_by             INTEGER REFERENCES public.users(id),
  approved_by_username    TEXT,

  rejected_at             TIMESTAMPTZ,
  rejected_by             INTEGER REFERENCES public.users(id),
  rejected_by_username    TEXT,
  rejection_reason        TEXT,

  finished_at             TIMESTAMPTZ,
  finished_by             INTEGER REFERENCES public.users(id),
  finished_by_username    TEXT,

  keterangan              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pengajuan_submitted_by   ON pengajuan(submitted_by);
CREATE INDEX IF NOT EXISTS idx_pengajuan_status         ON pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_pengajuan_submitted_at   ON pengajuan(submitted_at DESC);

-- =====================================================
-- FUNCTION: Generate Nota Number (atomic increment)
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_no_nota(p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_counter INTEGER;
  v_no_nota TEXT;
BEGIN
  INSERT INTO public.nota_counter (year, counter) VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET counter = nota_counter.counter + 1
  RETURNING counter INTO v_counter;

  v_no_nota := LPAD(v_counter::TEXT, 3, '0') || '/KDNINV/' || p_year::TEXT;
  RETURN v_no_nota;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED: Demo Users
-- =====================================================
-- Passwords are bcrypt hashes of 'demo123'
-- Generate your own at: https://bcrypt-generator.com/ (rounds=10)
-- Or via Node: const bcrypt = require('bcryptjs'); bcrypt.hashSync('demo123', 10)

-- After running schema, INSERT demo users manually:
-- INSERT INTO users (username, full_name, password, role) VALUES
--   ('userdemo',    'User Demo',    '$2b$10$XXXX...', 'user'),
--   ('admindemo',   'Admin Demo',   '$2b$10$XXXX...', 'admin'),
--   ('managerdemo', 'Manager Demo', '$2b$10$XXXX...', 'manager');
--
-- Or use the /api/auth/seed endpoint (development only) after setting up env vars.
-- =====================================================
