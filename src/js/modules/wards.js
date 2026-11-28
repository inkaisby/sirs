import { appState, ROLE_META, WARDS_DATA } from '../state.js';
import { showToast } from '../ui/toast.js';
import { switchTab, updateWardHud, renderSidebarWards } from '../ui/navigation.js';
import { getConnectionState, updateBedStatusDb } from '../supabaseClient.js';

export function renderWardTable() {
  const query = (document.getElementById('search-ward-input')?.value || '').toLowerCase();
  const tbody = document.getElementById('ward-summary-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  WARDS_DATA.filter(w => w.name.toLowerCase().includes(query)).forEach(w => {
    const pct = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
    const barColor = pct >= 85 ? 'bg-rose-500' : pct >= 65 ? 'bg-amber-500' : 'bg-emerald-500';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/90 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-extrabold text-slate-900">${w.name}</td>
      <td class="py-3 px-3 text-center font-semibold">${w.total}</td>
      <td class="py-3 px-3 text-center font-bold text-rose-600">${w.occupied}</td>
      <td class="py-3 px-3 text-center font-bold text-amber-600">${w.inden}</td>
      <td class="py-3 px-3 text-center font-semibold text-indigo-600">${w.prereferral}</td>
      <td class="py-3 px-3 text-center font-extrabold text-emerald-600">${w.available}</td>
      <td class="py-3 px-4">
        <div class="flex items-center gap-2">
          <div class="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full ${barColor}" style="width:${pct}%"></div>
          </div>
          <span class="font-bold text-[11px] text-slate-600">${pct}%</span>
        </div>
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="openWardDetail('${w.id}')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition">
          Lihat Bed
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function openWardDetail(wardId) {
  if (appState.currentRole === 'public_display') {
    showToast('Mode Publik bersifat baca-saja. Silakan login petugas untuk membuka detail bed.', 'warn');
    return;
  }
  const sel = document.getElementById('ward-selector');
  if (sel) sel.value = wardId;
  switchTab('wards');
  renderBedBoard(wardId);
}

export function initWardSelector() {
  const sel = document.getElementById('ward-selector');
  if (!sel) return;
  sel.innerHTML = '';
  WARDS_DATA.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `Ruang ${w.name} (${w.available} Tersedia / ${w.total} Bed)`;
    sel.appendChild(opt);
  });
  sel.value = 'DAHLIA';
}

export function renderBedBoard(wardId) {
  const ward = WARDS_DATA.find(w => w.id === wardId) || WARDS_DATA[1];
  const grid = document.getElementById('bed-board-grid');
  const meta = ROLE_META[appState.currentRole];
  const canEdit = meta.allowedWard === 'ALL' || meta.allowedWard === ward.id;

  const permNote = document.getElementById('ward-permission-note');
  if (permNote) {
    permNote.textContent = canEdit
      ? `Akses Edit Aktif untuk Ruang ${ward.name}. Klik kartu bed untuk memperbarui status.`
      : `Mode Baca-Saja (RBAC): Akun ${meta.label} tidak memiliki izin mengubah bed di Ruang ${ward.name}.`;
  }

  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 1; i <= ward.total; i++) {
    let status = 'Tersedia';
    let style = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (i <= ward.occupied) {
      status = 'Terisi';
      style = 'bg-rose-50 border-rose-200 text-rose-800';
    } else if (i <= ward.occupied + ward.inden) {
      status = 'Inden IGD';
      style = 'bg-amber-50 border-amber-200 text-amber-800';
    }

    const bedCode = `${ward.id}-${String(i).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.className = `p-3.5 rounded-2xl border text-left transition ${style} ${canEdit ? 'hover:shadow-sm cursor-pointer' : 'opacity-80 cursor-not-allowed'}`;
    btn.innerHTML = `
      <span class="text-[11px] font-extrabold block">${bedCode}</span>
      <span class="text-xs font-bold mt-1 block">${status}</span>
    `;
    btn.onclick = async () => {
      if (!canEdit) {
        showToast(`Ditolak (RBAC): ${meta.label} hanya dapat mengubah ruangannya sendiri.`, 'warn');
        return;
      }
      
      const conn = getConnectionState();
      if (conn.isConnected) {
        showToast(`Menyimpan perubahan ${bedCode} ke basis data Supabase...`);
        const res = await updateBedStatusDb(bedCode, status === 'Tersedia' ? 'occupied' : 'available', appState.currentNip, appState.currentRole, { bed_code: bedCode });
        if (res.success) {
          showToast(`Status Bed ${bedCode} berhasil diperbarui & tercatat di siirs_audit_logs!`, 'success');
        } else {
          showToast(`Status Bed ${bedCode} diperbarui di cache lokal.`, 'info');
        }
      } else {
        showToast(`Status Bed ${bedCode} diperbarui (Mode Mandiri/Lokal).`, 'success');
      }
    };
    grid.appendChild(btn);
  }

  updateWardHud(wardId);
  renderSidebarWards();
}
