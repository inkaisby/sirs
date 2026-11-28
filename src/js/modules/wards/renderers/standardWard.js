import { appState, ROLE_META } from '../../../state.js';
import { showToast } from '../../../ui/toast.js';
import { updateWardHud, renderSidebarWards } from '../../../ui/navigation.js';
import { getConnectionState, updateBedStatusDb } from '../../../supabaseClient.js';
import { openPatientDrawer, calculateAgeFromBirthDate } from '../patientDetailDrawer.js';

let activeClassFilter = 'ALL';
let activeViewMode = 'table'; // 'table' | 'grid'
let patientSearchQuery = '';

function getTodayDateStr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function getNowDateTimeStr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
}

// Kumpulan data sampel awal pasien RSUD Dr. M. Soewandhie Surabaya
const PATIENT_SAMPLES = [
  { norm: '01-24-89', name: 'Ny. Siti Aminah', age: '58 Th', diag: 'Dyspepsia Syndrome + HT Gr. II', tglMrs: '25/11/2026', lama: '4 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P1', pinru: 'Tidak / Tetap', penerima: 'Ns. Siti Rahayu, S.Kep', admisi: 'Ahmad Fauzi', jam: '25/11/2026 08:30:00', asal: 'IGD Triage Bed K1' },
  { norm: '02-18-45', name: 'Tn. Bambang Sutrisno', age: '62 Th', diag: 'DM Tipe 2 + Ulkus Pedis Dextra', tglMrs: '24/11/2026', lama: '5 Hari', pembiayaan: 'BPJS Non PBI', dari: 'Poli Bedah', pinru: 'Rencana Bedah', penerima: 'Ns. Budi Santoso', admisi: 'Rina Andriani', jam: '24/11/2026 10:15:00', asal: 'Poli Bedah Umum' },
  { norm: '01-92-33', name: 'Ny. Sri Wahyuni', age: '47 Th', diag: 'Pneumonia Komuniti + PPOK Eksaserbasi', tglMrs: '26/11/2026', lama: '3 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P2', pinru: 'Tidak / Tetap', penerima: 'Ns. Ratna Dewi', admisi: 'Hadi Kusuma', jam: '26/11/2026 13:45:00', asal: 'IGD Triage Bed K4' },
  { norm: '03-55-71', name: 'Tn. M. Sholeh', age: '54 Th', diag: 'Post Laparatomi Appendisitis Perforasi H-2', tglMrs: '26/11/2026', lama: '3 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P1', pinru: 'Tidak / Tetap', penerima: 'Ns. Dian Anggraeni', admisi: 'Ahmad Fauzi', jam: '26/11/2026 19:20:00', asal: 'IGD Bedah Cito' },
  { norm: '02-88-14', name: 'Ny. Kartini', age: '71 Th', diag: 'CVA Infark Trombotik + Afasia Motorik', tglMrs: '25/11/2026', lama: '4 Hari', pembiayaan: 'Jamkesda Sby', dari: 'IGD P1', pinru: 'Rencana Teratai', penerima: 'Ns. Siti Rahayu', admisi: 'Dewi Sartika', jam: '25/11/2026 06:10:00', asal: 'IGD Triage Bed K2' },
  { norm: '04-12-67', name: 'Tn. Agus Prasetyo', age: '39 Th', diag: 'Gagal Jantung Kongestif (CHF NYHA III)', tglMrs: '27/11/2026', lama: '2 Hari', pembiayaan: 'BPJS Non PBI', dari: 'Poli Jantung', pinru: 'Rencana Cathlab', penerima: 'Ns. Budi Santoso', admisi: 'Rina Andriani', jam: '27/11/2026 11:00:00', asal: 'Poli Spesialis Jantung' },
  { norm: '01-77-90', name: 'Ny. Indah Lestari', age: '33 Th', diag: 'Demam Berdarah Dengue (DBD Gr. II)', tglMrs: '27/11/2026', lama: '2 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P2', pinru: 'Tidak / Tetap', penerima: 'Ns. Ratna Dewi', admisi: 'Hadi Kusuma', jam: '27/11/2026 16:30:00', asal: 'IGD Triage Bed K7' },
  { norm: '03-44-25', name: 'Tn. Eko Wahyudi', age: '66 Th', diag: 'CKD Stage V on HD Reguler + Anemia', tglMrs: '25/11/2026', lama: '4 Hari', pembiayaan: 'BPJS PBI', dari: 'Hemodialisa', pinru: 'Tidak / Tetap', penerima: 'Ns. Dian Anggraeni', admisi: 'Ahmad Fauzi', jam: '25/11/2026 14:00:00', asal: 'Unit Hemodialisa' },
  { norm: '02-39-81', name: 'Ny. Endang Susilowati', age: '51 Th', diag: 'Gastritis Erosif Kronik + Melena', tglMrs: '26/11/2026', lama: '3 Hari', pembiayaan: 'Umum', dari: 'Poli Dalam', pinru: 'Rencana Pulang (PP)', penerima: 'Ns. Siti Rahayu', admisi: 'Dewi Sartika', jam: '26/11/2026 09:20:00', asal: 'Poli Penyakit Dalam' },
  { norm: '01-65-42', name: 'Tn. Achmad Rizal', age: '43 Th', diag: 'Fraktur Cruris Dextra Post Pasang Gips', tglMrs: '27/11/2026', lama: '2 Hari', pembiayaan: 'BPJS Non PBI', dari: 'IGD P2', pinru: 'Tidak / Tetap', penerima: 'Ns. Budi Santoso', admisi: 'Rina Andriani', jam: '27/11/2026 18:40:00', asal: 'IGD Triage Bed K9' },
  { norm: '04-80-19', name: 'Ny. Suparni', age: '64 Th', diag: 'Vertigo Perifer Akut + HT Emergensi', tglMrs: '28/11/2026', lama: '1 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P1', pinru: 'Tidak / Tetap', penerima: 'Ns. Ratna Dewi', admisi: 'Hadi Kusuma', jam: '28/11/2026 05:30:00', asal: 'IGD Triage Bed K3' },
  { norm: '02-73-58', name: 'Tn. Joko Widodo', age: '59 Th', diag: 'BPH Retensi Urin Post Kateterisasi', tglMrs: '27/11/2026', lama: '2 Hari', pembiayaan: 'BPJS PBI', dari: 'Poli Urologi', pinru: 'Rencana Pulang (PP)', penerima: 'Ns. Dian Anggraeni', admisi: 'Ahmad Fauzi', jam: '27/11/2026 10:50:00', asal: 'Poli Spesialis Urologi' },
  { norm: '03-91-24', name: 'Ny. Mariani', age: '38 Th', diag: 'Kista Ovarium Terpuntir Post Laparoskopi', tglMrs: '26/11/2026', lama: '3 Hari', pembiayaan: 'BPJS Non PBI', dari: 'Poli Kandungan', pinru: 'Tidak / Tetap', penerima: 'Ns. Siti Rahayu', admisi: 'Dewi Sartika', jam: '26/11/2026 12:15:00', asal: 'Poli Kandungan' },
  { norm: '01-84-63', name: 'Tn. Sugeng Riyadi', age: '52 Th', diag: 'Kolesistitis Akut Kalkulosa', tglMrs: '27/11/2026', lama: '2 Hari', pembiayaan: 'BPJS PBI', dari: 'IGD P2', pinru: 'Rencana Operasi', penerima: 'Ns. Budi Santoso', admisi: 'Rina Andriani', jam: '27/11/2026 20:10:00', asal: 'IGD Triage Bed K8' },
  { norm: '04-26-95', name: 'Ny. Wulandari', age: '29 Th', diag: 'GEA Akut Dehidrasi Sedang', tglMrs: '28/11/2026', lama: '1 Hari', pembiayaan: 'Umum', dari: 'IGD P2', pinru: 'Tidak / Tetap', penerima: 'Ns. Ratna Dewi', admisi: 'Hadi Kusuma', jam: '28/11/2026 02:40:00', asal: 'IGD Triage Bed K5' },
  { norm: '02-50-37', name: 'Tn. Hendra Gunawan', age: '60 Th', diag: 'Hepatitis Akut + Ikterus Obstruktif', tglMrs: '25/11/2026', lama: '4 Hari', pembiayaan: 'BPJS PBI', dari: 'Poli Dalam', pinru: 'Tidak / Tetap', penerima: 'Ns. Dian Anggraeni', admisi: 'Ahmad Fauzi', jam: '25/11/2026 15:30:00', asal: 'Poli Penyakit Dalam' }
];

const INDEN_SAMPLES = [
  { norm: '05-11-82', name: 'Tn. Hendra Wijaya', age: '48 Th', diag: 'Obs Penurunan Kesadaran susp Ensefalopati', pembiayaan: 'BPJS PBI', dari: 'IGD Triage P1', pinru: 'Inden Bangsal', penerima: 'Ns. Siti Rahayu', admisi: 'Ahmad Fauzi', jam: '28/11/2026 09:15:00', asal: 'IGD Triage Bed K2' },
  { norm: '05-23-40', name: 'Ny. Kusmawati', age: '53 Th', diag: 'Hematemesis Melena ec Sirosis Hepatis', pembiayaan: 'BPJS PBI', dari: 'IGD Triage P1', pinru: 'Inden Bangsal', penerima: 'Ns. Budi Santoso', admisi: 'Rina Andriani', jam: '28/11/2026 10:20:00', asal: 'IGD Triage Bed K4' },
  { norm: '05-39-16', name: 'An. Alkhalifi', age: '12 Th', diag: 'Anemia Gravis susp Thalasemia', pembiayaan: 'BPJS Non PBI', dari: 'IGD Triage P2', pinru: 'Inden Bangsal', penerima: 'Ns. Ratna Dewi', admisi: 'Hadi Kusuma', jam: '28/11/2026 11:05:00', asal: 'IGD Triage Bed K3' },
  { norm: '05-47-92', name: 'Tn. Rudi Hartono', age: '61 Th', diag: 'STEMI Inferior Post Trombolisis', pembiayaan: 'BPJS PBI', dari: 'IGD Triage P1', pinru: 'Inden Bangsal', penerima: 'Ns. Dian Anggraeni', admisi: 'Dewi Sartika', jam: '28/11/2026 12:00:00', asal: 'IGD Triage Bed K6' }
];

// In-Memory Reactive Store untuk data tempat tidur & pasien bangsal
const WARD_BED_RECORDS = {};

/**
 * Mengambil atau menginisialisasi rekam data tempat tidur per ruangan
 */
function getWardBedRecords(ward) {
  if (!WARD_BED_RECORDS[ward.id]) {
    WARD_BED_RECORDS[ward.id] = {};
    for (let i = 1; i <= ward.total; i++) {
      const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
      let bedClass = 'KL3';
      let classLabel = 'Kelas 3';
      if (i <= Math.max(1, Math.floor(ward.total * 0.1))) {
        bedClass = 'VIP';
        classLabel = 'VIP';
      } else if (i <= Math.floor(ward.total * 0.35)) {
        bedClass = 'KL1';
        classLabel = 'Kelas 1';
      } else if (i <= Math.floor(ward.total * 0.65)) {
        bedClass = 'KL2';
        classLabel = 'Kelas 2';
      }

      let status = 'Tersedia';
      let p = {
        norm: '',
        name: '',
        age: '',
        tglLahir: '',
        jk: 'Laki-laki',
        diag: '',
        tglMrs: '',
        lama: '',
        pembiayaan: 'BPJS PBI',
        dari: '',
        pinru: 'Tidak / Tetap',
        penerima: '',
        admisi: '',
        jam: '00:00:00',
        asal: ''
      };

      if (i <= ward.occupied) {
        const sample = PATIENT_SAMPLES[(i - 1) % PATIENT_SAMPLES.length];
        status = i % 7 === 0 ? 'Rencana PP' : 'Terisi';
        p = {
          norm: sample.norm,
          name: sample.name,
          age: sample.age,
          tglLahir: sample.tglLahir || '',
          jk: sample.jk || (sample.name.startsWith('Ny.') ? 'Perempuan' : 'Laki-laki'),
          diag: sample.diag,
          tglMrs: sample.tglMrs,
          lama: sample.lama,
          pembiayaan: sample.pembiayaan,
          dari: sample.dari,
          pinru: i % 7 === 0 ? 'Rencana Pulang (PP)' : sample.pinru,
          penerima: sample.penerima,
          admisi: sample.admisi,
          jam: sample.jam,
          asal: sample.asal
        };
      } else if (i <= ward.occupied + ward.inden) {
        const indIdx = (i - ward.occupied - 1) % INDEN_SAMPLES.length;
        const ind = INDEN_SAMPLES[indIdx];
        status = 'Inden IGD';
        p = {
          norm: ind.norm,
          name: ind.name,
          age: ind.age,
          tglLahir: ind.tglLahir || '',
          jk: ind.jk || (ind.name.startsWith('Ny.') ? 'Perempuan' : 'Laki-laki'),
          diag: ind.diag,
          tglMrs: '28/11/2026',
          lama: 'Pro MRS',
          pembiayaan: ind.pembiayaan,
          dari: ind.dari,
          pinru: ind.pinru,
          penerima: ind.penerima,
          admisi: ind.admisi,
          jam: ind.jam,
          asal: ind.asal
        };
      }

      WARD_BED_RECORDS[ward.id][bedCode] = {
        no: i,
        bedCode,
        classLabel,
        bedClass,
        status,
        ...p
      };
    }
  }
  return WARD_BED_RECORDS[ward.id];
}

/**
 * Hitung ulang statistik keterisian bed bangsal
 */
function recalculateWardCounts(ward) {
  const beds = Object.values(WARD_BED_RECORDS[ward.id] || {});
  ward.occupied = beds.filter(b => b.status === 'Terisi' || b.status === 'Rencana PP').length;
  ward.inden = beds.filter(b => b.status === 'Inden IGD').length;
  ward.available = Math.max(0, ward.total - ward.occupied - ward.inden);
}

const ADD_PATIENT_MODAL_ID = 'ward-add-patient-modal';
let activeAddPatientWard = null;
let activeAddPatientOnSave = null;

function handleAddPatientModalKey(e) {
  if (e.key === 'Escape') {
    closeAddPatientModal();
  }
}

/**
 * Buka Modal Popup Formulir Input Pasien Baru berdasarkan kolom tabel
 */
export function openAddPatientModal(ward, preselectedBedCode = null, canEdit = true, onSave = null) {
  activeAddPatientWard = ward;
  activeAddPatientOnSave = onSave;

  let modal = document.getElementById(ADD_PATIENT_MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = ADD_PATIENT_MODAL_ID;
    document.body.appendChild(modal);
  }

  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const records = getWardBedRecords(ward);
  const bedList = Object.values(records);
  const todayDate = getTodayDateStr();
  const nowDateTime = getNowDateTimeStr();

  // Susun daftar bed: urutkan bed Tersedia di posisi teratas sebagai rekomendasi
  const sortedBeds = [...bedList].sort((a, b) => {
    if (a.status === 'Tersedia' && b.status !== 'Tersedia') return -1;
    if (a.status !== 'Tersedia' && b.status === 'Tersedia') return 1;
    return a.no - b.no;
  });

  const selectedBed = preselectedBedCode || (sortedBeds.find(b => b.status === 'Tersedia')?.bedCode || sortedBeds[0]?.bedCode);

  const bedOptionsHtml = sortedBeds.map(b => {
    const isAvail = b.status === 'Tersedia';
    const tag = isAvail ? '🟢 [Tersedia / Siap Pakai]' : `🔴 [${b.status}] ${b.name || 'Terisi'}`;
    const isSelected = b.bedCode === selectedBed;
    return `<option value="${b.bedCode}" ${isSelected ? 'selected' : ''}>${b.bedCode} (${b.classLabel}) — ${tag}</option>`;
  }).join('');

  modal.innerHTML = `
    <!-- Dialog Box Utama -->
    <div class="pointer-events-auto flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl font-sans text-slate-800">
      
      <!-- 1. Header Gradient Gelap -->
      <div class="shrink-0 border-b px-4 py-3 border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] text-white flex items-center justify-between gap-3 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]">
        <div class="flex items-center gap-2 min-w-0">
          <span class="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-white tracking-tight">Form Input Pasien Admisi / Rawat Inap</h3>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-slate-200 border border-white/10 hidden sm:inline-block">
                Ruangan: ${ward.name}
              </span>
            </div>
            <p class="text-[11px] text-slate-300 truncate">Input data rekam medis pasien sesuai kolom tabel untuk penempatan kamar</p>
          </div>
        </div>

        <button type="button" id="btn-close-patient-modal" class="shrink-0 rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-200 hover:border-white/35 hover:bg-white/20 hover:text-white transition cursor-pointer" title="Tutup Modal (Esc)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- 2. Formulir Scrollable -->
      <form id="form-modal-patient" class="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/70">
          <div class="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <!-- 1. No. Kamar / Bed (Pilih Bed) -->
              <div class="sm:col-span-2">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  1. No. Kamar / Tempat Tidur <span class="text-rose-500">*</span>
                </label>
                <select id="modal-inp-bed" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-blue-300 bg-blue-50/40 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-blue-900 transition cursor-pointer outline-none shadow-2xs">
                  ${bedOptionsHtml}
                </select>
              </div>

              <!-- 2. No. RM -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    2. No. RM <span class="text-rose-500">*</span>
                  </label>
                  <button type="button" id="btn-generate-rm" class="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer" title="Buat No. RM acak">+ Auto RM</button>
                </div>
                <input type="text" id="modal-inp-norm" placeholder="Contoh: 01-24-89" class="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-blue-900 transition outline-none" />
              </div>

              <!-- 15. Status Keterisian Bed -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  15. Status Keterisian Bed
                </label>
                <select id="modal-inp-status" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition cursor-pointer outline-none">
                  <option value="Terisi">Terisi (Aktif Dirawat)</option>
                  <option value="Inden IGD">Inden IGD</option>
                  <option value="Rencana PP">Rencana Pulang (PP)</option>
                </select>
              </div>

              <!-- 3. Nama Lengkap Pasien -->
              <div class="sm:col-span-2">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  3. Nama Lengkap Pasien <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="modal-inp-name" placeholder="Nama lengkap sesuai identitas KTP/BPJS..." class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 transition outline-none" />
              </div>

              <!-- Tanggal Lahir (Bisa Paste, Otomatis Mengisi Usia) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Tanggal Lahir
                  </label>
                  <span class="text-[9px] text-blue-600 font-bold">(Bisa Paste)</span>
                </div>
                <input type="text" id="modal-inp-tgl-lahir" placeholder="DD/MM/YYYY" class="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 4. Usia / Umur (Readonly / Auto dari Tanggal Lahir) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    4. Usia / Umur
                  </label>
                  <span class="text-[9px] text-emerald-600 font-bold">Auto</span>
                </div>
                <input type="text" id="modal-inp-age" readonly placeholder="Otomatis dari Tgl Lahir" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed outline-none select-none" />
              </div>

              <!-- Jenis Kelamin -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Jenis Kelamin
                </label>
                <select id="modal-inp-jk" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition cursor-pointer outline-none">
                  <option value="Laki-laki">Laki-laki (L)</option>
                  <option value="Perempuan">Perempuan (P)</option>
                </select>
              </div>

              <!-- 5. Diagnosa Medis -->
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  5. Diagnosa Medis <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="modal-inp-diag" placeholder="Contoh: Dyspepsia Syndrome + HT Gr. II" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 6. Tanggal MRS -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  6. Tanggal MRS
                </label>
                <input type="text" id="modal-inp-tgl-mrs" value="${todayDate}" placeholder="DD/MM/YYYY" class="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 7. Lama MRS -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  7. Lama MRS
                </label>
                <input type="text" id="modal-inp-lama" value="1 Hari" placeholder="Contoh: 1 Hari" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 8. Pembiayaan -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  8. Pembiayaan
                </label>
                <select id="modal-inp-pembiayaan" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition cursor-pointer outline-none">
                  <option value="BPJS PBI">BPJS PBI</option>
                  <option value="BPJS Non PBI">BPJS Mandiri (Non PBI)</option>
                  <option value="Jamkesda Sby">Jamkesda Surabaya</option>
                  <option value="Umum">Umum / Biaya Sendiri</option>
                  <option value="Asuransi Lain">Asuransi Swasta</option>
                </select>
              </div>

              <!-- 9. Dari (Unit Asal) -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  9. Dari (Unit Asal)
                </label>
                <input type="text" id="modal-inp-dari" value="IGD P1" placeholder="Contoh: IGD P1 / Poli Jantung" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 10. Rencana PINRU -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  10. Rencana PINRU
                </label>
                <select id="modal-inp-pinru" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition cursor-pointer outline-none">
                  <option value="Tidak / Tetap">Tidak / Tetap (Lanjut Rawat)</option>
                  <option value="Rencana Pulang (PP)">Rencana Pulang (PP)</option>
                  <option value="Rencana ICU">Rencana Pindah ICU</option>
                  <option value="Pindah Teratai">Pindah Teratai</option>
                  <option value="Pindah Dahlia">Pindah Dahlia</option>
                  <option value="Rencana Bedah">Rencana Bedah</option>
                </select>
              </div>

              <!-- 11. Penerima Inden -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  11. Penerima Inden
                </label>
                <input type="text" id="modal-inp-penerima" placeholder="Nama perawat penerima..." class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 12. Petugas ADMISI -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  12. Petugas ADMISI
                </label>
                <input type="text" id="modal-inp-admisi" placeholder="Nama petugas admisi..." class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 13. Tanggal dan Jam 0:0:0 -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  13. Tanggal &amp; Jam Admisi
                </label>
                <input type="text" id="modal-inp-jam" value="${nowDateTime}" placeholder="DD/MM/YYYY HH:mm:ss" class="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>

              <!-- 14. Asal Inden -->
              <div class="sm:col-span-2 lg:col-span-4">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  14. Asal Inden Spesifik
                </label>
                <input type="text" id="modal-inp-asal" placeholder="Contoh: IGD Triage Bed K1 / Poli Spesialis Rawat Jalan" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none" />
              </div>
            </div>

          </div>
        </div>

        <!-- 3. Footer Action Buttons -->
        <div class="shrink-0 px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span class="text-[11px] text-slate-500 font-medium">
            Data tersimpan otomatis &amp; tersinkron langsung ke baris tabel bed.
          </span>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-modal-reset" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer">
              Reset Form
            </button>
            <button type="button" id="btn-modal-cancel" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer">
              Batal
            </button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Simpan Pasien ke Bed
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  bindAddPatientModalEvents(modal, ward, selectedBed);
  window.addEventListener('keydown', handleAddPatientModalKey);
}

export function closeAddPatientModal() {
  const modal = document.getElementById(ADD_PATIENT_MODAL_ID);
  if (modal) {
    modal.className = 'hidden';
    modal.innerHTML = '';
  }
  window.removeEventListener('keydown', handleAddPatientModalKey);
  activeAddPatientWard = null;
  activeAddPatientOnSave = null;
}

/**
 * Hubungkan event listeners untuk Modal Popup Input Pasien
 */
function bindAddPatientModalEvents(modal, ward, initialBedCode) {
  const form = modal.querySelector('#form-modal-patient');
  if (!form) return;

  const populateBedData = (bedCode) => {
    const records = getWardBedRecords(ward);
    const r = records[bedCode];
    if (r && r.status !== 'Tersedia' && r.name) {
      form.querySelector('#modal-inp-norm').value = r.norm || '';
      form.querySelector('#modal-inp-name').value = r.name || '';
      form.querySelector('#modal-inp-tgl-lahir').value = r.tglLahir || '';
      form.querySelector('#modal-inp-age').value = r.age || '';
      form.querySelector('#modal-inp-jk').value = r.jk || 'Laki-laki';
      form.querySelector('#modal-inp-diag').value = r.diag || '';
      form.querySelector('#modal-inp-tgl-mrs').value = r.tglMrs || getTodayDateStr();
      form.querySelector('#modal-inp-lama').value = r.lama || '1 Hari';
      form.querySelector('#modal-inp-pembiayaan').value = r.pembiayaan || 'BPJS PBI';
      form.querySelector('#modal-inp-dari').value = r.dari || 'IGD P1';
      form.querySelector('#modal-inp-pinru').value = r.pinru || 'Tidak / Tetap';
      form.querySelector('#modal-inp-penerima').value = r.penerima || '';
      form.querySelector('#modal-inp-admisi').value = r.admisi || '';
      form.querySelector('#modal-inp-jam').value = r.jam || getNowDateTimeStr();
      form.querySelector('#modal-inp-asal').value = r.asal || '';
      form.querySelector('#modal-inp-status').value = r.status || 'Terisi';
    } else {
      form.querySelector('#modal-inp-norm').value = '';
      form.querySelector('#modal-inp-name').value = '';
      form.querySelector('#modal-inp-tgl-lahir').value = '';
      form.querySelector('#modal-inp-age').value = '';
      form.querySelector('#modal-inp-jk').value = 'Laki-laki';
      form.querySelector('#modal-inp-diag').value = '';
      form.querySelector('#modal-inp-status').value = 'Terisi';
    }
  };

  // Inisialisasi awal bed terpilih
  if (initialBedCode) {
    populateBedData(initialBedCode);
  }

  // Auto-hitung Usia saat Tanggal Lahir diketik atau di-paste
  const tglLahirInp = form.querySelector('#modal-inp-tgl-lahir');
  const ageInp = form.querySelector('#modal-inp-age');

  const syncAgeFromTglLahir = (rawVal) => {
    const parsed = calculateAgeFromBirthDate(rawVal);
    if (parsed) {
      if (ageInp) ageInp.value = parsed.ageText;
    }
  };

  tglLahirInp?.addEventListener('input', (e) => {
    syncAgeFromTglLahir(e.target.value);
  });

  tglLahirInp?.addEventListener('paste', () => {
    setTimeout(() => {
      if (tglLahirInp) {
        const parsed = calculateAgeFromBirthDate(tglLahirInp.value);
        if (parsed) {
          tglLahirInp.value = parsed.display;
          if (ageInp) ageInp.value = parsed.ageText;
          showToast(`Usia otomatis terisi: ${parsed.ageText}`, 'info');
        }
      }
    }, 10);
  });

  // Tombol Tutup & Batal
  modal.querySelector('#btn-close-patient-modal')?.addEventListener('click', closeAddPatientModal);
  modal.querySelector('#btn-modal-cancel')?.addEventListener('click', closeAddPatientModal);

  // Klik backdrop luar untuk menutup
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAddPatientModal();
    }
  });

  // Tombol Auto Generate No. RM
  modal.querySelector('#btn-generate-rm')?.addEventListener('click', () => {
    const generated = `02-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`;
    const normInp = form.querySelector('#modal-inp-norm');
    if (normInp) normInp.value = generated;
    showToast(`No. RM dibuat otomatis: ${generated}`, 'info');
  });

  // Tombol Reset Form
  modal.querySelector('#btn-modal-reset')?.addEventListener('click', () => {
    form.reset();
    form.querySelector('#modal-inp-tgl-mrs').value = getTodayDateStr();
    form.querySelector('#modal-inp-lama').value = '1 Hari';
    form.querySelector('#modal-inp-dari').value = 'IGD P1';
    form.querySelector('#modal-inp-jam').value = getNowDateTimeStr();
  });

  // Event saat pilihan nomor bed diubah
  const bedSelect = form.querySelector('#modal-inp-bed');
  bedSelect?.addEventListener('change', () => {
    populateBedData(bedSelect.value);
  });

  // Submit Formulir Modal
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bedCode = form.querySelector('#modal-inp-bed')?.value;
    const name = form.querySelector('#modal-inp-name')?.value.trim();
    let norm = form.querySelector('#modal-inp-norm')?.value.trim();
    const diag = form.querySelector('#modal-inp-diag')?.value.trim();

    if (!bedCode) {
      showToast('Silakan pilih nomor kamar / tempat tidur.', 'warn');
      return;
    }
    if (!name) {
      showToast('Silakan isi nama lengkap pasien.', 'warn');
      form.querySelector('#modal-inp-name')?.focus();
      return;
    }

    if (!norm) {
      norm = `02-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`;
    }

    const records = getWardBedRecords(ward);
    const r = records[bedCode];
    if (!r) {
      showToast('Nomor bed tidak ditemukan.', 'error');
      return;
    }

    r.norm = norm;
    r.name = name;
    r.tglLahir = form.querySelector('#modal-inp-tgl-lahir')?.value.trim() || '';
    r.age = form.querySelector('#modal-inp-age')?.value.trim() || '—';
    r.jk = form.querySelector('#modal-inp-jk')?.value || 'Laki-laki';
    r.diag = diag || 'Observasi Medis Lanjutan';
    r.tglMrs = form.querySelector('#modal-inp-tgl-mrs')?.value.trim() || getTodayDateStr();
    r.lama = form.querySelector('#modal-inp-lama')?.value.trim() || '1 Hari';
    r.pembiayaan = form.querySelector('#modal-inp-pembiayaan')?.value || 'BPJS PBI';
    r.dari = form.querySelector('#modal-inp-dari')?.value.trim() || 'IGD P1';
    r.pinru = form.querySelector('#modal-inp-pinru')?.value || 'Tidak / Tetap';
    r.penerima = form.querySelector('#modal-inp-penerima')?.value.trim() || '';
    r.admisi = form.querySelector('#modal-inp-admisi')?.value.trim() || '';
    r.jam = form.querySelector('#modal-inp-jam')?.value.trim() || getNowDateTimeStr();
    r.asal = form.querySelector('#modal-inp-asal')?.value.trim() || '';
    r.status = form.querySelector('#modal-inp-status')?.value || 'Terisi';

    recalculateWardCounts(ward);

    const conn = getConnectionState();
    if (conn.isConnected) {
      await updateBedStatusDb(r.bedCode, 'occupied', appState.currentNip, appState.currentRole, {
        bed_code: r.bedCode,
        ward: ward.id,
        patient_name: r.name,
        diagnosis: r.diag,
        norm: r.norm,
        class_type: r.bedClass
      });
    }

    showToast(`Data pasien ${name} berhasil disimpan ke kamar ${bedCode}.`, 'success');

    if (typeof activeAddPatientOnSave === 'function') {
      activeAddPatientOnSave(r);
    }

    closeAddPatientModal();
  });
}

/**
 * Renderer Bangsal Rawat Inap Reguler (Dahlia, Mawar, Melati, Teratai, Seruni, dll)
 * Format Tabel dengan Kolom "Nama Pasien" Floating (Freeze Pane), Dropdown Status Bed,
 * Icon Hapus Pasien, dan Dukungan Edit Inline di Seluruh Kolom.
 */
export function renderStandardWard(ward, container, canEdit, meta) {
  container.className = 'space-y-4';
  container.innerHTML = '';

  // Inisialisasi rekam data tempat tidur
  getWardBedRecords(ward);

  // 1. Bilah Kontrol: Filter Kelas, Tombol Modal Input Pasien (Kiri), Pencarian Pasien, Ringkasan Status & Toggle View
  const controlBar = document.createElement('div');
  controlBar.className = 'bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3';
  controlBar.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Filter Kelas Perawatan -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs font-bold text-slate-500 mr-1">Filter Kelas:</span>
        <button type="button" data-filter="ALL" class="btn-class-filter px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeClassFilter === 'ALL' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Semua</button>
        <button type="button" data-filter="VIP" class="btn-class-filter px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeClassFilter === 'VIP' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">VIP</button>
        <button type="button" data-filter="KL1" class="btn-class-filter px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeClassFilter === 'KL1' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Kelas 1</button>
        <button type="button" data-filter="KL2" class="btn-class-filter px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeClassFilter === 'KL2' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Kelas 2</button>
        <button type="button" data-filter="KL3" class="btn-class-filter px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeClassFilter === 'KL3' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Kelas 3</button>
      </div>

      <!-- Mode Tampilan: Tabel vs Grid -->
      <div class="flex items-center gap-2">
        <div class="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1 text-xs font-bold">
          <button type="button" id="btn-view-table" class="px-3 py-1 rounded-lg transition ${activeViewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
            Tabel Pasien
          </button>
          <button type="button" id="btn-view-grid" class="px-3 py-1 rounded-lg transition ${activeViewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
            Grid Bed
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
      <!-- Input Cari Pasien & Tombol Input Pasien Baru di Sebelah Kiri -->
      <div class="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-xl">
        ${canEdit ? `
          <button type="button" id="btn-open-add-patient-modal" class="shrink-0 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer" title="Buka Form Modal Input Pasien">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>Input Pasien Baru</span>
          </button>
        ` : ''}

        <!-- Bilah Pencarian -->
        <div class="relative flex-1">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="ward-patient-search" value="${patientSearchQuery}" placeholder="Cari nama pasien, diagnosa, kamar..." class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
      </div>

      <!-- Indikator Status Warna -->
      <div class="flex items-center gap-3 text-xs font-semibold text-slate-500 flex-wrap">
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Tersedia</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Terisi</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Inden IGD</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Rencana PP</span>
      </div>
    </div>
  `;
  container.appendChild(controlBar);

  // Event handler filter kelas
  controlBar.querySelectorAll('.btn-class-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      activeClassFilter = btn.dataset.filter;
      renderStandardWard(ward, container, canEdit, meta);
    });
  });

  // Event handler view toggle
  controlBar.querySelector('#btn-view-table')?.addEventListener('click', () => {
    activeViewMode = 'table';
    renderStandardWard(ward, container, canEdit, meta);
  });
  controlBar.querySelector('#btn-view-grid')?.addEventListener('click', () => {
    activeViewMode = 'grid';
    renderStandardWard(ward, container, canEdit, meta);
  });

  // Event handler pencarian
  const searchInput = controlBar.querySelector('#ward-patient-search');
  searchInput?.addEventListener('input', (e) => {
    patientSearchQuery = e.target.value.toLowerCase().trim();
    renderFilteredBody(ward, container, canEdit, meta);
  });

  // Event handler tombol buka modal input pasien baru
  if (canEdit) {
    controlBar.querySelector('#btn-open-add-patient-modal')?.addEventListener('click', () => {
      openAddPatientModal(ward, null, canEdit, () => {
        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    });
  }

  // Kontainer utama konten
  const mainContentWrapper = document.createElement('div');
  mainContentWrapper.id = 'ward-content-display';
  container.appendChild(mainContentWrapper);

  renderFilteredBody(ward, container, canEdit, meta);
}

/**
 * Filter data dan panggil renderer tabel atau grid
 */
function renderFilteredBody(ward, container, canEdit, meta) {
  const wrapper = document.getElementById('ward-content-display');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const records = getWardBedRecords(ward);
  const rows = [];

  for (let i = 1; i <= ward.total; i++) {
    const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
    const r = records[bedCode];
    if (!r) continue;

    if (activeClassFilter !== 'ALL' && activeClassFilter !== r.bedClass) {
      continue;
    }

    if (patientSearchQuery) {
      const match = (r.norm || '').toLowerCase().includes(patientSearchQuery) ||
                    (r.name || '').toLowerCase().includes(patientSearchQuery) ||
                    (r.diag || '').toLowerCase().includes(patientSearchQuery) ||
                    (r.bedCode || '').toLowerCase().includes(patientSearchQuery) ||
                    (r.pembiayaan || '').toLowerCase().includes(patientSearchQuery) ||
                    (r.asal || '').toLowerCase().includes(patientSearchQuery);
      if (!match) continue;
    }

    rows.push(r);
  }

  if (rows.length === 0) {
    wrapper.className = 'w-full py-12 text-center text-slate-400 text-xs font-semibold bg-white rounded-2xl border border-slate-200 shadow-2xs';
    wrapper.innerHTML = `
      <div class="space-y-1">
        <p class="font-bold text-slate-600 text-sm">Tidak Ada Data Ditemukan</p>
        <p>Silakan sesuaikan filter kelas atau kata kunci pencarian Anda.</p>
      </div>
    `;
    return;
  }

  if (activeViewMode === 'table') {
    renderTableView(rows, wrapper, ward, container, canEdit, meta);
  } else {
    renderGridView(rows, wrapper, ward, container, canEdit, meta);
  }
}

/**
 * Render Tabel Pasien dengan Edit Inline di Semua Kolom, Dropdown Status,
 * dan Icon Hapus Pasien (Floating Nama Pasien tetap aktif)
 */
function renderTableView(rows, wrapper, ward, container, canEdit, meta) {
  const isPublic = appState.currentRole === 'public_display';

  const tableCard = document.createElement('div');
  tableCard.className = 'bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden';

  tableCard.innerHTML = `
    <!-- Header Petunjuk Floating & Edit Inline -->
    <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px]">
          <svg class="w-3 h-3 text-blue-700" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          Edit Inline Aktif
        </span>
        <span class="font-bold text-slate-700">
          Klik sel mana saja untuk mengubah data secara langsung. Kolom <strong>Nama Pasien</strong> tetap menetap (*floating*) saat digeser ke kanan.
        </span>
      </div>
      <span class="font-semibold text-slate-500">Menampilkan ${rows.length} Tempat Tidur</span>
    </div>

    <!-- Container Table Scrollable Horizontal & Vertical -->
    <div class="overflow-x-auto max-h-[660px] overflow-y-auto no-scrollbar relative">
      <table class="w-full text-left border-collapse min-w-[2350px] text-xs">
        <thead class="sticky top-0 z-30 bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 shadow-2xs whitespace-nowrap">
          <tr>
            <!-- Kolom 1: No (Sticky Left: 0) -->
            <th class="py-3 px-2 text-center sticky left-0 z-40 bg-slate-100 w-12 min-w-[48px] max-w-[48px] border-r border-slate-200 whitespace-nowrap">No</th>

            <!-- Kolom 2: No. Kamar (Sticky Left: 48px) -->
            <th class="py-3 px-3 text-left sticky left-[48px] z-40 bg-slate-100 w-[130px] min-w-[130px] max-w-[130px] border-r border-slate-200 whitespace-nowrap">No. Kamar</th>

            <!-- Kolom 3: No. RM (Sticky Left: 178px - Klik untuk Drawer Detail & Rekam Pasien) -->
            <th class="py-3 px-2 text-center sticky left-[178px] z-40 bg-slate-100 w-[120px] min-w-[120px] max-w-[120px] border-r border-slate-200 whitespace-nowrap" title="Klik nomor RM untuk membuka Drawer Detail &amp; Edit Pasien">
              <span class="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                No. RM
                <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </span>
            </th>

            <!-- Kolom 4: Nama Pasien (Floating / Sticky Left: 298px) -->
            <th class="py-3 px-3.5 sticky left-[298px] z-40 bg-slate-100 w-[240px] min-w-[240px] border-r-2 border-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] whitespace-nowrap">
              Nama Pasien
            </th>

            <!-- Kolom 5 s.d 15: Scrollable Normal ke Kanan -->
            <th class="py-3 px-2 text-center min-w-[75px] whitespace-nowrap">Usia</th>
            <th class="py-3 px-3.5 min-w-[260px] whitespace-nowrap">Diagnosa Medis</th>
            <th class="py-3 px-2 text-center min-w-[110px] whitespace-nowrap">Tgl MRS</th>
            <th class="py-3 px-2 text-center min-w-[95px] whitespace-nowrap">Lama MRS</th>
            <th class="py-3 px-3 min-w-[145px] whitespace-nowrap">Pembiayaan</th>
            <th class="py-3 px-3 min-w-[130px] whitespace-nowrap">Dari</th>
            <th class="py-3 px-3 min-w-[175px] whitespace-nowrap">Rencana PINRU</th>
            <th class="py-3 px-3 min-w-[170px] whitespace-nowrap">Penerima Inden</th>
            <th class="py-3 px-3 min-w-[150px] whitespace-nowrap">Petugas ADMISI</th>
            <th class="py-3 px-3 min-w-[175px] text-center whitespace-nowrap">Tanggal dan Jam 0:0:0</th>
            <th class="py-3 px-3 min-w-[160px] whitespace-nowrap">Asal Inden</th>

            <!-- Kolom 16: Status Bed & Aksi Hapus (Sticky Right) -->
            <th class="py-3 px-3 text-center min-w-[175px] w-[175px] sticky right-0 z-40 bg-slate-100 border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
              Status &amp; Aksi
            </th>
          </tr>
        </thead>
        <tbody id="ward-patient-table-tbody" class="divide-y divide-slate-100 font-medium"></tbody>
      </table>
    </div>
  `;

  wrapper.appendChild(tableCard);

  const tbody = tableCard.querySelector('#ward-patient-table-tbody');
  rows.forEach((r) => {
    const isOccupied = r.status === 'Terisi';
    const isInden = r.status === 'Inden IGD';
    const isRencanaPp = r.status === 'Rencana PP';
    const isAvailable = r.status === 'Tersedia';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-blue-50/50 group transition duration-75';

    // Warna status select dropdown
    let statusSelectClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500/20';
    if (isOccupied) {
      statusSelectClass = 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-500/20';
    } else if (isInden) {
      statusSelectClass = 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500/20';
    } else if (isRencanaPp) {
      statusSelectClass = 'bg-sky-50 text-sky-800 border-sky-300 focus:ring-sky-500/20';
    }

    const inputBaseClass = canEdit
      ? 'w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-md px-1.5 py-1 text-xs transition font-semibold text-slate-800 whitespace-nowrap'
      : 'w-full bg-transparent border-0 px-1.5 py-1 text-xs text-slate-800 cursor-default whitespace-nowrap';

    const displayName = isPublic ? 'Pasien Anonim (***)' : (r.name || '');
    const displayDiag = isPublic ? 'Diagnosa Terlindungi (Privasi)' : (r.diag || '');

    tr.innerHTML = `
      <!-- 1. No (Sticky Left: 0) -->
      <td class="py-2.5 px-2 text-center sticky left-0 z-20 bg-white group-hover:bg-blue-50 transition border-r border-slate-200/80 font-bold text-slate-500 w-12 min-w-[48px] max-w-[48px] whitespace-nowrap">
        ${r.no}
      </td>

      <!-- 2. No. Kamar (Sticky Left: 48px) -->
      <td class="py-2.5 px-3 sticky left-[48px] z-20 bg-white group-hover:bg-blue-50 transition border-r border-slate-200/80 w-[130px] min-w-[130px] max-w-[130px] whitespace-nowrap">
        <span class="font-extrabold text-slate-900 block leading-tight whitespace-nowrap">${r.bedCode}</span>
        <span class="text-[10px] text-slate-400 font-bold uppercase block whitespace-nowrap">${r.classLabel}</span>
      </td>

      <!-- 3. No. RM (Sticky Left: 178px - Klik untuk Drawer Detail & Rekam Pasien) -->
      <td class="py-2 px-2 text-center sticky left-[178px] z-20 bg-white group-hover:bg-blue-50 transition border-r border-slate-200/80 font-mono text-[11px] font-bold text-slate-700 w-[120px] min-w-[120px] max-w-[120px] whitespace-nowrap">
        ${isPublic ? '***-***' : (
          r.norm
            ? `<button type="button" class="btn-open-patient-drawer px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 hover:border-blue-300 transition font-mono font-bold tracking-tight shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer mx-auto group/rm whitespace-nowrap" title="Klik untuk Buka Detail &amp; Edit Pasien">
                 <span class="whitespace-nowrap tracking-normal">${r.norm}</span>
                 <svg class="w-3 h-3 opacity-50 group-hover/rm:opacity-100 transition text-blue-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
               </button>`
            : `<button type="button" class="btn-open-add-patient-modal-row px-2.5 py-0.5 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-slate-200 hover:border-blue-300 transition cursor-pointer text-[10px] font-bold whitespace-nowrap" title="Input Data Pasien ke Bed Ini">+ RM</button>`
        )}
      </td>

      <!-- 4. Nama Pasien (Floating / Sticky Left: 298px) -->
      <td class="py-2.5 px-3 sticky left-[298px] z-20 bg-white group-hover:bg-blue-50 transition border-r-2 border-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] w-[240px] min-w-[240px] whitespace-nowrap">
        <div class="flex items-center gap-2 min-w-[210px] whitespace-nowrap">
          <span class="w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-rose-500' : isInden ? 'bg-amber-500' : isRencanaPp ? 'bg-sky-500' : 'bg-emerald-500'} shrink-0"></span>
          <input type="text" data-field="name" value="${displayName}" ${!canEdit ? 'readonly' : ''} placeholder="— Tempat Tidur Kosong —" class="${inputBaseClass} font-bold ${isAvailable ? 'text-slate-400 italic font-normal' : 'text-slate-900'} whitespace-nowrap" />
        </div>
      </td>

      <!-- 5. Usia (Readonly / Auto dari Tgl Lahir) -->
      <td class="py-2.5 px-1.5 text-center min-w-[75px] whitespace-nowrap">
        <input type="text" data-field="age" value="${r.age || ''}" readonly placeholder="—" class="${inputBaseClass} text-center cursor-default bg-slate-50/70 text-slate-600 font-semibold select-none" title="Otomatis dari Tanggal Lahir" />
      </td>

      <!-- 6. Diagnosa Medis -->
      <td class="py-2.5 px-2 min-w-[260px] whitespace-nowrap">
        <input type="text" data-field="diag" value="${displayDiag}" ${!canEdit ? 'readonly' : ''} placeholder="Diagnosa medis..." class="${inputBaseClass}" />
      </td>

      <!-- 7. Tgl MRS -->
      <td class="py-2.5 px-1.5 text-center min-w-[110px] whitespace-nowrap">
        <input type="text" data-field="tglMrs" value="${r.tglMrs || ''}" ${!canEdit ? 'readonly' : ''} placeholder="DD/MM/YYYY" class="${inputBaseClass} text-center font-mono text-[11px]" />
      </td>

      <!-- 8. Lama MRS -->
      <td class="py-2.5 px-1.5 text-center min-w-[95px] whitespace-nowrap">
        <input type="text" data-field="lama" value="${r.lama || ''}" ${!canEdit ? 'readonly' : ''} placeholder="X Hari" class="${inputBaseClass} text-center text-[11px]" />
      </td>

      <!-- 9. Pembiyaan -->
      <td class="py-2.5 px-2 min-w-[145px] whitespace-nowrap">
        ${canEdit ? `
          <select data-field="pembiayaan" class="w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-600 rounded-md px-1.5 py-1 text-xs font-bold text-slate-800 transition cursor-pointer whitespace-nowrap">
            <option value="BPJS PBI" ${r.pembiayaan === 'BPJS PBI' ? 'selected' : ''}>BPJS PBI</option>
            <option value="BPJS Non PBI" ${r.pembiayaan === 'BPJS Non PBI' ? 'selected' : ''}>BPJS Mandiri</option>
            <option value="Jamkesda Sby" ${r.pembiayaan === 'Jamkesda Sby' ? 'selected' : ''}>Jamkesda</option>
            <option value="Umum" ${r.pembiayaan === 'Umum' ? 'selected' : ''}>Umum</option>
          </select>
        ` : `<span class="px-1.5 py-0.5 text-xs font-semibold text-slate-700 whitespace-nowrap">${r.pembiayaan || '—'}</span>`}
      </td>

      <!-- 10. Dari -->
      <td class="py-2.5 px-2 min-w-[130px] whitespace-nowrap">
        <input type="text" data-field="dari" value="${r.dari || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Asal unit..." class="${inputBaseClass}" />
      </td>

      <!-- 11. Rencana PINRU -->
      <td class="py-2.5 px-2 min-w-[175px] whitespace-nowrap">
        ${canEdit ? `
          <select data-field="pinru" class="w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-600 rounded-md px-1.5 py-1 text-xs font-bold text-slate-800 transition cursor-pointer whitespace-nowrap">
            <option value="Tidak / Tetap" ${r.pinru === 'Tidak / Tetap' ? 'selected' : ''}>Tidak / Tetap</option>
            <option value="Rencana Pulang (PP)" ${r.pinru === 'Rencana Pulang (PP)' ? 'selected' : ''}>Rencana Pulang (PP)</option>
            <option value="Rencana ICU" ${r.pinru === 'Rencana ICU' ? 'selected' : ''}>Rencana ICU</option>
            <option value="Pindah Teratai" ${r.pinru === 'Pindah Teratai' ? 'selected' : ''}>Pindah Teratai</option>
            <option value="Pindah Dahlia" ${r.pinru === 'Pindah Dahlia' ? 'selected' : ''}>Pindah Dahlia</option>
            <option value="Rencana Bedah" ${r.pinru === 'Rencana Bedah' ? 'selected' : ''}>Rencana Bedah</option>
          </select>
        ` : `<span class="px-1.5 py-0.5 text-xs font-semibold text-slate-700 whitespace-nowrap">${r.pinru || '—'}</span>`}
      </td>

      <!-- 12. Penerima Inden -->
      <td class="py-2.5 px-2 min-w-[170px] whitespace-nowrap">
        <input type="text" data-field="penerima" value="${r.penerima || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama penerima..." class="${inputBaseClass}" />
      </td>

      <!-- 13. Petugas ADMISI -->
      <td class="py-2.5 px-2 min-w-[150px] whitespace-nowrap">
        <input type="text" data-field="admisi" value="${r.admisi || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Petugas admisi..." class="${inputBaseClass}" />
      </td>

      <!-- 14. Tanggal dan Jam 0:0:0 -->
      <td class="py-2.5 px-2 min-w-[175px] text-center whitespace-nowrap">
        <input type="text" data-field="jam" value="${r.jam || '00:00:00'}" ${!canEdit ? 'readonly' : ''} placeholder="DD/MM/YYYY HH:mm:ss" class="${inputBaseClass} font-mono text-[11px] text-center" />
      </td>

      <!-- 15. Asal Inden -->
      <td class="py-2.5 px-2 min-w-[160px] whitespace-nowrap">
        <input type="text" data-field="asal" value="${r.asal || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Asal inden..." class="${inputBaseClass}" />
      </td>

      <!-- 16. Dropdown Status & Icon Hapus (Sticky Right) -->
      <td class="py-2.5 px-3 text-center sticky right-0 z-30 bg-white group-hover:bg-blue-50 transition border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.06)] min-w-[175px] w-[175px] whitespace-nowrap">
        ${canEdit ? `
          <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <!-- Dropdown Status Bed Interaktif -->
            <select class="field-status-select px-2 py-1 rounded-lg text-[11px] font-bold border transition shadow-2xs focus:outline-none focus:ring-2 cursor-pointer ${statusSelectClass} whitespace-nowrap">
              <option value="Tersedia" ${r.status === 'Tersedia' ? 'selected' : ''}>Tersedia</option>
              <option value="Terisi" ${r.status === 'Terisi' ? 'selected' : ''}>Terisi</option>
              <option value="Inden IGD" ${r.status === 'Inden IGD' ? 'selected' : ''}>Inden IGD</option>
              <option value="Rencana PP" ${r.status === 'Rencana PP' ? 'selected' : ''}>Rencana PP</option>
            </select>

            <!-- Icon Hapus Pasien / Kosongkan Bed -->
            <button type="button" class="btn-clear-patient p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition shrink-0" title="Kosongkan Bed &amp; Hapus Data Pasien">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        ` : `
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${statusSelectClass} whitespace-nowrap inline-block">
            ${r.status}
          </span>
        `}
      </td>
    `;

    if (canEdit) {
      // 1. Event listener edit inline untuk semua kolom input & select
      tr.querySelectorAll('input[data-field], select[data-field]').forEach(input => {
        input.addEventListener('change', async (e) => {
          const field = e.target.dataset.field;
          const val = e.target.value.trim();
          r[field] = val;

          // Jika petugas mengisi nama pasien di bed yang tadinya Tersedia, otomatis ubah status ke Terisi
          if (field === 'name' && val && r.status === 'Tersedia') {
            r.status = 'Terisi';
            if (!r.norm) {
              r.norm = `02-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`;
            }
            recalculateWardCounts(ward);
            renderFilteredBody(ward, container, canEdit, meta);
            updateWardHud(ward.id);
            renderSidebarWards();
          }

          showToast(`Data ${r.bedCode} diperbarui (${field}).`, 'info');

          // Sinkronisasi status bed jika terhubung Supabase
          const conn = getConnectionState();
          if (conn.isConnected) {
            await updateBedStatusDb(r.bedCode, r.status === 'Tersedia' ? 'available' : 'occupied', appState.currentNip, appState.currentRole, {
              bed_code: r.bedCode,
              ward: ward.id,
              patient_name: r.name,
              diagnosis: r.diag,
              class_type: r.bedClass
            });
          }
        });
      });

      // 2. Event listener dropdown ubah status bed
      const statusSelect = tr.querySelector('.field-status-select');
      statusSelect?.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        r.status = newStatus;

        // Jika diubah ke Tersedia, kosongkan nama jika konfirmasi
        if (newStatus === 'Tersedia' && r.name) {
          r.norm = '';
          r.name = '';
          r.diag = '';
          r.age = '';
          r.tglLahir = '';
          r.lama = '';
        }

        recalculateWardCounts(ward);

        const conn = getConnectionState();
        if (conn.isConnected) {
          showToast(`Menyimpan perubahan status ${r.bedCode} ke Supabase...`);
          await updateBedStatusDb(r.bedCode, newStatus === 'Tersedia' ? 'available' : 'occupied', appState.currentNip, appState.currentRole, {
            bed_code: r.bedCode,
            ward: ward.id,
            status: newStatus,
            class_type: r.bedClass
          });
        }
        showToast(`Status Bed ${r.bedCode} diubah menjadi: ${newStatus}`, 'success');

        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });

      // 3. Event listener icon hapus / kosongkan bed
      const clearBtn = tr.querySelector('.btn-clear-patient');
      clearBtn?.addEventListener('click', async () => {
        r.norm = '';
        r.name = '';
        r.age = '';
        r.tglLahir = '';
        r.jk = 'Laki-laki';
        r.diag = '';
        r.tglMrs = '';
        r.lama = '';
        r.pembiayaan = 'BPJS PBI';
        r.dari = '';
        r.pinru = 'Tidak / Tetap';
        r.penerima = '';
        r.admisi = '';
        r.jam = '00:00:00';
        r.asal = '';
        r.status = 'Tersedia';

        recalculateWardCounts(ward);

        const conn = getConnectionState();
        if (conn.isConnected) {
          await updateBedStatusDb(r.bedCode, 'available', appState.currentNip, appState.currentRole, {
            bed_code: r.bedCode,
            ward: ward.id,
            action: 'CLEAR_PATIENT'
          });
        }

        showToast(`Data pasien pada bed ${r.bedCode} berhasil dihapus & bed kini Tersedia.`, 'success');

        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    }

    // Klik No. RM untuk membuka Drawer Detail & Rekam Pasien (Model TindakanDetailDrawer)
    tr.querySelector('.btn-open-patient-drawer')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPatientDrawer(ward, r, canEdit, () => {
        recalculateWardCounts(ward);
        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    });

    // Klik + RM pada bed kosong untuk membuka Modal Input Pasien Baru
    tr.querySelector('.btn-open-add-patient-modal-row')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddPatientModal(ward, r.bedCode, canEdit, () => {
        recalculateWardCounts(ward);
        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    });

    tbody.appendChild(tr);
  });
}

/**
 * Render Tampilan Grid Card (Opsional jika pengguna beralih mode)
 */
function renderGridView(rows, wrapper, ward, container, canEdit, meta) {
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3';
  wrapper.appendChild(grid);

  rows.forEach(r => {
    let statusStyle = 'bg-emerald-50 border-emerald-200/90 text-emerald-800';
    let dotColor = 'bg-emerald-500';

    if (r.status === 'Terisi') {
      statusStyle = 'bg-rose-50 border-rose-200/90 text-rose-800';
      dotColor = 'bg-rose-500';
    } else if (r.status === 'Rencana PP') {
      statusStyle = 'bg-sky-50 border-sky-200 text-sky-800';
      dotColor = 'bg-sky-500';
    } else if (r.status === 'Inden IGD') {
      statusStyle = 'bg-amber-50 border-amber-200/90 text-amber-800';
      dotColor = 'bg-amber-500';
    }

    const card = document.createElement('div');
    card.className = `p-3 rounded-2xl border text-left transition relative flex flex-col justify-between min-h-[110px] ${statusStyle} ${canEdit ? 'hover:shadow-md' : 'opacity-85'}`;

    card.innerHTML = `
      <div class="flex items-start justify-between w-full">
        <div>
          <span class="text-xs font-black tracking-tight block">${r.bedCode}</span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${r.classLabel}</span>
        </div>
        <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 mt-0.5"></span>
      </div>
      <div class="my-1 truncate">
        <span class="text-[11px] font-bold block truncate">${r.name || '— Bed Kosong —'}</span>
        <span class="text-[10px] text-slate-500 truncate block">${r.diag || 'Tersedia Siap Pakai'}</span>
      </div>
      <div class="pt-1.5 border-t border-black/5 flex items-center justify-between gap-1">
        <span class="text-[10px] font-extrabold truncate">${r.status}</span>
        ${canEdit ? `
          <button type="button" class="btn-grid-clear p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition shrink-0" title="Hapus Pasien">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        ` : ''}
      </div>
    `;

    if (canEdit) {
      card.querySelector('.btn-grid-clear')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        r.norm = '';
        r.name = '';
        r.diag = '';
        r.status = 'Tersedia';
        recalculateWardCounts(ward);
        showToast(`Bed ${r.bedCode} dikosongkan.`, 'success');
        renderFilteredBody(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    }

    grid.appendChild(card);
  });
}
