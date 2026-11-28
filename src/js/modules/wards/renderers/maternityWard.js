import { appState, ROLE_META } from '../../../state.js';
import { showToast } from '../../../ui/toast.js';
import { updateWardHud, renderSidebarWards } from '../../../ui/navigation.js';
import { getConnectionState, updateBedStatusDb } from '../../../supabaseClient.js';

/**
 * Renderer Unit Kebidanan & Neonatologi (VK Bersalin & Ruang Neonatus)
 * Format khusus tempat tidur persalinan (Partus/Kala II), inkubator, dan infant warmer
 */
export function renderMaternityWard(ward, container, canEdit, meta) {
  container.className = 'space-y-4';
  container.innerHTML = '';

  const isNeonatus = ward.id === 'NEONATUS';

  // 1. Bilah Header Kebidanan / Neonatus
  const headerBar = document.createElement('div');
  headerBar.className = 'bg-gradient-to-r from-rose-900 via-pink-900 to-purple-900 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm';
  headerBar.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-400/30 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-black text-pink-300 uppercase tracking-wider">${isNeonatus ? 'Perinatologi & Neonatus' : 'Kamar Bersalin & Tindakan VK'}</span>
          <span class="px-2 py-0.5 rounded-full bg-pink-400/20 text-pink-200 text-[10px] font-extrabold border border-pink-400/30">Maternal &amp; Child Health</span>
        </div>
        <h3 class="text-base font-extrabold tracking-tight mt-0.5">${ward.name} • ${isNeonatus ? 'Inkubator &amp; Boks Bayi' : 'Bed Tindakan Partus &amp; Observasi'}</h3>
      </div>
    </div>
    <div class="flex items-center gap-2 text-xs font-bold">
      <span class="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">Tersedia: <strong class="text-emerald-300">${ward.available}</strong> Bed</span>
      <span class="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">Terisi: <strong class="text-pink-300">${ward.occupied}</strong> Bed</span>
    </div>
  `;
  container.appendChild(headerBar);

  // 2. Grid Tempat Tidur Kebidanan / Neonatus
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
  container.appendChild(grid);

  for (let i = 1; i <= ward.total; i++) {
    const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
    const isOccupied = i <= ward.occupied;

    // Tipe alat untuk VK vs Neonatus
    let bedType = '';
    let clinicalSubtext = '';
    if (isNeonatus) {
      if (i <= 6) {
        bedType = 'Inkubator Intensif';
        clinicalSubtext = isOccupied ? 'Suhu 36.5°C • Fototerapi Aktif' : 'Steril & Hangat Siap Pakai';
      } else {
        bedType = 'Baby Crib / Boks Bayi';
        clinicalSubtext = isOccupied ? 'Rawat Gabung Ibu-Anak' : 'Siap Pakai';
      }
    } else {
      if (i <= 5) {
        bedType = 'Bed Partus / Kamar Bersalin';
        clinicalSubtext = isOccupied ? 'Fase Aktif Persalinan' : 'Steril Siap Tindakan';
      } else {
        bedType = 'Bed Observasi Post-Partum';
        clinicalSubtext = isOccupied ? 'Observasi TTV 2 Jam PP' : 'Siap Pasien Baru';
      }
    }

    const card = document.createElement('div');
    card.className = `rounded-2xl border p-4 shadow-2xs space-y-2.5 transition ${isOccupied ? 'border-pink-200 bg-white' : 'border-emerald-200 bg-emerald-50/30'}`;

    card.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-100 pb-2">
        <div>
          <span class="text-xs font-black text-slate-900 tracking-tight block">${bedCode}</span>
          <span class="text-[10px] font-bold text-pink-600 uppercase tracking-wider">${bedType}</span>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-pink-100 text-pink-800' : 'bg-emerald-100 text-emerald-800'}">
          <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-pink-600' : 'bg-emerald-600'}"></span>
          ${isOccupied ? 'Terisi' : 'Tersedia'}
        </span>
      </div>

      <div class="py-1 px-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 space-y-1">
        <div class="flex items-center justify-between text-[11px] font-semibold">
          <span>Status Unit:</span>
          <span class="font-bold text-slate-900">${clinicalSubtext}</span>
        </div>
        <div class="flex items-center justify-between text-[10px] text-slate-500">
          <span>Infant Warmer / CTG:</span>
          <span class="font-bold text-emerald-600">Siap Operasional</span>
        </div>
      </div>

      ${canEdit ? `
        <div class="pt-2 border-t border-slate-100">
          <button type="button" class="btn-toggle-mat w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition text-center">
            ${isOccupied ? 'Selesai Observasi / Kosongkan' : 'Registrasi Pasien Masuk'}
          </button>
        </div>
      ` : ''}
    `;

    if (canEdit) {
      card.querySelector('.btn-toggle-mat')?.addEventListener('click', async () => {
        const nextStatus = isOccupied ? 'available' : 'occupied';
        const conn = getConnectionState();
        if (conn.isConnected) {
          showToast(`Menyimpan status ${bedCode} ke basis data Supabase...`);
          await updateBedStatusDb(bedCode, nextStatus, appState.currentNip, appState.currentRole, { bed_code: bedCode, ward: ward.id, type: bedType });
          showToast(`Status Bed ${bedCode} berhasil diperbarui!`, 'success');
        } else {
          showToast(`Status Bed ${bedCode} diperbarui (Lokal).`, 'success');
        }

        if (isOccupied) {
          ward.occupied = Math.max(0, ward.occupied - 1);
          ward.available = Math.min(ward.total, ward.available + 1);
        } else {
          ward.occupied = Math.min(ward.total, ward.occupied + 1);
          ward.available = Math.max(0, ward.available - 1);
        }

        renderMaternityWard(ward, container, canEdit, meta);
        updateWardHud(ward.id);
        renderSidebarWards();
      });
    }

    grid.appendChild(card);
  }
}
