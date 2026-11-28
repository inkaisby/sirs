import { appState, ROLE_META, WARDS_DATA } from '../../state.js';
import { showToast } from '../../ui/toast.js';
import { switchTab, updateWardHud } from '../../ui/navigation.js';

import { renderStandardWard, openAddPatientModal, closeAddPatientModal } from './renderers/standardWard.js';
import { renderIntensiveWard } from './renderers/intensiveWard.js';
import { renderMaternityWard } from './renderers/maternityWard.js';
import { renderIsolationWard } from './renderers/isolationWard.js';
import { renderWardTable, WARD_CATEGORIES, CATEGORY_META } from './wardSummary.js';
import { openPatientDrawer, closePatientDrawer } from './patientDetailDrawer.js';

export { renderWardTable, WARD_CATEGORIES, CATEGORY_META, openPatientDrawer, closePatientDrawer, openAddPatientModal, closeAddPatientModal };

// Registry renderer berbasis kategori perawatan
const RENDERER_REGISTRY = {
  intensive: renderIntensiveWard,
  maternity: renderMaternityWard,
  isolation: renderIsolationWard,
  standard: renderStandardWard
};

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
  
  const role = appState.currentRole;
  const userAllowedWard = ROLE_META[role]?.allowedWard || 'ALL';

  const wardsToOptions = (userAllowedWard !== 'ALL' && userAllowedWard !== 'NONE')
    ? WARDS_DATA.filter(w => w.id === userAllowedWard)
    : WARDS_DATA;

  wardsToOptions.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    const cat = WARD_CATEGORIES[w.id] || 'standard';
    const catLabel = CATEGORY_META[cat]?.label || 'Bangsal';
    opt.textContent = `[${catLabel}] ${w.name} (${w.available} Kosong / ${w.total} Bed)`;
    sel.appendChild(opt);
  });
  
  if (userAllowedWard !== 'ALL' && userAllowedWard !== 'NONE') {
    sel.value = userAllowedWard;
    sel.disabled = true;
    sel.title = 'Akses terkunci sesuai ruangan penugasan jaga akun Anda';
  } else {
    sel.disabled = false;
    sel.title = 'Pilih ruangan untuk melihat denah tempat tidur';
    if (!sel.value) sel.value = 'DAHLIA';
  }
}

export function renderBedBoard(wardId) {
  const ward = WARDS_DATA.find(w => w.id === wardId) || WARDS_DATA[1];
  const grid = document.getElementById('bed-board-grid');
  const meta = ROLE_META[appState.currentRole] || ROLE_META.admin_yanmed;
  const canEdit = meta.allowedWard === 'ALL' || meta.allowedWard === ward.id;

  const category = WARD_CATEGORIES[ward.id] || 'standard';
  const categoryInfo = CATEGORY_META[category] || CATEGORY_META.standard;

  const permNote = document.getElementById('ward-permission-note');
  if (permNote) {
    permNote.innerHTML = canEdit
      ? `<span class="inline-flex items-center gap-1 font-bold text-emerald-700">● Akses Edit Aktif:</span> Mengelola modul <strong>${categoryInfo.label} (${ward.name})</strong>. Perubahan langsung tersinkronisasi ke audit log.`
      : `<span class="inline-flex items-center gap-1 font-bold text-slate-500">○ Mode Baca-Saja (RBAC):</span> Akun ${meta.label} dibatasi untuk melihat denah ${ward.name}.`;
  }

  if (!grid) return;

  // Panggil renderer khusus yang terdaftar di registry
  const renderer = RENDERER_REGISTRY[category] || RENDERER_REGISTRY.standard;
  renderer(ward, grid, canEdit, meta);

  updateWardHud(ward.id);
}
