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
   - `public.app_users`: Akun pegawai & petugas medis RS (`username`, `password_hash`, `role`).
   - `public.ruangan`: Master ruangan rumah sakit (`nama`, `kode`, `kategori`, `kapasitas`).
2. **Tabel Khusus SIIRS (Bed & IGD):**
   - `public.siirs_beds`: Ketersediaan 384 bed (`ward_id`, `class_type`, `bed_number`, `status`, `patient_mrn`).
     - Status enum: `'available'`, `'occupied'`, `'reserved'`, `'cleaning'`.
   - `public.siirs_igd_queue`: Antrean pasien IGD butuh rawat inap (`queue_number`, `triage_level`, `status`, `allocated_bed_id`).
   - `public.siirs_audit_logs`: Rekam jejak perubahan status bed dan aksi mutasi (`action`, `bed_id`, `actor_username`, `actor_role`, `details`).
3. **File Migrasi Database:**
   - [D:\website\idik-app\supabase\migrations\20261128030000_create_siirs_bed_management.sql](file:///D:/website/idik-app/supabase/migrations/20261128030000_create_siirs_bed_management.sql)
   - Salinan lokal: [D:\website\sirs\sql\20261128030000_create_siirs_bed_management.sql](file:///D:/website/sirs/sql/20261128030000_create_siirs_bed_management.sql)

---

## 3. Matriks Peran & Hak Akses (RBAC)
| Role Key | Label Tampilan | Cakupan Akses (*Scope*) | Fitur yang Diizinkan |
| :--- | :--- | :--- | :--- |
| `admin_yanmed` | Admin Yanmed | Seluruh Ruang (`ALL`) | Edit seluruh bed, alokasi antrean IGD, input laporan khusus, bypass audit. |
| `igd_admission` | Petugas IGD & Admisi | Unit IGD & Triage (`IGD`) | Input antrean IGD (P1/P2/P3), reservasi bed rawat inap untuk pasien IGD. |
| `nurse_ward` | Kepala Ruang / Perawat | Sesuai Bangsal (`assigned_ward_id`) | Update status bed bangsal sendiri (Tersedia, Terisi, Disinfeksi). |
| `public_display` | Layar Informasi Web RS | Tanpa Ruang (`NONE`) | Tampilan read-only teranonimasi (tanpa data identitas medis pasien). |

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
├── public/                   # Direktori aset publik
│   ├── favicon.ico
│   ├── favicon.png
│   └── favicon.svg
├── src/
│   ├── js/
│   │   ├── config.js         # Deteksi otomatis lokal vs cloud & konfigurasi port
│   │   └── supabaseClient.js # Client Supabase, sync DB, dan WebSocket realtime
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
