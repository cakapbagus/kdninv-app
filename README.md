# KDNINV — Sistem Pengajuan Nota

Aplikasi web manajemen pengajuan nota (bukti kas/bank keluar) berbasis Next.js 15 dengan role-based access control, tanda tangan digital QR, dan upload lampiran ke Cloudinary.

---

## Stack

| Layer     | Teknologi                           |
| --------- | ----------------------------------- |
| Framework | **Next.js 15** (App Router)         |
| React     | **React 19**                        |
| Database  | **Neon PostgreSQL** (serverless)    |
| Auth      | **Custom JWT** (jose + bcryptjs)    |
| Storage   | **Cloudinary**                      |
| Styling   | **Tailwind CSS v3** + CSS variables |
| Language  | **TypeScript** (strict mode)        |
| Deploy    | **Vercel**                          |

---

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### 2. Import di Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **Import** → pilih repo
3. Framework preset otomatis terdeteksi sebagai **Next.js**
4. Buka tab **Environment Variables**, isi semua variabel berikut:

| Variable                | Keterangan                           |
| ----------------------- | ------------------------------------ |
| `DATABASE_URL`          | Connection string Neon PostgreSQL    |
| `JWT_SECRET`            | String acak min. 32 karakter         |
| `CLOUDINARY_CLOUD_NAME` | Cloud name dari dashboard Cloudinary |
| `CLOUDINARY_API_KEY`    | API key dari dashboard Cloudinary    |
| `CLOUDINARY_API_SECRET` | API secret dari dashboard Cloudinary |

5. Klik **Deploy**

### 3. Setup Database (sekali saja)

Setelah deploy, jalankan schema di [Neon SQL Editor](https://console.neon.tech):

```sql
-- Jalankan seluruh isi file neon-schema.sql
```

Lalu buat user pertama (manager/super admin):

```sql
-- Password: ganti123 (hash bcrypt cost 12)
INSERT INTO users (username, full_name, password, role) VALUES
  ('manager1', 'Nama Manager', '$2a$12$...hash...', 'manager');
```

> Untuk generate hash bcrypt: gunakan [bcrypt-generator.com](https://bcrypt-generator.com) dengan cost factor 12.

---

## Setup Lokal

### 1. Clone & Install

```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>
pnpm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Isi `.env.local`:

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your-random-secret-min-32-chars
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Setup Database Neon

1. Buat project di [neon.tech](https://neon.tech)
2. Copy connection string ke `DATABASE_URL`
3. Jalankan `neon-schema.sql` di Neon SQL Editor

### 4. Jalankan

```bash
pnpm dev      # http://localhost:3000
pnpm build    # production build
pnpm start    # production server
```

---

## Role & Akses

| Fitur                  | User | Admin | Manager |
| ---------------------- | :--: | :---: | :-----: |
| Buat pengajuan         |  ✓   |   ✓   |    —    |
| Lihat history sendiri  |  ✓   |   ✓   |    —    |
| Admin panel            |  —   |   ✓   |    ✓    |
| Setujui / tolak nota   |  —   |   —   |    ✓    |
| Tandai selesai         |  —   |   ✓   |    —    |
| Print bukti kas        |  ✓   |   ✓   |    ✓    |
| User Management        |  —   |   ✓   |    ✓    |
| Buat role User         |  —   |   ✓   |    —    |
| Buat role Admin        |  —   |   —   |    ✓    |
| Hapus/reset User       |  —   |   ✓   |    ✓    |
| Hapus/reset Admin      |  —   |   —   |    ✓    |
| Edit nama lengkap      |  ✓   |   ✓   |    ✓    |
| Ganti password sendiri |  ✓   |   ✓   |    ✓    |

---

## Struktur Project

```
kdninv-app/
├── app/
│   ├── (app)/                  # Protected routes
│   │   ├── admin/              # Panel admin/manager
│   │   ├── dashboard/          # Dashboard + statistik
│   │   ├── history/            # Riwayat pengajuan (user)
│   │   ├── pengajuan/          # Form buat pengajuan baru
│   │   ├── users/              # User management
│   │   └── layout.tsx          # Auth check + sidebar
│   ├── api/
│   │   ├── auth/
│   │   │   ├── change-password/
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── me/
│   │   │   └── update-profile/ # ← Edit full_name
│   │   ├── nota-counter/       # Generate no. nota
│   │   ├── pengajuan/          # CRUD + [id] patch status
│   │   ├── rekening            # CRUD sistem save rekening
│   │   ├── upload/             # Cloudinary upload
│   │   └── users/              # GET + POST + [id] DELETE/PATCH
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── DetailModal.tsx         # Detail + print + aksi status
│   ├── EditModal.tsx           # Edit pengajuan
│   ├── QRSignature.tsx
│   └── Sidebar.tsx             # Nav + profile pill + modals
├── database/neon-schema.sql
├── lib/
│   ├── auth.ts                 # JWT sign/verify/session
│   ├── cloudinary.ts
│   ├── constants.ts            # Shared constants
│   ├── db.ts                   # Neon SQL client
│   ├── logo-base64.ts          # Logo on printing
│   └── utils.ts
├── middleware.ts               # Route protection
├── types/index.ts              # Consist defined types
└── .env.local.example
```

---

## Fitur Utama

- **Pengajuan nota** dengan detail barang, transfer bank, lampiran (maks. 5 file)
- **Tanda tangan digital** berbasis QR code — tersimpan di DB, tampil di print
- **Print bukti kas/bank keluar** format A4 langsung dari browser
- **Alur approval**: User mengajukan → Manager menyetujui/menolak → Admin menyelesaikan
- **User Management** CRUD lengkap dengan permission berbasis role
- **Edit nama lengkap** — nama dipakai di sidebar dan dokumen cetak
- **Responsive** — sidebar mobile dengan overlay

---

## Catatan Deployment Vercel

- Vercel otomatis mendeteksi Next.js — tidak perlu konfigurasi tambahan
- Pastikan semua 5 environment variable diisi sebelum deploy
- Gunakan **Neon** (bukan Supabase/Railway) karena driver `@neondatabase/serverless` dioptimalkan untuk environment serverless/edge
- Cloudinary free tier cukup untuk penggunaan internal (25 GB storage, 25 GB bandwidth/bulan)
