# KDNINV – Sistem Pengajuan Nota

Aplikasi Next.js untuk manajemen pengajuan nota dengan role-based access control.

## Stack

| Layer      | Teknologi                          |
|------------|------------------------------------|
| Framework  | **Next.js 15** (App Router)        |
| React      | **React 19**                       |
| Database   | **Neon PostgreSQL** (serverless)   |
| Auth       | **Custom JWT** (jose + bcryptjs)   |
| Storage    | **Cloudinary**                     |
| Styling    | **Tailwind CSS v3** + CSS vars     |
| Language   | **TypeScript** (strict mode)       |

## Breaking Changes yang Diperbaiki (Next.js 15+)

| Item                          | Sebelumnya             | Sekarang                             |
|-------------------------------|------------------------|--------------------------------------|
| Route `params`                | Sync object            | `Promise<{id: string}>` — di-await  |
| `cookies()`                   | Sync                   | Async — `await cookies()`            |
| `err: any`                    | Digunakan bebas        | `err: unknown` + `instanceof Error` |
| Pages API `export const config` | Di upload/api route  | Dihapus (tidak perlu di App Router) |
| ESLint config                 | `.eslintrc.json`       | `eslint.config.mjs` (flat config v9) |
| TypeScript `@types/react`     | v18                    | v19                                  |
| Script `dev`                  | `next dev`             | `next dev --turbopack`               |
| `|| ''`                       | Operator OR            | `?? ''` (nullish coalescing)         |

## Setup

### 1. Install Dependencies

```bash
pnpm install
# atau: npm install / yarn install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Isi semua nilai di .env.local
```

### 3. Setup Database Neon

1. Buat project di [neon.tech](https://neon.tech)
2. Copy connection string ke `DATABASE_URL`
3. Jalankan schema di Neon SQL Editor:

```sql
-- Jalankan isi file neon-schema.sql
```

4. Insert demo users:

```sql
INSERT INTO users (username, password, role, full_name) VALUES
  ('userdemo',    '$2a$12$YGLFERQtQS0chcJ9I2.tYuN5NxtscRXVRFzhcJoqiT8n1YsgJdteq', 'user',    'Demo User'),
  ('admindemo',   '$2a$12$YGLFERQtQS0chcJ9I2.tYuN5NxtscRXVRFzhcJoqiT8n1YsgJdteq', 'admin',   'Demo Admin'),
  ('managerdemo', '$2a$12$YGLFERQtQS0chcJ9I2.tYuN5NxtscRXVRFzhcJoqiT8n1YsgJdteq', 'manager', 'Demo Manager');
-- Password: demo123
```

### 4. Setup Cloudinary

1. Buat akun di [cloudinary.com](https://cloudinary.com)
2. Copy Cloud Name, API Key, API Secret ke `.env.local`

### 5. Jalankan

```bash
pnpm dev     # http://localhost:3000
pnpm build   # production build
pnpm start   # production server
```

## Akun Demo

| Role    | Username    | Password |
|---------|-------------|----------|
| User    | userdemo    | demo123  |
| Admin   | admindemo   | demo123  |
| Manager | managerdemo | demo123  |

## Role & Akses

| Fitur              | User | Admin | Manager |
|--------------------|------|-------|---------|
| Buat pengajuan     | ✓    | ✓     | -       |
| Lihat history      | ✓    | -     | -       |
| Admin panel        | -    | ✓     | ✓       |
| Setujui/tolak nota | -    | -     | ✓       |
| Tandai selesai     | -    | ✓     | -       |
| Kelola user        | -    | ✓     | ✓       |
| Buat admin         | -    | -     | ✓       |
| Buat user          | -    | ✓     | -       |

## Struktur Project

```
kdninv-app/
├── app/
│   ├── (app)/           # Protected routes (layout + session check)
│   │   ├── dashboard/
│   │   ├── pengajuan/
│   │   ├── history/
│   │   ├── admin/
│   │   └── users/
│   ├── api/
│   │   ├── auth/        # login, logout, me, change-password
│   │   ├── pengajuan/   # CRUD + [id] update
│   │   ├── users/       # user management
│   │   ├── upload/      # Cloudinary upload
│   │   └── nota-counter/
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx
│   ├── DetailModal.tsx
│   ├── QRSignature.tsx
│   └── ThemeProvider.tsx
├── lib/
│   ├── auth.ts          # JWT sign/verify/session
│   ├── db.ts            # Neon SQL client
│   ├── cloudinary.ts    # Cloudinary upload
│   └── utils.ts
├── middleware.ts         # JWT auth middleware
├── types/index.ts
├── neon-schema.sql
└── .env.example
```
