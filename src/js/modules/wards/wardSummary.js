import { WARDS_DATA } from '../../state.js';

export const WARD_CATEGORIES = {
  ICU: 'intensive',
  ICCU: 'intensive',
  MICU: 'intensive',
  ISU: 'intensive',
  NICU: 'intensive',
  VK: 'maternity',
  NEONATUS: 'maternity',
  BURN: 'isolation',
  ICU_ISO: 'isolation'
};

export const CATEGORY_META = {
  intensive: { label: 'Intensif', badge: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  maternity: { label: 'Kebidanan', badge: 'bg-pink-50 text-pink-800 border-pink-200' },
  isolation: { label: 'Isolasi', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  standard: { label: 'Bangsal', badge: 'bg-blue-50 text-blue-800 border-blue-200' }
};

export function renderWardTable() {
  const query = (document.getElementById('search-ward-input')?.value || '').toLowerCase();
  const tbody = document.getElementById('ward-summary-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  WARDS_DATA.filter(w => w.name.toLowerCase().includes(query) || (w.id || '').toLowerCase().includes(query)).forEach(w => {
    const pct = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
    const barColor = pct >= 85 ? 'bg-rose-500' : pct >= 65 ? 'bg-amber-500' : 'bg-emerald-500';
    const categoryKey = WARD_CATEGORIES[w.id] || 'standard';
    const catMeta = CATEGORY_META[categoryKey] || CATEGORY_META.standard;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/90 transition whitespace-nowrap';
    tr.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-900">${w.name}</span>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${catMeta.badge}">${catMeta.label}</span>
        </div>
      </td>
      <td class="py-3 px-3 text-center font-semibold text-slate-700">${w.total}</td>
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
        <button onclick="openWardDetail('${w.id}')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition shadow-2xs">
          Lihat Denah
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
