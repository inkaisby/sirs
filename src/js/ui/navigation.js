import { appState, ROLE_META, WARDS_DATA } from '../state.js';
import { showToast } from './toast.js';
import { WARD_CATEGORIES } from '../modules/wards.js';

export function toggleSidebarCollapse() {
  appState.isSidebarCollapsed = !appState.isSidebarCollapsed;
  const sidebar = document.getElementById('app-sidebar');
  const wrapper = document.getElementById('main-content-wrapper');
  const icon = document.getElementById('sidebar-collapse-icon');
  if (!sidebar || !wrapper) return;

  if (appState.isSidebarCollapsed) {
    sidebar.classList.add('sidebar-collapsed');
    sidebar.classList.remove('w-64');
    sidebar.classList.add('w-20');
    wrapper.classList.remove('md:ml-64');
    wrapper.classList.add('md:ml-20');
    if (icon) icon.classList.add('rotate-180');
  } else {
    sidebar.classList.remove('sidebar-collapsed');
    sidebar.classList.remove('w-20');
    sidebar.classList.add('w-64');
    wrapper.classList.remove('md:ml-20');
    wrapper.classList.add('md:ml-64');
    if (icon) icon.classList.remove('rotate-180');
  }
}

export function toggleSidebarMobile(open = true) {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar || !backdrop) return;
  if (open) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

export function renderSidebarWards(onSelectWard) {
  const filterInput = document.getElementById('sidebar-ward-filter');
  const filterWrapper = document.getElementById('sidebar-ward-filter-wrapper');
  const headingEl = document.getElementById('sidebar-wards-heading');
  const countEl = document.getElementById('sidebar-wards-count');
  const container = document.getElementById('sidebar-wards-list');
  if (!container) return;
  container.innerHTML = '';

  const q = (filterInput?.value || '').toLowerCase().trim();
  const currentWard = document.getElementById('ward-selector')?.value || 'DAHLIA';
  const role = appState.currentRole;
  const userAllowedWard = ROLE_META[role]?.allowedWard || 'ALL';

  let wardsToShow = WARDS_DATA;

  // Jika akun memiliki penugasan ruangan khusus (Bukan ALL dan Bukan NONE)
  if (userAllowedWard !== 'ALL' && userAllowedWard !== 'NONE') {
    // Sembunyikan ruangan lain, HANYA tampilkan ruangan milik akun yang login
    wardsToShow = WARDS_DATA.filter(w => w.id === userAllowedWard);
    if (headingEl) headingEl.textContent = 'Ruangan Jaga Anda';
    if (countEl) countEl.textContent = '1 Ruangan';
    if (filterWrapper) filterWrapper.classList.add('hidden');
  } else if (role === 'cathlab') {
    // Akun Cathlab fokus ke unit Cathlab
    if (headingEl) headingEl.textContent = 'Unit Penugasan';
    if (countEl) countEl.textContent = 'Instalasi Cathlab';
    if (filterWrapper) filterWrapper.classList.add('hidden');
    container.innerHTML = `
      <div class="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs shadow-2xs">
        <div class="flex items-center gap-2 font-black text-cyan-800 mb-1">
          <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <span>Instalasi Cathlab</span>
        </div>
        <p class="text-[11px] text-cyan-700 leading-snug">Akses fokus pada jadwal &amp; lembar tindakan kateterisasi vaskular.</p>
      </div>
    `;
    return;
  } else {
    // Admin Yanmed / Public Display: Menampilkan seluruh 22 ruangan
    if (headingEl) headingEl.textContent = '22 Ruang Rawat Inap';
    if (countEl) countEl.textContent = '384 Bed';
    if (filterWrapper) filterWrapper.classList.remove('hidden');
    wardsToShow = WARDS_DATA.filter(w => w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q));
  }

  wardsToShow.forEach(w => {
    const isActive = appState.currentTab === 'wards' && currentWard === w.id;
    const isUserWard = userAllowedWard === w.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.onclick = () => {
      if (typeof onSelectWard === 'function') {
        onSelectWard(w.id);
      } else if (typeof window.openWardDetail === 'function') {
        window.openWardDetail(w.id);
      }
      if (window.innerWidth < 768) toggleSidebarMobile(false);
    };

    const activeClass = isActive
      ? 'bg-blue-50 text-blue-800 font-extrabold border border-blue-200 shadow-2xs'
      : 'text-slate-600 hover:bg-slate-100 font-semibold';

    btn.className = `sidebar-ward-item w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition ${activeClass}`;
    btn.title = `Ruang ${w.name} (${w.available} bed kosong)`;

    btn.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full ${w.available > 0 ? 'bg-emerald-500' : 'bg-rose-500'} shrink-0"></span>
        <span class="sidebar-text-group truncate">${w.name}</span>
        ${isUserWard ? '<span class="sidebar-text-group text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold shrink-0">Ruangan Anda</span>' : ''}
      </div>
      <span class="ward-badge-pill text-[10px] font-bold px-1.5 py-0.5 rounded ${w.available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} shrink-0">
        ${w.available} Kosong
      </span>
    `;
    container.appendChild(btn);
  });
}

export function updateSidebarRoleFocus(role) {
  const meta = ROLE_META[role] || ROLE_META.admin_yanmed;
  const allowedWard = meta.allowedWard || 'ALL';

  // Sesuaikan visibilitas tombol navigasi di sidebar utama
  document.querySelectorAll('[data-sidebar-tab]').forEach(btn => {
    const tab = btn.dataset.sidebarTab;
    if (role === 'cathlab') {
      btn.classList.toggle('hidden', tab !== 'cathlab' && tab !== 'dashboard');
    } else if (role === 'igd_admission') {
      btn.classList.toggle('hidden', tab === 'cathlab');
    } else if (allowedWard !== 'ALL' && allowedWard !== 'NONE') {
      btn.classList.toggle('hidden', tab === 'cathlab');
    } else {
      btn.classList.remove('hidden');
    }
  });

  // Sesuaikan tab horizontal header atas
  document.querySelectorAll('#main-nav-tabs .nav-tab-btn').forEach(btn => {
    const tab = btn.dataset.tab;
    if (role === 'cathlab') {
      btn.classList.toggle('hidden', tab !== 'cathlab' && tab !== 'dashboard');
    } else if (role === 'igd_admission') {
      btn.classList.toggle('hidden', tab === 'cathlab');
    } else if (allowedWard !== 'ALL' && allowedWard !== 'NONE') {
      btn.classList.toggle('hidden', tab === 'cathlab');
    } else {
      btn.classList.remove('hidden');
    }
  });

  renderSidebarWards();
}

export function updateWardHud(wardId) {
  const ward = WARDS_DATA.find(w => w.id === wardId) || WARDS_DATA[1];
  const titleEl = document.getElementById('ward-hud-title');
  const descEl = document.getElementById('ward-hud-desc');
  const badgeEl = document.getElementById('ward-hud-access-badge');
  const meta = ROLE_META[appState.currentRole] || ROLE_META.admin_yanmed;
  const canEdit = meta.allowedWard === 'ALL' || meta.allowedWard === ward.id;

  const cat = WARD_CATEGORIES?.[ward.id] || 'standard';
  const prefix = cat === 'intensive'
    ? 'Unit Perawatan Intensif'
    : cat === 'maternity'
    ? 'Instalasi Kebidanan & Anak'
    : cat === 'isolation'
    ? 'Unit Isolasi Khusus'
    : 'Ruang Rawat Inap';

  if (titleEl) titleEl.textContent = `${prefix} ${ward.name}`;
  if (descEl) {
    const pct = ward.total > 0 ? Math.round((ward.occupied / ward.total) * 100) : 0;
    descEl.textContent = `Kapasitas: ${ward.total} Bed • Terisi: ${ward.occupied} • Inden: ${ward.inden} • Tersedia: ${ward.available} Bed (Okupansi: ${pct}%)`;
  }
  if (badgeEl) {
    badgeEl.textContent = canEdit ? 'Akses Penuh Edit' : 'Mode Baca-Saja';
    badgeEl.className = canEdit
      ? 'px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold'
      : 'px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-300 border border-slate-400/30 text-[10px] font-extrabold';
  }
}

export function switchTab(tabName) {
  appState.currentTab = tabName;
  ['dashboard', 'cathlab', 'igd', 'wards', 'reports'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tabName);
  });

  // Update style tab horizontal
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.className = active
      ? 'nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-700 text-white whitespace-nowrap transition'
      : 'nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 whitespace-nowrap transition';
  });

  // Update style sidebar menu item
  document.querySelectorAll('[data-sidebar-tab]').forEach(btn => {
    const active = btn.dataset.sidebarTab === tabName;
    btn.className = active
      ? 'sidebar-nav-item w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-blue-700 bg-blue-50 font-bold border border-blue-200 transition'
      : 'sidebar-nav-item w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold transition';
  });

  if (tabName === 'cathlab') {
    if (typeof window.loadTindakanData === 'function') {
      window.loadTindakanData();
    }
  } else if (tabName === 'wards') {
    const currentWard = document.getElementById('ward-selector')?.value || 'DAHLIA';
    updateWardHud(currentWard);
  }

  renderSidebarWards();
}

export function toggleComfortMode() {
  document.body.classList.toggle('comfort-warm-mode');
  const isWarm = document.body.classList.contains('comfort-warm-mode');
  const btn = document.getElementById('btn-comfort-mode');
  if (btn) btn.textContent = isWarm ? '🌙 Hangat' : '☀️ Nyaman';
}

export function openBriefingPlayer() {
  showToast('Mode Tour Sistem SIIRS: Pilih peran pada kartu login untuk mencoba hak akses RBAC.');
}
