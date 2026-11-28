import { appState, ROLE_META } from '../../../state.js';
import { showToast } from '../../../ui/toast.js';
import { updateWardHud, renderSidebarWards } from '../../../ui/navigation.js';
import { getConnectionState, updateBedStatusDb } from '../../../supabaseClient.js';

/**
 * Renderer Unit Isolasi Khusus & Luka Bakar (Burn Unit & ICU Isolasi Tekanan Negatif)
 * Fokus pada protokol infeksius ketat, tekanan negatif, HEPA filter, dan siklus dekontaminasi UV-C
 */
export function renderIsolationWard(ward, container, canEdit, meta) {
  container.className = 'space-y-4';
  container.innerHTML = '';

  const isBurn = ward.id === 'BURN';

  // 1. Bilah Banner Protokol Isolasi
  const banner = document.createElement('div');
  banner.className = 'bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-amber-500/30 shadow-md';
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-black text-amber-400 uppercase tracking-wider">Protokol Barrier Isolasi Ketat</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold border border-amber-400/30">Level 3 Precaution</span>
        </div>
        <h3 class="text-base font-extrabold tracking-tight mt-0.5">${ward.name} • ${isBurn ? 'Ruang Khusus Luka Bakar Luas' : 'ICU Tekanan Negatif (Airborne ISO)'}</h3>
      </div>
    </div>
    <div class="flex items-center gap-3 text-xs font-bold flex-wrap">
      <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Tekanan: <strong class="text-emerald-300">-2.5 Pa (Normal)</strong></span>
      </div>
      <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>HEPA Filter: <strong class="text-emerald-300">99.97% Active</strong></span>
      </div>
    </div>
  `;
  container.appendChild(banner);

  // 2. Grid Kartu Isolasi
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl';
  container.appendChild(grid);

  for (let i = 1; i <= ward.total; i++) {
    const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
    const isOccupied = i <= ward.occupied;

    const card = document.createElement('div');
    card.className = `rounded-2xl border p-5 shadow-2xs space-y-3.5 transition ${isOccupied ? 'border-rose-200 bg-white' : 'border-emerald-200 bg-emerald-50/40'}`;

    card.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <span class="text-sm font-black text-slate-900 tracking-tight block">${bedCode}</span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${ward.name} • Kamar Isolasi Tunggal</span>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isOccupied ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
          <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-600' : 'bg-emerald-600'}"></span>
          ${isOccupied ? 'Terisi Pasien Isolasi' : 'Steril Siap Pakai'}
        </span>
      </div>

      <div class="space-y-2 text-xs">
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
          <span class="font-bold flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Sirkulasi Udara &amp; Tekanan
          </span>
          <span class="font-bold text-emerald-700">Tekanan Negatif Terkunci</span>
        </div>

        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
          <span class="font-bold flex items-center gap-1.5">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            Siklus Dekontaminasi UV-C
          </span>
          <span class="font-semibold text-slate-500">${isOccupied ? 'Jadwal Pasca Rawat' : 'Selesai 45 Mnt Lalu (Steril)'}</span>
        </div>
      </div>

      ${canEdit ? `
        <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button type="button" class="btn-toggle-iso flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition text-center">
            ${isOccupied ? 'Selesai Rawat & Masuk Sterilisasi' : 'Daftarkan Pasien Isolasi'}
          </button>
        </div>
      ` : ''}
    `;

    if (canEdit) {
      card.querySelector('.btn-toggle-iso')?.addEventListener('click', async () => {
        const nextStatus = isOccupied ? 'available' : 'occupied';
        const conn = getConnectionState();
        if (conn.isConnected) {
          showToast(`Menyimpan status bed isolasi ${bedCode} ke Supabase...`);
          await updateBedStatusDb(bedCode, nextStatus, appState.currentNip, appState.currentRole, { bed_code: bedCode, ward: ward.id, negative_pressure: true });
          showToast(`Status Bed Isolasi ${bedCode} diperbarui!`, 'success');
        } else {
          showToast(`Status Bed Isolasi ${bedCode} diperbarui (Lokal).`, 'success');
        }

        if (isOccupied) {
          ward.occupied = Math.max(0, ward.occupied - 1);
          ward.available = Math.min(ward.total, ward.available + 1);
        } else {
          ward.occupied = Math.min(ward.total, ward.occupied + 1);
          ward.available = Math.max(0, ward.available - 1);
        }

        renderIsolationWard(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    }

    grid.appendChild(card);
  }
}
