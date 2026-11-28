import { appState } from '../../state.js';
import { showToast } from '../../ui/toast.js';
import { getConnectionState, updateBedStatusDb } from '../../supabaseClient.js';

let activeDrawerRecord = null;
let activeDrawerWard = null;
let activeDrawerCanEdit = true;
let activeDrawerOnUpdate = null;
let activeTab = 'pasien'; // 'pasien' | 'admisi' | 'klinis' | 'pembiayaan' | 'resume'
let sidebarCollapsed = false;
let mobileMenuOpen = false;
let zoomPercent = 100;
let titleCopied = false;
let waCopied = false;

const DRAWER_ID = 'ward-patient-detail-drawer';

function getFormattedToday() {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}

/**
 * Menghitung usia dan memformat tanggal lahir dari berbagai format input (bisa paste: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, teks bulan)
 */
export function calculateAgeFromBirthDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  let y = 0, m = 0, d = 0;

  // Format 1: YYYY-MM-DD atau ISO string
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    y = Number(s.slice(0, 4));
    m = Number(s.slice(5, 7));
    d = Number(s.slice(8, 10));
  }
  // Format 2: DD/MM/YYYY atau DD-MM-YYYY
  else if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.test(s)) {
    const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    d = Number(match[1]);
    m = Number(match[2]);
    y = Number(match[3]);
  }
  // Format 3: DD/MM/YY atau DD-MM-YY (2 digit tahun)
  else if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/.test(s)) {
    const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    d = Number(match[1]);
    m = Number(match[2]);
    const yr = Number(match[3]);
    y = yr > 35 ? 1900 + yr : 2000 + yr;
  }
  // Format 4: DD NamaBulan YYYY (misal: 15 Januari 1970 atau 15 Jan 1970)
  else {
    const monthNames = {
      jan: 1, januari: 1, january: 1,
      feb: 2, februari: 2, february: 2,
      mar: 3, maret: 3, march: 3,
      apr: 4, april: 4,
      mei: 5, may: 5,
      jun: 6, juni: 6, june: 6,
      jul: 7, juli: 7, july: 7,
      agu: 8, agust: 8, agustus: 8, aug: 8, august: 8,
      sep: 9, september: 9,
      okt: 10, oktober: 10, oct: 10, october: 10,
      nop: 11, nov: 11, november: 11,
      des: 12, desember: 12, dec: 12, december: 12
    };
    const parts = s.split(/[\s,]+/);
    if (parts.length >= 3) {
      const p1 = Number(parts[0]);
      const p2 = parts[1].toLowerCase();
      const p3 = Number(parts[2]);
      if (p1 >= 1 && p1 <= 31 && monthNames[p2] && p3 >= 1900) {
        d = p1;
        m = monthNames[p2];
        y = p3;
      }
    }
  }

  if (!y || !m || !d) return null;

  const birthDate = new Date(y, m - 1, d);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  if (age < 0 || age > 130) return null;

  const formattedDisplay = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const ageText = `${age} Th`;

  return {
    age,
    ageText,
    display: formattedDisplay,
    iso
  };
}

function buildWhatsAppResumeText(record, ward) {
  const norm = record.norm || '—';
  const name = record.name || '— (Bed Kosong)';
  const age = record.age || '—';
  const jk = record.jk || '—';
  const bed = record.bedCode || '—';
  const ruang = ward ? ward.name : 'Rawat Inap';
  const kelas = record.classLabel || record.bedClass || '—';
  const status = record.status || 'Tersedia';
  const tglMrs = record.tglMrs || '—';
  const lama = record.lama || '—';
  const asal = record.dari || record.asal || '—';
  const diag = record.diag || '—';
  const diagSekunder = record.diagSekunder || '—';
  const dpjp = record.dpjp || '—';
  const pinru = record.pinru || 'Tidak / Tetap';
  const pembiayaan = record.pembiayaan || 'BPJS PBI';
  const noSep = record.noSep || '—';
  const td = record.td || '120/80';
  const hr = record.hr || '82';
  const suhu = record.suhu || '36.5';
  const spo2 = record.spo2 || '98';
  const terapi = record.terapi || '—';

  return `*RINGKASAN RAWAT INAP & OPERAN PASIEN*
*RSUD Dr. M. Soewandhie Surabaya*
====================================
*Ruangan:* ${ruang} | *Bed:* ${bed} (${kelas})
*Status Bed:* ${status}
*Tanggal Laporan:* ${getFormattedToday()}

*1. IDENTITAS PASIEN*
• *No. RM:* ${norm}
• *Nama Pasien:* ${name}
• *Usia / JK:* ${age} / ${jk}
• *Penjamin:* ${pembiayaan} (SEP: ${noSep})

*2. DATA ADMISI / MRS*
• *Tgl MRS:* ${tglMrs} (Lama: ${lama})
• *Asal Masuk:* ${asal}
• *Petugas Admisi:* ${record.admisi || '—'}

*3. STATUS KLINIS & DPJP*
• *DPJP Utama:* ${dpjp}
• *Diagnosa Utama:* ${diag}
• *Diagnosa Sekunder:* ${diagSekunder}
• *Tanda Vital:* TD ${td} mmHg | HR ${hr}x/m | Suhu ${suhu}°C | SpO2 ${spo2}%
• *Rencana Tindak Lanjut (PINRU):* ${pinru}
• *Instruksi Terapi:*
${terapi}

====================================
_SIRS — Sistem Informasi Integrasi Rumah Sakit_`;
}

export function openPatientDrawer(ward, bedRecord, canEdit = true, onUpdate = null) {
  activeDrawerWard = ward;
  activeDrawerRecord = bedRecord;
  activeDrawerCanEdit = canEdit;
  activeDrawerOnUpdate = onUpdate;
  activeTab = 'pasien';
  mobileMenuOpen = false;
  titleCopied = false;
  waCopied = false;

  if (!activeDrawerRecord.jk) activeDrawerRecord.jk = 'Laki-laki';
  if (!activeDrawerRecord.tglLahir) activeDrawerRecord.tglLahir = '';
  if (!activeDrawerRecord.alamat) activeDrawerRecord.alamat = 'Surabaya';
  if (!activeDrawerRecord.noTelp) activeDrawerRecord.noTelp = '';
  if (!activeDrawerRecord.penanggungJawab) activeDrawerRecord.penanggungJawab = '';
  if (!activeDrawerRecord.dpjp) activeDrawerRecord.dpjp = 'dr. Spesialis Jaga, Sp.PD';
  if (!activeDrawerRecord.diagSekunder) activeDrawerRecord.diagSekunder = '';
  if (!activeDrawerRecord.td) activeDrawerRecord.td = '120/80';
  if (!activeDrawerRecord.hr) activeDrawerRecord.hr = '82';
  if (!activeDrawerRecord.suhu) activeDrawerRecord.suhu = '36.5';
  if (!activeDrawerRecord.spo2) activeDrawerRecord.spo2 = '98';
  if (!activeDrawerRecord.terapi) activeDrawerRecord.terapi = 'IVFD RL 20 tpm\nCeftriaxone 2x1 gr IV\nOmeprazole 1x40 mg IV';
  if (!activeDrawerRecord.noKartu) activeDrawerRecord.noKartu = '000' + Math.floor(10000000 + Math.random() * 89999999);
  if (!activeDrawerRecord.noSep) activeDrawerRecord.noSep = '0189R001' + Math.floor(100000 + Math.random() * 899999);
  if (!activeDrawerRecord.statusSep) activeDrawerRecord.statusSep = 'Terverifikasi';
  if (!activeDrawerRecord.billingNotes) activeDrawerRecord.billingNotes = 'Tidak ada selisih tarif kelas';

  let container = document.getElementById(DRAWER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = DRAWER_ID;
    document.body.appendChild(container);
  }

  container.className = 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');

  renderDrawerDom();
  window.addEventListener('keydown', handleGlobalKey);
}

export function closePatientDrawer() {
  const container = document.getElementById(DRAWER_ID);
  if (container) {
    container.className = 'hidden';
    container.innerHTML = '';
  }
  window.removeEventListener('keydown', handleGlobalKey);
  activeDrawerRecord = null;
  mobileMenuOpen = false;
}

function handleGlobalKey(e) {
  if (e.key === 'Escape') {
    closePatientDrawer();
  }
}

function renderDrawerDom() {
  const container = document.getElementById(DRAWER_ID);
  if (!container || !activeDrawerRecord) return;

  const r = activeDrawerRecord;
  const ward = activeDrawerWard;
  const canEdit = activeDrawerCanEdit;
  const todayStr = getFormattedToday();

  const isMobile = window.innerWidth < 640;

  const tabsConfig = [
    {
      id: 'pasien',
      num: '1',
      label: 'Identitas Pasien',
      shortLabel: 'Pasien',
      icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`
    },
    {
      id: 'admisi',
      num: '2',
      label: 'Rawat Inap & Bed',
      shortLabel: 'Rawat Inap',
      icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`
    },
    {
      id: 'klinis',
      num: '3',
      label: 'Klinis & DPJP',
      shortLabel: 'Klinis',
      icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`
    },
    {
      id: 'pembiayaan',
      num: '4',
      label: 'Biaya & SEP',
      shortLabel: 'Biaya',
      icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`
    },
    {
      id: 'resume',
      num: '5',
      label: 'Resume & Operan WA',
      shortLabel: 'Resume WA',
      icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>`
    }
  ];

  container.innerHTML = `
    <!-- Modal Dialog Box -->
    <div class="pointer-events-auto flex h-[min(92vh,750px)] max-h-[min(92vh,750px)] min-w-0 w-full max-w-[min(58rem,96vw)] lg:max-w-[min(66rem,95vw)] 2xl:max-w-6xl cursor-default flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/95 shadow-[0_24px_56px_rgba(15,23,42,0.22),0_0_1px_rgba(15,23,42,0.1)] font-sans antialiased" style="zoom: ${zoomPercent / 100};">
      
      <!-- 1. Header Gradient Gelap -->
      <div class="shrink-0 border-b px-3 sm:px-4 py-2.5 sm:py-3 border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] text-white flex items-center justify-between gap-2 select-none">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          
          <!-- Tombol Hamburger / Collapse Sidebar -->
          <button type="button" id="btn-drawer-toggle-sidebar" class="shrink-0 rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-100 hover:border-white/35 hover:bg-white/20 hover:text-white transition cursor-pointer" aria-label="Toggle Menu Sidebar" title="Buka / Ciutkan Navigasi">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
          </button>

          <!-- Judul Rekam Medis: No RM, Nama, Bed & Bangsal -->
          <div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 overflow-hidden text-xs sm:text-sm font-semibold whitespace-nowrap">
            <span class="text-slate-300 text-xs hidden lg:inline">${todayStr}</span>
            <span class="font-mono font-black text-amber-200 bg-amber-950/60 border border-amber-400/30 px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs tracking-tight shrink-0">
              RM: ${r.norm || 'BELUM TERDAFTAR'}
            </span>
            <span class="font-bold text-white truncate max-w-[120px] sm:max-w-[200px] md:max-w-[260px]">
              ${r.name || '— Bed Kosong —'}
            </span>
            <span class="text-slate-300 font-medium text-xs hidden sm:inline truncate">
              [${r.bedCode} • ${r.classLabel || r.bedClass}]
            </span>
            <span class="text-slate-400 font-normal text-xs hidden md:inline truncate">
              (${ward ? ward.name : 'Rawat Inap'})
            </span>
          </div>

          <!-- Tombol Salin Judul Pasien -->
          <button type="button" id="btn-drawer-copy-title" class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/25 bg-white/10 text-slate-200 transition hover:border-white/40 hover:bg-white/20 hover:text-white" title="Salin Ringkasan Judul">
            ${titleCopied
              ? `<svg class="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
              : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`
            }
          </button>
        </div>

        <!-- Zoom Controls & Close Button -->
        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <!-- Zoom Controls (Desktop Only) -->
          <div class="hidden sm:flex items-center gap-0.5 rounded-lg border border-white/20 bg-white/10 px-1 py-0.5 text-slate-100 text-[11px] font-bold">
            <button type="button" id="btn-drawer-zoom-out" class="h-6 w-6 rounded hover:bg-white/15 flex items-center justify-center transition cursor-pointer" title="Perkecil" ${zoomPercent <= 80 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>−</button>
            <button type="button" id="btn-drawer-zoom-reset" class="px-1.5 font-mono text-[10px] sm:text-[11px] text-white hover:bg-white/15 rounded transition cursor-pointer" title="Reset 100%">${zoomPercent}%</button>
            <button type="button" id="btn-drawer-zoom-in" class="h-6 w-6 rounded hover:bg-white/15 flex items-center justify-center transition cursor-pointer" title="Perbesar" ${zoomPercent >= 120 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>+</button>
          </div>

          <!-- Close Button -->
          <button type="button" id="btn-drawer-close" class="shrink-0 rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-200 hover:border-white/35 hover:bg-white/20 hover:text-white transition cursor-pointer" title="Tutup Detail Pasien (Esc)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- 2. Body Area -->
      <div class="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        
        <!-- Backdrop Mobile saat sidebar dibuka -->
        <div id="drawer-mobile-backdrop" class="${mobileMenuOpen ? 'block' : 'hidden'} absolute inset-0 z-20 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-200 sm:hidden"></div>

        <!-- Sidebar Navigasi Responsif -->
        <nav id="drawer-tabnav" class="
          z-20 flex shrink-0 flex-col gap-1 overflow-y-auto border-r py-3 transition-all duration-200
          border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0]
          max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:w-56 max-sm:shadow-2xl max-sm:px-2
          ${mobileMenuOpen ? 'max-sm:translate-x-0' : 'max-sm:-translate-x-full max-sm:pointer-events-none'}
          sm:relative sm:translate-x-0
          ${sidebarCollapsed ? 'sm:w-14 sm:px-1.5' : 'sm:w-52 sm:px-2'}
        ">
          <!-- List Tab Buttons -->
          ${tabsConfig.map(t => {
            const isActive = activeTab === t.id;
            return `
              <button
                type="button"
                data-tab="${t.id}"
                class="btn-drawer-tab group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition cursor-pointer
                  ${isActive
                    ? 'border border-slate-300/90 bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'}
                  ${sidebarCollapsed ? 'sm:justify-center sm:px-0' : ''}
                "
                title="${t.num}. ${t.label}"
              >
                <span class="${isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-800'} shrink-0">
                  ${t.icon}
                </span>
                <span class="truncate max-sm:inline ${sidebarCollapsed ? 'sm:hidden' : 'sm:inline'}">
                  ${t.num}. ${t.shortLabel}
                </span>
              </button>
            `;
          }).join('')}

          <!-- Tombol Tutup Cepat di Bawah Navigasi -->
          <div class="mt-auto pt-3 border-t border-slate-300/70">
            <button
              type="button"
              id="btn-drawer-bottom-close"
              class="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition cursor-pointer ${sidebarCollapsed ? 'sm:justify-center sm:px-0' : ''}"
              title="Tutup Detail"
            >
              <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              <span class="truncate max-sm:inline ${sidebarCollapsed ? 'sm:hidden' : 'sm:inline'}">Tutup Detail</span>
            </button>
          </div>
        </nav>

        <!-- 3. Panel Konten Form (Scrollable) -->
        <div id="drawer-tab-content" class="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 bg-gradient-to-br from-slate-100 via-[#E6E9EF] to-slate-200 text-slate-800">
          ${renderTabContentHtml(r, ward, canEdit)}
        </div>
      </div>
    </div>
  `;

  bindDrawerEvents(container);
}

function renderTabContentHtml(r, ward, canEdit) {
  const inputClass = canEdit
    ? 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition outline-none'
    : 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default';

  const selectClass = canEdit
    ? 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-800 transition cursor-pointer outline-none'
    : 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default';

  // TAB 1: IDENTITAS PASIEN
  if (activeTab === 'pasien') {
    return `
      <div class="space-y-4 max-w-4xl">
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                Identitas Lengkap Pasien
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Edit dan simpan data rekam medis pasien untuk bed <strong>${r.bedCode}</strong></p>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              ${canEdit ? 'Bisa Diedit Langsung' : 'Hanya Lihat'}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5">
            <!-- No. RM -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">No. Rekam Medis (RM)</label>
              <input type="text" data-drawer-field="norm" value="${r.norm || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Contoh: 01-24-89" class="${inputClass} font-mono font-bold text-blue-900" />
            </div>

            <!-- Nama Lengkap Pasien -->
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nama Lengkap Pasien</label>
              <input type="text" data-drawer-field="name" value="${r.name || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama lengkap sesuai KTP/BPJS..." class="${inputClass} font-bold text-slate-900" />
            </div>

            <!-- Usia (Readonly / Auto dari Tanggal Lahir) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Usia / Umur</label>
                <span class="text-[9px] text-emerald-600 font-bold">Auto</span>
              </div>
              <input type="text" data-drawer-field="age" value="${r.age || ''}" readonly placeholder="Otomatis dari Tgl Lahir" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed outline-none select-none" />
            </div>

            <!-- Jenis Kelamin -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Jenis Kelamin</label>
              ${canEdit ? `
                <select data-drawer-field="jk" class="${selectClass}">
                  <option value="Laki-laki" ${r.jk === 'Laki-laki' ? 'selected' : ''}>Laki-laki (L)</option>
                  <option value="Perempuan" ${r.jk === 'Perempuan' ? 'selected' : ''}>Perempuan (P)</option>
                </select>
              ` : `<input type="text" value="${r.jk || '—'}" readonly class="${inputClass}" />`}
            </div>

            <!-- Tanggal Lahir -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal Lahir</label>
                <span class="text-[9px] text-blue-600 font-bold">(Bisa Paste)</span>
              </div>
              <input type="text" data-drawer-field="tglLahir" value="${r.tglLahir || ''}" ${!canEdit ? 'readonly' : ''} placeholder="DD/MM/YYYY" class="${inputClass} font-mono" />
            </div>

            <!-- No. Telepon Pasien -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">No. Kontak / HP</label>
              <input type="text" data-drawer-field="noTelp" value="${r.noTelp || ''}" ${!canEdit ? 'readonly' : ''} placeholder="08xxxxxxxxxx" class="${inputClass} font-mono" />
            </div>

            <!-- Penanggung Jawab -->
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Keluarga / Penanggung Jawab (PJ)</label>
              <input type="text" data-drawer-field="penanggungJawab" value="${r.penanggungJawab || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama keluarga & nomor telepon..." class="${inputClass}" />
            </div>

            <!-- Alamat Domisili -->
            <div class="sm:col-span-2 md:col-span-3">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Alamat Domisili</label>
              <textarea data-drawer-field="alamat" rows="2" ${!canEdit ? 'readonly' : ''} placeholder="Alamat domisili pasien..." class="${inputClass}">${r.alamat || ''}</textarea>
            </div>
          </div>

          ${canEdit ? `
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span class="text-[11px] text-slate-500 font-medium">Perubahan tersimpan otomatis & tersinkron ke tabel.</span>
              <button type="button" class="btn-save-drawer w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Simpan Identitas Pasien
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // TAB 2: RAWAT INAP & ADMISI
  if (activeTab === 'admisi') {
    return `
      <div class="space-y-4 max-w-4xl">
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                Status Rawat Inap &amp; Penempatan Kamar
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Informasi tempat tidur, status admisi, tanggal masuk, dan rujukan</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5">
            <!-- Nomor Bed -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nomor Kamar / Bed</label>
              <input type="text" value="${r.bedCode}" readonly class="${inputClass} font-extrabold bg-slate-100 text-slate-900" />
            </div>

            <!-- Kelas Perawatan -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Kelas Perawatan</label>
              ${canEdit ? `
                <select data-drawer-field="bedClass" class="${selectClass}">
                  <option value="VIP" ${r.bedClass === 'VIP' ? 'selected' : ''}>VIP</option>
                  <option value="KL1" ${r.bedClass === 'KL1' ? 'selected' : ''}>Kelas 1</option>
                  <option value="KL2" ${r.bedClass === 'KL2' ? 'selected' : ''}>Kelas 2</option>
                  <option value="KL3" ${r.bedClass === 'KL3' ? 'selected' : ''}>Kelas 3</option>
                </select>
              ` : `<input type="text" value="${r.classLabel || r.bedClass}" readonly class="${inputClass}" />`}
            </div>

            <!-- Status Bed -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status Keterisian Bed</label>
              ${canEdit ? `
                <select data-drawer-field="status" class="${selectClass}">
                  <option value="Tersedia" ${r.status === 'Tersedia' ? 'selected' : ''}>Tersedia (Kosong)</option>
                  <option value="Terisi" ${r.status === 'Terisi' ? 'selected' : ''}>Terisi</option>
                  <option value="Inden IGD" ${r.status === 'Inden IGD' ? 'selected' : ''}>Inden IGD</option>
                  <option value="Rencana PP" ${r.status === 'Rencana PP' ? 'selected' : ''}>Rencana Pulang (PP)</option>
                </select>
              ` : `<input type="text" value="${r.status}" readonly class="${inputClass}" />`}
            </div>

            <!-- Tanggal MRS -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tanggal Masuk (MRS)</label>
              <input type="text" data-drawer-field="tglMrs" value="${r.tglMrs || ''}" ${!canEdit ? 'readonly' : ''} placeholder="DD/MM/YYYY" class="${inputClass} font-mono text-[11px]" />
            </div>

            <!-- Lama MRS -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Lama Perawatan (Hari)</label>
              <input type="text" data-drawer-field="lama" value="${r.lama || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Contoh: 3 Hari" class="${inputClass}" />
            </div>

            <!-- Jam Masuk -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Jam Admisi (0:0:0)</label>
              <input type="text" data-drawer-field="jam" value="${r.jam || '00:00:00'}" ${!canEdit ? 'readonly' : ''} placeholder="DD/MM/YYYY HH:mm:ss" class="${inputClass} font-mono text-[11px]" />
            </div>

            <!-- Asal Masuk -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Asal Masuk (Dari Unit)</label>
              <input type="text" data-drawer-field="dari" value="${r.dari || ''}" ${!canEdit ? 'readonly' : ''} placeholder="IGD P1 / Poli Jantung..." class="${inputClass}" />
            </div>

            <!-- Petugas ADMISI -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Petugas ADMISI</label>
              <input type="text" data-drawer-field="admisi" value="${r.admisi || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama petugas admisi..." class="${inputClass}" />
            </div>

            <!-- Penerima Inden -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Penerima Inden</label>
              <input type="text" data-drawer-field="penerima" value="${r.penerima || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama perawat penerima..." class="${inputClass}" />
            </div>

            <!-- Asal Inden -->
            <div class="sm:col-span-2 md:col-span-3">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Asal Inden Spesifik</label>
              <input type="text" data-drawer-field="asal" value="${r.asal || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Contoh: IGD Triage Bed K1 / Poli Spesialis..." class="${inputClass}" />
            </div>
          </div>

          ${canEdit ? `
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
              <button type="button" class="btn-save-drawer w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Simpan Status Rawat Inap
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // TAB 3: KLINIS & DPJP
  if (activeTab === 'klinis') {
    return `
      <div class="space-y-4 max-w-4xl">
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                Diagnosa Klinis, DPJP &amp; Monitoring
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Diagnosa medis, dokter penanggung jawab, rencana tindak lanjut, dan terapi</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
            <!-- Dokter DPJP Utama -->
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Dokter DPJP Utama</label>
              <input type="text" data-drawer-field="dpjp" value="${r.dpjp || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nama DPJP spesialis..." class="${inputClass} font-bold" />
            </div>

            <!-- Rencana PINRU -->
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rencana PINRU (Tindak Lanjut)</label>
              ${canEdit ? `
                <select data-drawer-field="pinru" class="${selectClass} font-bold text-slate-900">
                  <option value="Tidak / Tetap" ${r.pinru === 'Tidak / Tetap' ? 'selected' : ''}>Tidak / Tetap (Perawatan Lanjut)</option>
                  <option value="Rencana Pulang (PP)" ${r.pinru === 'Rencana Pulang (PP)' ? 'selected' : ''}>Rencana Pulang (PP)</option>
                  <option value="Rencana ICU" ${r.pinru === 'Rencana ICU' ? 'selected' : ''}>Rencana Pindah ICU</option>
                  <option value="Pindah Teratai" ${r.pinru === 'Pindah Teratai' ? 'selected' : ''}>Pindah Ruang Teratai</option>
                  <option value="Pindah Dahlia" ${r.pinru === 'Pindah Dahlia' ? 'selected' : ''}>Pindah Ruang Dahlia</option>
                  <option value="Rencana Bedah" ${r.pinru === 'Rencana Bedah' ? 'selected' : ''}>Rencana Operasi Bedah</option>
                </select>
              ` : `<input type="text" value="${r.pinru || 'Tidak / Tetap'}" readonly class="${inputClass}" />`}
            </div>

            <!-- Diagnosa Utama -->
            <div class="sm:col-span-2 md:col-span-4">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Diagnosa Medis Utama</label>
              <input type="text" data-drawer-field="diag" value="${r.diag || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Diagnosa medis primer..." class="${inputClass} font-bold text-slate-900" />
            </div>

            <!-- Diagnosa Sekunder -->
            <div class="sm:col-span-2 md:col-span-4">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Diagnosa Sekunder / Komorbiditas</label>
              <input type="text" data-drawer-field="diagSekunder" value="${r.diagSekunder || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Penyakit penyerta atau komplikasi..." class="${inputClass}" />
            </div>

            <!-- Tanda-Tanda Vital -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tekanan Darah (TD)</label>
              <input type="text" data-drawer-field="td" value="${r.td || '120/80'}" ${!canEdit ? 'readonly' : ''} placeholder="mmHg" class="${inputClass} font-mono text-center font-bold" />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nadi / HR (x/m)</label>
              <input type="text" data-drawer-field="hr" value="${r.hr || '82'}" ${!canEdit ? 'readonly' : ''} placeholder="bpm" class="${inputClass} font-mono text-center font-bold" />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Suhu (°C)</label>
              <input type="text" data-drawer-field="suhu" value="${r.suhu || '36.5'}" ${!canEdit ? 'readonly' : ''} placeholder="°C" class="${inputClass} font-mono text-center font-bold" />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Saturasi SpO2 (%)</label>
              <input type="text" data-drawer-field="spo2" value="${r.spo2 || '98'}" ${!canEdit ? 'readonly' : ''} placeholder="%" class="${inputClass} font-mono text-center font-bold" />
            </div>

            <!-- Instruksi Terapi -->
            <div class="sm:col-span-2 md:col-span-4">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Instruksi Medis &amp; Terapi Obat</label>
              <textarea data-drawer-field="terapi" rows="3" ${!canEdit ? 'readonly' : ''} placeholder="Daftar cairan infus, injeksi, dan instruksi dokter..." class="${inputClass} font-mono text-[11px] leading-relaxed">${r.terapi || ''}</textarea>
            </div>
          </div>

          ${canEdit ? `
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
              <button type="button" class="btn-save-drawer w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Simpan Data Klinis
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // TAB 4: PEMBIAYAAN & SEP
  if (activeTab === 'pembiayaan') {
    return `
      <div class="space-y-4 max-w-4xl">
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                Penjaminan, Cara Bayar &amp; SEP BPJS
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Kelola data kepesertaan jaminan kesehatan dan verifikasi billing SIMRS</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5">
            <!-- Skema Pembiayaan -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Skema Pembiayaan</label>
              ${canEdit ? `
                <select data-drawer-field="pembiayaan" class="${selectClass} font-bold">
                  <option value="BPJS PBI" ${r.pembiayaan === 'BPJS PBI' ? 'selected' : ''}>BPJS Kesehatan (PBI)</option>
                  <option value="BPJS Non PBI" ${r.pembiayaan === 'BPJS Non PBI' ? 'selected' : ''}>BPJS Mandiri (Non PBI)</option>
                  <option value="Jamkesda Sby" ${r.pembiayaan === 'Jamkesda Sby' ? 'selected' : ''}>Jamkesda Pemkot Surabaya</option>
                  <option value="Umum" ${r.pembiayaan === 'Umum' ? 'selected' : ''}>Umum / Biaya Sendiri</option>
                  <option value="Asuransi Lain" ${r.pembiayaan === 'Asuransi Lain' ? 'selected' : ''}>Asuransi Swasta / Perusahaan</option>
                </select>
              ` : `<input type="text" value="${r.pembiayaan || '—'}" readonly class="${inputClass}" />`}
            </div>

            <!-- No. Kartu BPJS -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nomor Kartu Jaminan</label>
              <input type="text" data-drawer-field="noKartu" value="${r.noKartu || ''}" ${!canEdit ? 'readonly' : ''} placeholder="13 digit No. BPJS..." class="${inputClass} font-mono font-bold" />
            </div>

            <!-- No. SEP SIMRS -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nomor SEP Rawat Inap</label>
              <input type="text" data-drawer-field="noSep" value="${r.noSep || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Nomor SEP SIMRS..." class="${inputClass} font-mono font-bold text-blue-900" />
            </div>

            <!-- Status Verifikasi SEP -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status Verifikasi SEP</label>
              ${canEdit ? `
                <select data-drawer-field="statusSep" class="${selectClass}">
                  <option value="Terverifikasi" ${r.statusSep === 'Terverifikasi' ? 'selected' : ''}>Terverifikasi (Sesuai)</option>
                  <option value="Belum Verifikasi" ${r.statusSep === 'Belum Verifikasi' ? 'selected' : ''}>Belum Verifikasi</option>
                  <option value="Pending Berkas" ${r.statusSep === 'Pending Berkas' ? 'selected' : ''}>Pending Berkas Rujukan</option>
                </select>
              ` : `<input type="text" value="${r.statusSep || '—'}" readonly class="${inputClass}" />`}
            </div>

            <!-- Catatan Billing -->
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Catatan Verifikator / Kasir</label>
              <input type="text" data-drawer-field="billingNotes" value="${r.billingNotes || ''}" ${!canEdit ? 'readonly' : ''} placeholder="Catatan kelas perawatan, naik kelas, atau selisih..." class="${inputClass}" />
            </div>
          </div>

          ${canEdit ? `
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
              <button type="button" class="btn-save-drawer w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Simpan Penjaminan &amp; SEP
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // TAB 5: RESUME PASIEN & OPERAN WHATSAPP
  if (activeTab === 'resume') {
    const waText = buildWhatsAppResumeText(r, ward);
    return `
      <div class="space-y-4 max-w-4xl">
        <!-- Kartu Ringkasan Cepat -->
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                Ringkasan Klinis Pasien Sesi Ini
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Resume ringkas kondisi terkini untuk pelaporan jaga dan tim medis</p>
            </div>
            <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              ${r.bedCode}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Diagnosa Utama</span>
              <span class="font-extrabold text-slate-900 block mt-0.5 truncate">${r.diag || '—'}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">DPJP Utama</span>
              <span class="font-extrabold text-slate-900 block mt-0.5 truncate">${r.dpjp || '—'}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Tanda Vital</span>
              <span class="font-extrabold text-slate-900 block mt-0.5">${r.td || '120/80'} | ${r.hr || '82'}x</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Rencana PINRU</span>
              <span class="font-extrabold text-indigo-700 block mt-0.5 truncate">${r.pinru || 'Tetap'}</span>
            </div>
          </div>
        </div>

        <!-- Kartu Salin Format WhatsApp -->
        <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-xs space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.302c-.087.088-.179.183-.077.359.101.176.45 1.05 1.341 1.844.891.794 1.637.892 1.87 1.008.232.116.368.101.505-.058.137-.159.584-.68.742-.912.158-.232.316-.194.529-.116.213.078 1.353.638 1.584.754.231.116.386.173.443.27.057.098.057.568-.087.973z"/></svg>
                Versi Teks Serah Terima (WhatsApp)
              </h4>
              <p class="text-[11px] text-slate-500 mt-0.5">Format baku laporan operan antar-shift perawat dan pelaporan DPJP</p>
            </div>

            <button type="button" id="btn-copy-wa-resume" class="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
              ${waCopied
                ? `<svg class="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                   <span>Tersalin ke Clipboard!</span>`
                : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                   <span>Salin untuk WhatsApp</span>`
              }
            </button>
          </div>

          <div class="relative">
            <textarea readonly rows="11" class="w-full p-3 font-mono text-[11px] leading-relaxed rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 select-all focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none">${waText}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function bindDrawerEvents(container) {
  const r = activeDrawerRecord;
  const ward = activeDrawerWard;
  const canEdit = activeDrawerCanEdit;

  container.querySelector('#btn-drawer-close')?.addEventListener('click', closePatientDrawer);
  container.querySelector('#btn-drawer-bottom-close')?.addEventListener('click', closePatientDrawer);

  container.addEventListener('click', (e) => {
    if (e.target === container) {
      closePatientDrawer();
    }
  });

  // Toggle Sidebar Navigasi (Mobile = slide-in drawer; Desktop = collapse/expand)
  container.querySelector('#btn-drawer-toggle-sidebar')?.addEventListener('click', () => {
    if (window.innerWidth < 640) {
      mobileMenuOpen = !mobileMenuOpen;
      const nav = container.querySelector('#drawer-tabnav');
      const backdrop = container.querySelector('#drawer-mobile-backdrop');
      if (mobileMenuOpen) {
        nav?.classList.remove('max-sm:-translate-x-full', 'max-sm:pointer-events-none');
        nav?.classList.add('max-sm:translate-x-0');
        backdrop?.classList.remove('hidden');
        backdrop?.classList.add('block');
      } else {
        nav?.classList.remove('max-sm:translate-x-0');
        nav?.classList.add('max-sm:-translate-x-full', 'max-sm:pointer-events-none');
        backdrop?.classList.remove('block');
        backdrop?.classList.add('hidden');
      }
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      renderDrawerDom();
    }
  });

  // Klik backdrop mobile untuk menutup sidebar drawer
  container.querySelector('#drawer-mobile-backdrop')?.addEventListener('click', () => {
    mobileMenuOpen = false;
    const nav = container.querySelector('#drawer-tabnav');
    const backdrop = container.querySelector('#drawer-mobile-backdrop');
    nav?.classList.remove('max-sm:translate-x-0');
    nav?.classList.add('max-sm:-translate-x-full', 'max-sm:pointer-events-none');
    backdrop?.classList.remove('block');
    backdrop?.classList.add('hidden');
  });

  // Zoom controls
  container.querySelector('#btn-drawer-zoom-in')?.addEventListener('click', () => {
    if (zoomPercent < 120) {
      zoomPercent += 5;
      renderDrawerDom();
    }
  });
  container.querySelector('#btn-drawer-zoom-out')?.addEventListener('click', () => {
    if (zoomPercent > 80) {
      zoomPercent -= 5;
      renderDrawerDom();
    }
  });
  container.querySelector('#btn-drawer-zoom-reset')?.addEventListener('click', () => {
    zoomPercent = 100;
    renderDrawerDom();
  });

  // Salin Judul
  container.querySelector('#btn-drawer-copy-title')?.addEventListener('click', async () => {
    const text = `${getFormattedToday()} • RM: ${r.norm || '—'} • ${r.name || 'Bed Kosong'} • [${r.bedCode} - ${ward ? ward.name : ''}] • Diag: ${r.diag || '—'}`;
    try {
      await navigator.clipboard.writeText(text);
      titleCopied = true;
      renderDrawerDom();
      showToast('Ringkasan judul berhasil disalin ke clipboard.', 'success');
      setTimeout(() => {
        titleCopied = false;
        renderDrawerDom();
      }, 2000);
    } catch {
      showToast('Gagal menyalin judul.', 'error');
    }
  });

  // Navigasi Tab
  container.querySelectorAll('.btn-drawer-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      mobileMenuOpen = false;
      renderDrawerDom();
    });
  });

  // Salin WhatsApp Resume
  container.querySelector('#btn-copy-wa-resume')?.addEventListener('click', async () => {
    const waText = buildWhatsAppResumeText(r, ward);
    try {
      await navigator.clipboard.writeText(waText);
      waCopied = true;
      renderDrawerDom();
      showToast('Format laporan WhatsApp berhasil disalin ke clipboard!', 'success');
      setTimeout(() => {
        waCopied = false;
        renderDrawerDom();
      }, 2500);
    } catch {
      showToast('Gagal menyalin format WhatsApp.', 'error');
    }
  });

  // Auto-save & Sinkronisasi input field
  if (canEdit) {
    const contentPanel = container.querySelector('#drawer-tab-content');

    // Auto-hitung Usia saat Tanggal Lahir diisi atau di-paste
    const tglLahirInput = contentPanel?.querySelector('input[data-drawer-field="tglLahir"]');
    const ageInput = contentPanel?.querySelector('input[data-drawer-field="age"]');

    const handleTglLahirInput = (rawVal) => {
      const parsed = calculateAgeFromBirthDate(rawVal);
      if (parsed) {
        if (ageInput) ageInput.value = parsed.ageText;
        r.age = parsed.ageText;
        r.tglLahir = parsed.display;
        if (typeof activeDrawerOnUpdate === 'function') {
          activeDrawerOnUpdate(r);
        }
      }
    };

    tglLahirInput?.addEventListener('input', (e) => {
      handleTglLahirInput(e.target.value);
    });

    tglLahirInput?.addEventListener('paste', () => {
      setTimeout(() => {
        if (tglLahirInput) {
          const parsed = calculateAgeFromBirthDate(tglLahirInput.value);
          if (parsed) {
            tglLahirInput.value = parsed.display;
            handleTglLahirInput(parsed.display);
            showToast(`Usia otomatis terisi: ${parsed.ageText}`, 'info');
          }
        }
      }, 10);
    });

    contentPanel?.querySelectorAll('input[data-drawer-field], select[data-drawer-field], textarea[data-drawer-field]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const field = e.target.dataset.drawerField;
        const val = e.target.value.trim();
        r[field] = val;

        if (field === 'name' && val && r.status === 'Tersedia') {
          r.status = 'Terisi';
        }
        if (field === 'status' && val === 'Tersedia' && r.name) {
          r.norm = '';
          r.name = '';
          r.diag = '';
          r.age = '';
          r.tglLahir = '';
          r.lama = '';
        }

        showToast(`Field ${field} berhasil diperbarui.`, 'info');

        const conn = getConnectionState();
        if (conn.isConnected) {
          await updateBedStatusDb(r.bedCode, r.status === 'Tersedia' ? 'available' : 'occupied', appState.currentNip, appState.currentRole, {
            bed_code: r.bedCode,
            ward: ward ? ward.id : '',
            patient_name: r.name,
            diagnosis: r.diag,
            norm: r.norm,
            class_type: r.bedClass
          });
        }

        if (typeof activeDrawerOnUpdate === 'function') {
          activeDrawerOnUpdate(r);
        }
      });
    });

    contentPanel?.querySelectorAll('.btn-save-drawer').forEach(btn => {
      btn.addEventListener('click', async () => {
        contentPanel.querySelectorAll('input[data-drawer-field], select[data-drawer-field], textarea[data-drawer-field]').forEach(inp => {
          const field = inp.dataset.drawerField;
          r[field] = inp.value.trim();
        });

        showToast(`Seluruh data pada tab ${activeTab.toUpperCase()} berhasil disimpan.`, 'success');

        const conn = getConnectionState();
        if (conn.isConnected) {
          await updateBedStatusDb(r.bedCode, r.status === 'Tersedia' ? 'available' : 'occupied', appState.currentNip, appState.currentRole, {
            bed_code: r.bedCode,
            ward: ward ? ward.id : '',
            patient_name: r.name,
            diagnosis: r.diag,
            norm: r.norm,
            class_type: r.bedClass
          });
        }

        if (typeof activeDrawerOnUpdate === 'function') {
          activeDrawerOnUpdate(r);
        }
      });
    });
  }
}
