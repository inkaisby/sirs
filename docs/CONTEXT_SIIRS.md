# CONTEXT_SIIRS.md — Master Context & Architectural Guide

> **ATURAN UNTUK AI AGENT / DEVELOPER:**
> Setiap kali ada instruksi perubahan baru pada proyek ini, **BACA DOKUMEN INI TERLEBIH DAHULU** sebelum membaca file lain untuk menghemat token dan menjaga konsistensi arsitektur.

---

## 1. Identitas Sistem
- **Nama Sistem:** **SIIRS** (Sistem Informasi Integrasi Rumah Sakit).
- **Institusi:** RSUD Dr. M. Soewandhie Surabaya (Pemerintah Kota Surabaya).
- **Fokus Utama:** Manajemen Ketersediaan Tempat Tidur (*Bed Management*), Alur Pasien Masuk IGD (*Triage & Inden Rawat Inap*), dan Pelaporan Mutu Pelayanan Medis (*Yanmed*).
- **Kapasitas RS:** 384 Tempat Tidur terdistribusi di 22 Instalasi/Bangsal Rawat Inap & Perawatan Intensif.
- **Repositori GitHub:** `https://github.com/inkaisby/sirs`
- **Domain Deployment Vercel:** `https://siirs.vercel.app` (atau fallback `sirs-soewandhie.vercel.app`).

---

## 2. Arsitektur Basis Data Terpadu (Shared dengan `idik-app`)
SIIRS terhubung ke **satu basis data PostgreSQL/Supabase yang sama** dengan aplikasi rawat/tindakan rumah sakit lainnya di `D:\website\idik-app`.

### A. Environment Lokal (Development via Docker)
- **Supabase CLI:** Dijalankan dari `D:\website\idik-app` dengan perintah:
  ```powershell
  cd D:\website\idik-app
  npx supabase start
  ```
- **Port Layanan Lokal:**
  - **Supabase API (REST/Realtime):** `http://127.0.0.1:54321`
  - **PostgreSQL Database:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  - **Supabase Studio (Web GUI):** `http://127.0.0.1:54323`
  - **Inbucket (Email Dev):** `http://127.0.0.1:54324`

### B. Environment Cloud (Production Vercel)
- Menggunakan Supabase Cloud project yang sama dengan IDIK-App.
- Kunci konfigurasi di Vercel Environment Variables:
  - `SUPABASE_URL` = `https://[PROJECT-REF].supabase.co`
  - `SUPABASE_ANON_KEY` = `[ANON-KEY-CLOUD]`

### C. Skema Tabel & Relasi
1. **Tabel Master Shared (Milik Bersama RSUD):**
   - `public.pasien`: Master data rekam medis pasien (`no_rm`, `nama`, `jenis_kelamin`, `tgl_lahir`, `kelas_perawatan`).
   - `public.app_users`: Akun pegawai & petugas medis RS (`username`, `password_hash`, `role`, `ruangan_id`).
   - `public.ruangan`: Master ruangan rumah sakit (`nama`, `kode`, `kategori`, `kapasitas`).
2. **Tabel Khusus SIIRS (Bed & IGD):**
   - `public.siirs_beds`: Ketersediaan 384 bed (`ward_id`, `class_type`, `bed_number`, `status`, `patient_mrn`).
     - Status enum: `'available'`, `'occupied'`, `'reserved'`, `'cleaning'`.
   - `public.siirs_igd_queue`: Antrean pasien IGD butuh rawat inap (`queue_number`, `triage_level`, `status`, `allocated_bed_id`).
   - `public.siirs_audit_logs`: Rekam jejak audit otentikasi dan mutasi bed (`action`, `bed_id`, `actor_username`, `actor_role`, `details`). Bersifat *immutable append-only*.
   - `public.siirs_public_beds_view`: Tampilan aman display publik teranonimasi tanpa membocorkan identitas pasien.
3. **File Migrasi Database:**
   - [D:\website\idik-app\supabase\migrations\20261128030000_create_siirs_bed_management.sql](file:///D:/website/idik-app/supabase/migrations/20261128030000_create_siirs_bed_management.sql)
   - Salinan lokal: [D:\website\sirs\sql\20261128030000_create_siirs_bed_management.sql](file:///D:/website/sirs/sql/20261128030000_create_siirs_bed_management.sql)

---

## 3. Matriks Peran & Hak Akses (RBAC)
| Role Key | Label Tampilan | Cakupan Akses (*Scope*) | Fitur yang Diizinkan |
| :--- | :--- | :--- | :--- |
| `admin_yanmed` | Admin Yanmed | Seluruh Ruang (`ALL`) | Edit seluruh bed, alokasi antrean IGD, input rekap kematian & PP, verifikasi audit. |
| `igd_admission` | Petugas IGD & Admisi | Unit IGD & Triage (`IGD`) | Input antrean IGD (P1/P2/P3), reservasi bed rawat inap untuk pasien IGD. |
| `nurse_ward` | Kepala Ruang / Perawat | Sesuai Bangsal (`assigned_ward_id`) | Update status bed bangsal sendiri (Tersedia, Terisi, Disinfeksi). |
| `public_display` | Layar Informasi Web RS | Tanpa Ruang (`NONE`) | Tampilan read-only teranonimasi (data nama & diagnosis disembunyikan). |

---

## 4. Struktur Folder Repositori (Terorganisir)
```
D:\website\sirs\
├── CONTEXT_SIIRS.md          # << RUJUKAN UTAMA: Sumber informasi hemat token
├── index.html                # Entry point utama web SIIRS (Vercel deployment)
├── README.md                 # Dokumentasi publik GitHub
├── favicon.ico / .png / .svg # Aset favicon resmi lambang RSUD Dr. M. Soewandhie
├── docs/
│   ├── CONTEXT_SIIRS.md      # Mirror dokumentasi arsitektur
│   └── PRD.md                # Spesifikasi kebutuhan teknis & user stories
├── src/
│   ├── js/
│   │   ├── config.js         # Deteksi otomatis lokal vs cloud & konfigurasi port
│   │   └── supabaseClient.js # Client Supabase, auth security, session, dan sync DB
│   └── data/
│       └── wardsSeed.js      # 22 bangsal & data cadangan offline/stand-alone
└── sql/
    └── 20261128030000_create_siirs_bed_management.sql # Skema DDL & RLS Supabase
```

---

## 5. Ringkasan 22 Bangsal / Unit Perawatan
1. **IGD & TRIAGE** (24 bed)
2. **DAHLIA** (28 bed)
3. **MAWAR** (24 bed)
4. **MELATI** (26 bed)
5. **WIJAYA KUSUMA** (30 bed)
6. **ASOKA** (20 bed)
7. **BOUGENVILLE** (24 bed)
8. **SERUNI** (57 bed - Terbesar)
9. **ANGGREK** (32 bed)
10. **TERATAI** (35 bed)
11. **VK BERSALIN** (11 bed)
12. **LAVENDER** (10 bed)
13. **ICU** (9 bed intensif)
14. **ICCU** (8 bed intensif jantung)
15. **BURN UNIT** (2 bed luka bakar)
16. **ICU ISO** (2 bed isolasi intensif)
17. **MICU** (3 bed intensif medikal)
18. **ISU** (5 bed stroke unit)
19. **NICU** (8 bed intensif neonatus)
20. **NEONATUS** (15 bed bayi)
21. **EDELWEIS LT.2** (19 bed)
22. **EDELWEIS LT.3** (12 bed)
*Total Kapasitas: 384 Bed.*

---

## 6. Alur Kerja & Sinkronisasi Kode
- Setiap penambahan fitur atau perbaikan kode **wajib mengacu ke CONTEXT_SIIRS.md** ini terlebih dahulu untuk meminimalkan pembacaan file lain.
- Semua file migrasi SQL disimpan ganda di `d:\website\sirs\sql\` dan `D:\website\idik-app\supabase\migrations\`.
- Deployment ke production dijalankan secara otomatis oleh Vercel melalui Git push ke remote `origin/main` (`inkaisby/sirs`).

---

## 7. Arsitektur & Lapisan Keamanan (Security Layers)
SIIRS mengimplementasikan arsitektur keamanan berlapis (*defense-in-depth*) untuk melindungi data rekam medis pasien dan menjamin integritas operasional rumah sakit:

### 7.1. Proteksi Brute-Force & Rate Limiting
- **Ambang Batas Percobaan:** Maksimal 5 (lima) kali kesalahan login per akun NIP/username dalam rentang waktu 15 menit.
- **Mekanisme Lockout:** Setelah 5 kali kegagalan berturut-turut, akun dikunci sementara (*lockout*) selama 15 menit. Tombol login dinonaktifkan dengan hitung mundur waktu tersisa.
- **Pencatatan Audit:** Setiap kegagalan dan kejadian lockout dicatat otomatis ke tabel `siirs_audit_logs` dengan aksi `AUTH_LOGIN_FAILED` atau `AUTH_LOCKED_OUT`.

### 7.2. Sanitasi Input & Pencegahan Injeksi (Anti-XSS & Anti-SQLi)
- **Validasi Identitas (NIP):** Input NIP disaring dengan regex ketat `^[a-zA-Z0-9.\-_]{3,32}$`. Karakter non-standar langsung ditolak sebelum diproses.
- **Pembersihan Karakter Berisiko:** Menghapus karakter berbahaya seperti `< > ' " ; \` sebelum dikirimkan ke aplikasi atau database.
- **Validasi Kata Sandi:** Mengharuskan panjang minimal 6 karakter dan menolak karakter kendali berbahaya.

### 7.3. Manajemen Sesi Kriptografis & Auto-Lock (Workstation Security)
- **Token Kriptografis:** Sesi menghasilkan token unik berbasis `crypto.randomUUID()`.
- **Penyimpanan Terisolasi:** Disimpan di `sessionStorage` (bukan `localStorage` persisten) sehingga sesi otomatis musnah saat tab browser ditutup. Ini mencegah pencurian kredensial di komputer bangsal perawat yang digunakan bergantian (*shared workstation terminals*).
- **Time-to-Live (TTL):** Sesi memiliki batas kedaluwarsa maksimal 30 menit.
- **Inactivity Timeout (Auto-Lock 15 Menit):** Sistem memantau aktivitas input pengguna (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`). Jika tidak ada aktivitas selama 15 menit berturut-turut, sistem otomatis mengakhiri sesi (*auto-logout*) dan mengembalikan tampilan ke portal login dengan notifikasi keamanan.

### 7.4. Kontrol Akses Berbasis Peran (RBAC) & Hak Akses Terkecil
- **Isolasi Bangsal:** Petugas perawat (`nurse_ward`) hanya memiliki hak modifikasi status bed pada bangsal yang ditugaskan kepadanya (`allowedWard`). Akses ke bangsal lain dikunci dalam mode baca-saja.
- **Otoritas Khusus IGD:** Peran `igd_admission` berhak menginput antrean triage (P1/P2/P3) dan mereservasi tempat tidur ke bangsal tujuan.
- **Akses Penuh:** Hanya peran `admin_yanmed` yang memiliki kewenangan menyeluruh lintas instalasi dan bangsal.

### 7.5. Row-Level Security (RLS) & Masking Privasi Medis
- **Enforcing RLS pada PostgreSQL:** Tabel `siirs_beds`, `siirs_igd_queue`, dan `siirs_audit_logs` diproteksi menggunakan PostgreSQL Row Level Security (RLS).
- **Public View Masking:** Disediakan view publik `siirs_public_beds_view` yang menyembunyikan identitas pasien (`patient_mrn`, `patient_name`, `diagnosis`). Pada mode `public_display`, nama pasien otomatis dimasker menjadi `Pasien Anonim (***)` dan diagnosis klinis disembunyikan demi kepatuhan regulasi privasi medis.

### 7.6. Audit Trail Anti-Tamper (Immutable Audit Log)
- **Tabel `siirs_audit_logs`:** Bersifat *append-only* (hanya menerima operasi `INSERT`).
- **Larangan `UPDATE` & `DELETE`:** Kebijakan RLS tidak mengizinkan modifikasi maupun penghapusan log audit oleh role apa pun guna mencegah manipulasi riwayat medis (*non-repudiation*).
- **Cakupan Audit:** Mencatat seluruh mutasi status bed (`STATUS_CHANGE`, `BED_ALLOCATION`), otentikasi login (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOCKED_OUT`), dan logout (`AUTH_LOGOUT`, `IDLE_TIMEOUT`).

### 7.7. Keamanan Basis Data Bersama (*Shared DB*) dengan `idik-app`
- Menggunakan skema terpadu pada Supabase lokal (`127.0.0.1:54322`) dan Supabase Cloud.
- Pemisahan hak akses tabel `app_users` dengan pembatasan service role dan referensi `ruangan_id` untuk integrasi modul rumah sakit lainnya.
