import { appState, ROLE_META } from '../../../state.js';
import { showToast } from '../../../ui/toast.js';
import { updateWardHud, renderSidebarWards } from '../../../ui/navigation.js';
import { getConnectionState, updateBedStatusDb } from '../../../supabaseClient.js';

// Cache lokal status ventilator untuk unit intensif
const ventilatorState = {};

/**
 * Renderer Unit Perawatan Intensif (ICU, ICCU, MICU, ISU, NICU)
 * Fokus pada pemantauan alat penunjang hidup (Life-Support): Ventilator, Bedside Monitor, Syringe Pump
 */
export function renderIntensiveWard(ward, container, canEdit, meta) {
  container.className = 'space-y-4';
  container.innerHTML = '';

  // Hitung metrik ventilator intensif
  let vInUse = 0;
  let vStandby = 0;
  for (let i = 1; i <= ward.total; i++) {
    const key = `${ward.id}-${i}`;
    if (ventilatorState[key] === undefined) {
      ventilatorState[key] = i <= ward.occupied; // default: jika terisi, ventilator terpasang
    }
    if (ventilatorState[key]) vInUse++;
    else vStandby++;
  }

  // 1. Bilah Informasi Khusus Ruang Intensif
  const hudBar = document.createElement('div');
  hudBar.className = 'bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md';
  hudBar.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-black text-cyan-400 uppercase tracking-wider">Unit Perawatan Kritis</span>
          <span class="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-extrabold border border-cyan-400/30">Life-Support Active</span>
        </div>
        <h3 class="text-base font-extrabold tracking-tight mt-0.5">Pemantauan Bed &amp; Ventilator ${ward.name}</h3>
      </div>
    </div>
    <div class="flex items-center gap-3 text-xs font-bold flex-wrap">
      <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Ventilator Terpasang: <strong class="text-cyan-300">${vInUse}</strong></span>
      </div>
      <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Ventilator Standby: <strong class="text-emerald-300">${vStandby}</strong></span>
      </div>
      <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
        <span>Bed Siap Pakai: <strong class="text-emerald-400">${ward.available}</strong></span>
      </div>
    </div>
  `;
  container.appendChild(hudBar);

  // 2. Grid Kartu Bed Klinis Intensif
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
  container.appendChild(grid);

  for (let i = 1; i <= ward.total; i++) {
    const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
    const key = `${ward.id}-${i}`;
    const isOccupied = i <= ward.occupied;
    const isVentilatorOn = ventilatorState[key];

    let statusLabel = isOccupied ? 'Kritis Terisi' : 'Tersedia Siap Pakai';
    let cardBorder = isOccupied ? 'border-rose-200 bg-white' : 'border-emerald-200/90 bg-emerald-50/40';

    const card = document.createElement('div');
    card.className = `rounded-2xl border p-4 shadow-2xs space-y-3 transition ${cardBorder} ${canEdit ? 'hover:shadow-sm' : ''}`;

    card.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-100 pb-2.5">
        <div>
          <span class="text-xs font-black text-slate-900 tracking-tight block">${bedCode}</span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${ward.name} • Bed Kritis</span>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
          <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-600' : 'bg-emerald-600'}"></span>
          ${statusLabel}
        </span>
      </div>

      <!-- Parameter Peralatan Intensif -->
      <div class="space-y-1.5 text-xs">
        <div class="flex items-center justify-between py-1 px-2 rounded-lg ${isVentilatorOn ? 'bg-cyan-50 border border-cyan-200/70 text-cyan-900' : 'bg-slate-100 text-slate-600'}">
          <span class="flex items-center gap-1.5 font-bold">
            <svg class="w-3.5 h-3.5 ${isVentilatorOn ? 'text-cyan-600' : 'text-slate-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Ventilator Mekanik
          </span>
          <span class="text-[10px] font-extrabold uppercase">${isVentilatorOn ? 'In-Use' : 'Standby'}</span>
        </div>

        <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-slate-700">
          <span class="flex items-center gap-1.5 font-semibold text-[11px]">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Bedside Monitor 7-Para
          </span>
          <span class="text-[10px] font-bold text-emerald-600">Normal</span>
        </div>

        <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-slate-700">
          <span class="flex items-center gap-1.5 font-semibold text-[11px]">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Syringe Pump Dual-Channel
          </span>
          <span class="text-[10px] font-bold text-slate-500">${isOccupied ? 'Running' : 'Ready'}</span>
        </div>
      </div>

      <!-- Tombol Aksi Cepat Petugas Jaga -->
      ${canEdit ? `
        <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button type="button" class="btn-toggle-bed flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition text-center">
            ${isOccupied ? 'Kosongkan Bed' : 'Isi Pasien Kritis'}
          </button>
          <button type="button" class="btn-toggle-vent py-1.5 px-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition text-center" title="Beralih status ventilator mekanik">
            Ventilator
          </button>
        </div>
      ` : ''}
    `;

    if (canEdit) {
      // Toggle status bed
      card.querySelector('.btn-toggle-bed')?.addEventListener('click', async () => {
        const nextStatus = isOccupied ? 'available' : 'occupied';
        const conn = getConnectionState();
        if (conn.isConnected) {
          showToast(`Menyimpan perubahan ${bedCode} ke basis data Supabase...`);
          await updateBedStatusDb(bedCode, nextStatus, appState.currentNip, appState.currentRole, { bed_code: bedCode, ward: ward.id, ventilator: isVentilatorOn });
          showToast(`Status Bed Intensif ${bedCode} diperbarui!`, 'success');
        } else {
          showToast(`Status Bed Intensif ${bedCode} diperbarui (Lokal).`, 'success');
        }

        if (isOccupied) {
          ward.occupied = Math.max(0, ward.occupied - 1);
          ward.available = Math.min(ward.total, ward.available + 1);
        } else {
          ward.occupied = Math.min(ward.total, ward.occupied + 1);
          ward.available = Math.max(0, ward.available - 1);
        }

        renderIntensiveWard(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });

      // Toggle ventilator
      card.querySelector('.btn-toggle-vent')?.addEventListener('click', () => {
        ventilatorState[key] = !ventilatorState[key];
        showToast(`Ventilator ${bedCode} diubah menjadi: ${ventilatorState[key] ? 'Terpasang (In-Use)' : 'Standby'}`, 'info');
        renderIntensiveWard(ward, container, canEdit, meta);
      });
    }

    grid.appendChild(card);
  }
}
