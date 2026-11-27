# SIIRS (Sistem Informasi Integrasi Rumah Sakit)
### RSUD Dr. M. Soewandhie — Pemerintah Kota Surabaya

Platform terpadu untuk pemantauan kapasitas tempat tidur (*bed management*) real-time, koordinasi antrean pasien IGD Pro MRS (*Masuk Rawat Selesai*), serta pelaporan mutu pelayanan medis terintegrasi di lingkungan **RSUD Dr. M. Soewandhie Surabaya**.

SIIRS terintegrasi langsung dengan satu basis data **PostgreSQL / Supabase** yang berbagi (*shared database*) dengan aplikasi pelayanan rumah sakit lainnya ([IDIK-App](file:///D:/website/idik-app)).

---

## Fitur Utama

- **Live Bed Occupancy & BOR Dashboard:** Pemantauan kapasitas 384 tempat tidur di 22 instalasi/bangsal perawatan secara real-time dengan kalkulasi otomatis Bed Occupancy Rate (BOR).
- **IGD Pro MRS Queue Management:** Pencatatan status pasien IGD, triase (P1, P2, P3), diagnosis, verifikasi DPJP, dan pemesanan kamar rawat inap (*inden bed*).
- **Visual Bed Board per Ruangan:** Tampilan visual kartu status tempat tidur (Tersedia, Terisi, Inden IGD, Desinfeksi/Pembersihan).
- **Role-Based Access Control (RBAC):**
  - `admin_yanmed`: Akses manajerial penuh dan audit log seluruh rumah sakit.
  - `igd_admission`: Pengelolaan antrean IGD dan alokasi kamar rawat inap.
  - `nurse_ward`: Khusus unit bangsal perawat yang bertugas (*ward-level scoped access*).
  - `public_display`: Tampilan layar informasi publik baca-saja (*read-only*) tanpa data rekam medis pasien.
- **Audit Logging Otomatis:** Setiap mutasi dan perubahan status tempat tidur tercatat di tabel `public.siirs_audit_logs`.
- **Dukungan Lokal & Cloud:**
  - **Lokal:** Berjalan di atas Docker Supabase lokal (`http://127.0.0.1:54321`).
  - **Cloud:** Berjalan di Supabase Cloud saat dideploy ke Vercel.

---

## Struktur Repositori

```text
├── CONTEXT_SIIRS.md          # Rujukan utama agen & developer (hemat token)
├── index.html                # Entry point aplikasi web SIIRS (Single Page App)
├── docs/
│   ├── CONTEXT_SIIRS.md      # Salinan dokumentasi arsitektur
│   └── PRD.md                # Spesifikasi kebutuhan teknis & user stories
├── public/                   # Aset publik (Favicon & Emblem resmi RSUD)
│   ├── favicon.ico
│   ├── favicon.png
│   └── favicon.svg
├── src/
│   ├── js/
│   │   ├── config.js         # Deteksi otomatis lokal vs cloud & port
│   │   └── supabaseClient.js # Inisialisasi Supabase, query & real-time sync
│   └── data/
│       └── wardsSeed.js      # Data dasar 22 bangsal untuk mode standalone/offline
├── sql/
│   └── 20261128030000_create_siirs_bed_management.sql # Skema DDL & migrasi
└── README.md                 # Dokumentasi proyek
```

---

## Integrasi Database dengan IDIK-App

SIIRS dan IDIK-App berbagi basis data yang sama:

1. **Jalankan Supabase Lokal (via Docker di `D:\website\idik-app`):**
   ```bash
   cd D:\website\idik-app
   npx supabase start
   ```
2. **Cek Port & Kredensial:**
   ```bash
   npx supabase status
   ```
   - API URL: `http://127.0.0.1:54321`
   - DB URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - Studio URL: `http://127.0.0.1:54323`
3. **Migrasi Tabel:**
   File migrasi telah tersedia di [D:\website\idik-app\supabase\migrations\20261128030000_create_siirs_bed_management.sql](file:///D:/website/idik-app/supabase/migrations/20261128030000_create_siirs_bed_management.sql).

---

## Menjalankan SIIRS di Lokal

1. **Buka langsung di browser:**
   Klik dua kali `index.html`.
2. **Atau jalankan web server lokal:**
   ```bash
   # Python
   python -m http.server 3000

   # Node.js
   npx serve .
   ```
   Buka `http://localhost:3000` pada peramban.

---

## Deployment (Vercel & GitHub)

- **Repositori:** `https://github.com/inkaisby/sirs`
- **Vercel Project:** `siirs` (domain: `https://siirs.vercel.app` atau `https://sirs-soewandhie.vercel.app`).
- **Environment Variables di Vercel:**
  - `SUPABASE_URL` : URL project Supabase Cloud
  - `SUPABASE_ANON_KEY` : Anon Public Key Supabase Cloud
