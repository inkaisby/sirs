<!-- ... existing code ... -->
## 2. Peran Pengguna (*User Roles & RBAC*)

| Peran (`role`) | Unit Pengguna | Hak Akses Utama |
| :--- | :--- | :--- |
| `admin_yanmed` | Pelayanan Medik & Manajemen | Akses penuh semua ruangan, kelola kapasitas bed, validasi laporan kematian & PP, akses penuh audit log. |
| `igd_admission` | Petugas IGD & Admisi | Kelola antrean IGD Pro MRS, melakukan *booking* (inden) kamar tujuan, lihat ketersediaan semua ruangan. |
| `nurse_ward` | Perawat Bangsal / Ruangan | Hanya dapat mengubah status bed & menerima pasien inden pada **ruangan yang ditugaskan** (`assigned_ward_id`). |
| `public_display` | Layar Informasi / Web RS | Akses baca-saja (*read-only*) agregat bed kosong per ruangan **tanpa data identitas & diagnosis pasien**. |

## 3. Scope MVP (Minimum Viable Product / MCV)

Fokus pengerjaan tahap pertama agar langsung bisa diuji coba di rumah sakit:

### Fitur 0: Halaman Depan Portal & Login Gateway (`/`)

* **Halaman Depan Institusional:** Menampilkan identitas resmi Pemerintah Kota Surabaya & RSUD Dr. M. Soewandhie, ringkasan ketersediaan tempat tidur publik (*Total Bed*, *Bed Tersedia*, dan *Persentase BOR*) tanpa menampilkan identitas pasien.

* **Form Autentikasi Petugas:** Login menggunakan NIP / ID Petugas dan kata sandi dengan pengalihan otomatis sesuai peran (`admin_yanmed`, `igd_admission`, `nurse_ward`), dilengkapi tombol akses cepat menuju **Layar Informasi Publik** (`/public-display`) dan tombol keluar (*Logout*) di dalam aplikasi.

### Fitur 1: Dashboard Keterisian & KPI Real-Time (`/dashboard`)

* **Kartu KPI:** Total Bed RS, Bed Terisi, Bed Tersedia, Pra Admisi (Inden), Pra Rujukan, dan Persentase BOR otomatis.
* **Tabel Rekap Per Ruangan:** Menampilkan 22 unit perawatan (IGD, Dahlia, Flamboyan, Safir, Tulip, Bougenville, Aster, Seruni, Anggrek, Teratai, VK Bersalin, Lavender, ICU, ICCU, Burn Unit, ICU Iso, MICU, ISU, NICU, Neonatus, Edelweis Lt. 2 & Lt. 3) beserta bar okupansi.

### Fitur 2: Antrean Pasien IGD Pro MRS (`/igd-queue`)

* Input & pembaruan status pasien IGD (kode bed IGD, nama/No. RM, diagnosis klinis, status konsul DPJP, ruang tujuan/inden, status menolak rujuk).
* Sinkronisasi otomatis jumlah *Pra Admisi / Inden* pada dashboard dan notifikasi ke ruangan tujuan.

### Fitur 3: Visual Bed Board & RBAC Per Ruangan (`/wards/[slug]`)

* Tampilan kartu per tempat tidur dengan kode warna status (`Tersedia`, `Terisi`, `Inden IGD`, `Rencana Pulang`).
* Proteksi **Row Level Security (RLS)** di Supabase sehingga perawat ruangan tidak dapat mengubah data ruangan lain.

### Fitur 4: Modul Laporan Kematian & Pulang Paksa (`/reports`)

* Formulir terstruktur menggantikan sheet `LAPORAN KEMATIAN` dan `LAPORAN PP` dengan fitur ekspor rekap bulanan ke CSV/Excel untuk Pelayanan Medik.