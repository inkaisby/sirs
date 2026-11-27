# SIMRS Bed & Inpatient Management System
### RSUD Dr. M. Soewandhie — Pemerintah Kota Surabaya

Aplikasi web terintegrasi untuk pemantauan kapasitas tempat tidur (*bed management*) real-time, koordinasi antrean pasien IGD Pro MRS (Masuk Rawat Selesai), serta pelaporan pelayanan medis di lingkungan RSUD Dr. M. Soewandhie Surabaya.

---

## Fitur Utama

- **Live Bed Occupancy & BOR Dashboard:** Pemantauan otomatis kapasitas 384 tempat tidur di 22 unit/bangsal perawatan (rawat inap, intensif, dan isolasi) dengan visualisasi Bed Occupancy Rate (BOR).
- **IGD Pro MRS Queue Management:** Pencatatan status pasien IGD, diagnosis, verifikasi DPJP, dan pemesanan kamar rawat inap (*inden bed*).
- **Visual Bed Board per Ruangan:** Tampilan visual kartu status tempat tidur (Tersedia, Terisi, Inden IGD, Rencana Pulang).
- **Role-Based Access Control (RBAC):**
  - `admin_yanmed`: Akses penuh manajerial dan audit log seluruh rumah sakit.
  - `igd_admission`: Pengelolaan antrean IGD dan booking kamar rawat inap.
  - `nurse_ward`: Khusus unit ruangan perawat yang bertugas (*ward-level access*).
  - `public_display`: Tampilan layar informasi publik baca-saja (*read-only*) tanpa data rekam medis pasien.
- **Modul Pelaporan Khusus:** Formulir digital pencatatan Laporan Kematian dan Pasien Pulang Paksa (PP).

---

## Struktur Repositori

```text
├── index.html         # Halaman utama aplikasi (Single Page Application)
├── docs/
│   └── PRD.md         # Dokumen spesifikasi kebutuhan produk (PRD/SRS)
├── .gitignore         # Berkas konfigurasi git ignore
└── README.md          # Dokumentasi proyek
```

---

## Menjalankan Proyek Secara Lokal

Tidak memerlukan instalasi dependensi atau proses *build* rumit. Aplikasi ini berbasis berkas statis tunggal (*standalone*):

1. **Buka langsung di browser:**
   Klik dua kali berkas `index.html` pada File Explorer.

2. **Atau jalankan server lokal sederhana:**
   ```bash
   # Menggunakan Python
   python -m http.server 3000

   # Menggunakan Node.js / npx
   npx serve .
   ```
   Buka `http://localhost:3000` pada peramban Anda.

---

## Publikasi ke GitHub Pages

Proyek ini telah dikonfigurasi menggunakan standar berkas `index.html` di akar repositori sehingga dapat langsung dipublikasikan via GitHub Pages:

1. Buat repositori baru di akun GitHub Anda (misal: `sirs-soewandhie`).
2. Jalankan perintah git:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit SIMRS Bed Management RSUD Dr. M. Soewandhie"
   git branch -M main
   git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```
3. Di GitHub: Masuk ke menu **Settings** > **Pages** > Pada opsi **Build and deployment**, pilih cabang `main` dan folder `/ (root)`, lalu klik **Save**.
4. Website akan aktif secara otomatis di: `https://<USERNAME>.github.io/<REPO_NAME>/`.
