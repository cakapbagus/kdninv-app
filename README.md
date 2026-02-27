# KDNINV — Sistem Pengajuan Nota

Aplikasi web manajemen pengajuan nota (bukti kas/bank keluar) berbasis Next.js 15 dengan role-based access control, tanda tangan digital QR, upload lampiran ke Cloudinary, dan dukungan **PWA dengan Push Notification**.

---

## Stack

| Layer      | Teknologi                           |
| ---------- | ----------------------------------- |
| Framework  | **Next.js 15** (App Router)         |
| React      | **React 19**                        |
| Database   | **Neon PostgreSQL** (serverless)    |
| Auth       | **Custom JWT** (jose + bcryptjs)    |
| Storage    | **Cloudinary**                      |
| Styling    | **Tailwind CSS v3** + CSS variables |
| Push Notif | **Web Push API** + VAPID (web-push) |
| Language   | **TypeScript** (strict mode)        |
| Deploy     | **Vercel**                          |

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

| Variable                       | Keterangan                             |
| ------------------------------ | -------------------------------------- |
| `DATABASE_URL`                 | Connection string Neon PostgreSQL      |
| `JWT_SECRET`                   | String acak min. 32 karakter           |
| `CLOUDINARY_CLOUD_NAME`        | Cloud name dari dashboard Cloudinary   |
| `CLOUDINARY_API_KEY`           | API key dari dashboard Cloudinary      |
| `CLOUDINARY_API_SECRET`        | API secret dari dashboard Cloudinary   |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key untuk push notifikasi |
| `VAPID_PRIVATE_KEY`            | VAPID private key untuk push notifikasi|
| `VAPID_EMAIL`                  | Email VAPID (format: mailto:x@x.com)  |

5. Klik **Deploy**

### 3. Generate VAPID Keys (sekali saja)

```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log('PUBLIC:',k.publicKey,'\nPRIVATE:',k.privateKey)"
```

Simpan hasilnya ke environment variable di atas.

### 4. Setup Database (sekali saja)

Setelah deploy, jalankan schema di [Neon SQL Editor](https://console.neon.tech):

```sql
-- Jalankan seluruh isi file database/neon-schema.sql
-- Lalu jalankan database/push-subscriptions.sql
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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@example.com
```

### 3. Setup Database Neon

1. Buat project di [neon.tech](https://neon.tech)
2. Copy connection string ke `DATABASE_URL`
3. Jalankan `database/neon-schema.sql` di Neon SQL Editor
4. Jalankan `database/push-subscriptions.sql` di Neon SQL Editor

### 4. Jalankan

```bash
pnpm dev      # http://localhost:3000
pnpm build    # production build
pnpm start    # production server
```

---

## Role & Akses

| Fitur                            | User | Admin | Manager |
| -------------------------------- | :--: | :---: | :-----: |
| Buat pengajuan                   |  ✓   |   ✓   |    —    |
| Lihat history sendiri            |  ✓   |   ✓   |    —    |
| Edit pengajuan (pending/ditolak) |  ✓   |   ✓   |    —    |
| Admin panel                      |  —   |   ✓   |    ✓    |
| Setujui / tolak nota             |  —   |   —   |    ✓    |
| Tandai selesai                   |  —   |   ✓   |    —    |
| Print bukti kas                  |  ✓   |   ✓   |    ✓    |
| User Management                  |  —   |   ✓   |    ✓    |
| Buat role User                   |  —   |   ✓   |    —    |
| Buat role Admin                  |  —   |   —   |    ✓    |
| Hapus/reset User                 |  —   |   ✓   |    ✓    |
| Hapus/reset Admin                |  —   |   —   |    ✓    |
| Edit nama lengkap                |  ✓   |   ✓   |    ✓    |
| Ganti password sendiri           |  ✓   |   ✓   |    ✓    |
| Aktifkan push notifikasi         |  ✓   |   ✓   |    ✓    |

---

## Push Notification

Alur notifikasi otomatis berdasarkan aksi:

| Event                           | Penerima notifikasi                              |
| ------------------------------- | ------------------------------------------------ |
| Pengajuan baru masuk            | Semua **Manager**                                |
| Pengajuan disetujui Manager     | **User/Admin** yang submit + semua **Admin**     |
| Pengajuan ditolak Manager       | **User/Admin** yang submit                       |
| Pengajuan selesai (Admin)       | **User/Admin** yang submit                       |
| Pengajuan diedit & re-submit    | Semua **Manager**                                |

Cara mengaktifkan notifikasi:
1. Login ke app
2. Klik tombol **"Aktifkan notifikasi"** di bagian bawah sidebar
3. Izinkan notifikasi di browser
4. Notifikasi aktif dan tersimpan di database

> **Catatan iOS:** Push notification hanya berjalan jika app sudah di-install ke homescreen (Add to Home Screen) dan iOS ≥ 16.4.

---

## PWA (Progressive Web App)

App ini dapat di-install ke homescreen perangkat:

- **Android (Chrome):** Tap menu → "Add to Home Screen" atau banner install otomatis muncul
- **iOS (Safari):** Tap Share → "Add to Home Screen"
- **Desktop (Chrome/Edge):** Klik ikon install di address bar

Fitur PWA:
- Install ke homescreen dengan ikon dan nama app
- Tampilan fullscreen tanpa browser UI (`standalone` mode)
- Offline shell — halaman tetap terbuka meski koneksi terputus
- Push notification background (Android & Desktop)

---

## Struktur Project

```
kdninv-app/
├── app/
│   ├── (app)/                  # Protected routes
│   │   ├── admin/              # Panel admin/manager
│   │   ├── dashboard/          # Dashboard + statistik
│   │   ├── history/            # Riwayat pengajuan
│   │   ├── pengajuan/          # Form buat pengajuan baru
│   │   ├── users/              # User management
│   │   └── layout.tsx          # Auth check + sidebar
│   ├── api/
│   │   ├── auth/               # login, logout, me, update-profile, change-password
│   │   ├── nota-counter/       # Generate no. nota
│   │   ├── pengajuan/          # CRUD + [id] patch status
│   │   ├── push/               # Push subscription (GET/POST/DELETE)
│   │   ├── rekening/           # CRUD rekening tersimpan
│   │   ├── upload/             # Cloudinary upload
│   │   └── users/              # User management API
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── DetailModal.tsx         # Detail + print + aksi status + edit
│   ├── EditModal.tsx           # Edit pengajuan
│   ├── NotificationToggle.tsx  # Toggle push notification di sidebar
│   ├── QRSignature.tsx
│   └── Sidebar.tsx             # Nav + profile pill + modals
├── database/
│   ├── neon-schema.sql         # Schema utama
│   └── push-subscriptions.sql  # Tabel push subscriptions (PWA)
├── hooks/
│   └── usePushNotification.ts  # Hook subscribe/unsubscribe push
├── lib/
│   ├── auth.ts
│   ├── cloudinary.ts
│   ├── constants.ts
│   ├── db.ts
│   ├── logo-base64.ts
│   ├── utils.ts
│   └── webpush.ts              # Web Push helper (sendPushToUser/Roles)
├── public/
│   ├── icons/                  # App icons (PWA)
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
├── types/index.ts
├── middleware.ts
└── .env.local.example
```

---

## Fitur Utama

- **Pengajuan nota** dengan detail barang, transfer bank, lampiran (maks. 3 file, auto-compress WebP)
- **Edit pengajuan** — bisa diedit selama status masih menunggu atau ditolak, otomatis re-submit ke pending
- **Rekening tersimpan** — simpan rekening sumber/penerima untuk dipakai ulang di pengajuan berikutnya
- **Tanda tangan digital** berbasis QR code — tersimpan di DB, tampil di dokumen cetak
- **Print bukti kas/bank keluar** format A4 langsung dari browser
- **Alur approval**: User/Admin mengajukan → Manager menyetujui/menolak → Admin menyelesaikan
- **Push Notification** — notif real-time saat pengajuan masuk, disetujui, ditolak, atau selesai
- **PWA** — bisa di-install ke homescreen, offline shell, tampilan standalone
- **User Management** CRUD lengkap dengan permission berbasis role
- **Dashboard** dengan statistik pengajuan (admin: tampilan mine vs semua)
- **Responsive** — mobile-first dengan sidebar overlay

---

## Catatan Deployment Vercel

- Vercel otomatis mendeteksi Next.js — tidak perlu konfigurasi tambahan
- Pastikan **semua 8 environment variable** diisi sebelum deploy
- Gunakan **Neon** (bukan Supabase/Railway) karena driver `@neondatabase/serverless` dioptimalkan untuk environment serverless/edge
- Cloudinary free tier cukup untuk penggunaan internal (25 GB storage, 25 GB bandwidth/bulan)
- Service Worker hanya aktif di **HTTPS** — push notification tidak berjalan di `localhost` tanpa flag khusus browser
