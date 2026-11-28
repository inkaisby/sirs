import { appState, ROLE_META } from '../state.js';
import { showToast } from '../ui/toast.js';
import { switchTab, renderSidebarWards, updateSidebarRoleFocus } from '../ui/navigation.js';
import { renderWardTable, renderBedBoard, initWardSelector } from './wards.js';
import { renderIgdQueue } from './igd.js';
import { loadSavedAvatar, openAccountSettingsModal } from './account.js';
import {
  initSupabase,
  getConnectionState,
  authenticatePetugas,
  createSecureSession,
  destroySession,
  logSecurityAudit,
  signInWithGoogle,
  simulateGoogleLogin
} from '../supabaseClient.js';
import { signOutFromLogto } from '../logtoClient.js';

let idleTimer = null;
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 menit

export function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  const isDashboardActive = !document.getElementById('main-app-shell')?.classList.contains('hidden');
  if (isDashboardActive && appState.currentRole !== 'public_display') {
    idleTimer = setTimeout(() => {
      logoutToPortal('Sesi dinonaktifkan otomatis demi keamanan workstation (15 menit tanpa aktivitas).');
    }, IDLE_LIMIT_MS);
  }
}

export function initIdleTimerWatcher() {
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });
}

export async function checkDbConnection(silent = false) {
  if (!silent) showToast('Memeriksa koneksi basis data Supabase...', 'info');
  try {
    await initSupabase();
    updateDbBadges();
    const conn = getConnectionState();
    if (!silent) {
      if (conn.isConnected && conn.mode !== 'migration_needed') {
        showToast(conn.mode === 'cloud' ? 'Terhubung ke Supabase Cloud (Shared IDIK).' : 'Terhubung ke Docker Lokal (54321).', 'success');
      } else if (conn.mode === 'migration_needed') {
        showToast('Supabase terhubung. Tabel siirs_beds siap dimigrasi via SQL.', 'warn');
      } else {
        showToast('Database offline, beralih ke mode mandiri lokal.', 'info');
      }
    }
  } catch (e) {
    updateDbBadges();
  }
}

export function updateDbBadges() {
  const conn = getConnectionState();
  const portalBadge = document.getElementById('portal-db-badge');
  const headerPill = document.getElementById('header-db-pill');

  let label = '⚪ Mode Mandiri (Offline)';
  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let titleTooltip = 'Menggunakan cache data lokal';

  if (conn.isConnected) {
    if (conn.mode === 'local') {
      label = '🟢 DB Lokal (Docker: 54321)';
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      titleTooltip = `Terhubung ke PostgreSQL Docker (${conn.endpoint || '127.0.0.1:54321'})`;
    } else if (conn.mode === 'cloud') {
      label = '🟢 DB Cloud (Supabase)';
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      titleTooltip = `Terhubung ke Supabase Cloud (${conn.endpoint || 'whbinarvynbyemvqbfjg.supabase.co'})`;
    } else if (conn.mode === 'migration_needed') {
      label = '🟡 DB Terhubung (Perlu Migrasi SQL)';
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
      titleTooltip = 'Supabase terhubung. Eksekusi file SQL di supabase/migrations untuk mengaktifkan tabel siirs_beds.';
    }
  } else if (conn.mode === 'checking') {
    label = '🔄 Memeriksa DB...';
    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
    titleTooltip = 'Sedang menguji koneksi jaringan ke basis data...';
  }

  if (portalBadge) {
    portalBadge.textContent = label;
    portalBadge.className = `px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition cursor-pointer ${badgeClass}`;
    portalBadge.title = `${titleTooltip} — Klik untuk periksa ulang`;
  }
  if (headerPill) {
    headerPill.textContent = label;
    headerPill.className = `hidden sm:inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border transition cursor-pointer ${badgeClass}`;
    headerPill.title = `${titleTooltip} — Klik untuk periksa ulang`;
  }
}

export function togglePasswordVisibility() {
  const input = document.getElementById('login-password');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

export async function handlePortalLogin(e) {
  e.preventDefault();
  const nipInput = document.getElementById('login-nip')?.value;
  const passInput = document.getElementById('login-password')?.value;
  const role = document.getElementById('login-role-select')?.value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Memverifikasi Keamanan...</span>';
  }

  try {
    const authResult = await authenticatePetugas(nipInput, passInput, role);
    if (!authResult.success) {
      showToast(authResult.message, 'warn');
      return;
    }

    let effectiveRole = authResult.role || role;
    if (role === 'new_account') {
      effectiveRole = 'new_account';
      localStorage.removeItem('siirs_ward_selected_' + authResult.nip);
    }

    createSecureSession({
      user: ROLE_META[effectiveRole].user,
      nip: authResult.nip,
      role: effectiveRole,
      allowedWard: ROLE_META[effectiveRole].allowedWard
    });

    enterDashboardWithRole(effectiveRole, authResult.nip);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Masuk ke Dashboard SIIRS</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    }
  }
}

export async function quickLoginAs(role) {
  let nip = '199204152020121004';
  let pass = 'soewandhie2026';
  if (role === 'cathlab') {
    nip = 'cathlab';
    pass = '123456';
  } else if (role === 'new_account') {
    nip = '199508102022032008';
    pass = 'soewandhie2026';
    localStorage.removeItem('siirs_ward_selected_' + nip);
  } else {
    nip = document.getElementById('login-nip')?.value.trim() || '199204152020121004';
  }

  const authResult = await authenticatePetugas(nip, pass, role);
  if (!authResult.success) {
    showToast(authResult.message, 'warn');
    return;
  }

  let effectiveRole = authResult.role || role;
  if (role === 'new_account') {
    effectiveRole = 'new_account';
  }

  createSecureSession({
    user: ROLE_META[effectiveRole].user,
    nip: authResult.nip,
    role: effectiveRole,
    allowedWard: ROLE_META[effectiveRole].allowedWard
  });

  enterDashboardWithRole(effectiveRole, authResult.nip);
}

export function openTopLoginModal() {
  document.getElementById('top-login-modal')?.classList.remove('hidden');
}

export function closeTopLoginModal() {
  document.getElementById('top-login-modal')?.classList.add('hidden');
}

export async function submitModalLogin() {
  const nip = document.getElementById('modal-nip')?.value.trim() || '199204152020121004';
  const role = document.getElementById('modal-role')?.value || 'admin_yanmed';
  const pass = nip.toLowerCase() === 'cathlab' ? '123456' : 'soewandhie2026';
  
  const authResult = await authenticatePetugas(nip, pass, role);
  if (!authResult.success) {
    showToast(authResult.message, 'warn');
    return;
  }

  closeTopLoginModal();
  const effectiveRole = authResult.role || role;
  createSecureSession({
    user: ROLE_META[effectiveRole].user,
    nip: authResult.nip,
    role: effectiveRole,
    allowedWard: ROLE_META[effectiveRole].allowedWard
  });

  enterDashboardWithRole(effectiveRole, authResult.nip);
}

export function enterPublicDisplay() {
  destroySession();
  enterDashboardWithRole('public_display', 'PUBLIK');
}

export function enterDashboardWithRole(role, nip) {
  appState.currentNip = nip;
  document.getElementById('landing-login-gateway')?.classList.add('hidden');
  document.getElementById('main-app-shell')?.classList.remove('hidden');
  switchRole(role, nip);
  resetIdleTimer();
  updateDbBadges();
  showToast(`Berhasil masuk sebagai ${ROLE_META[role].label}`, 'success');
}

export async function logoutToPortal(customMsg) {
  if (idleTimer) clearTimeout(idleTimer);
  await logSecurityAudit('AUTH_LOGOUT', appState.currentNip, appState.currentRole, {
    reason: customMsg || 'User logged out voluntarily'
  });
  await signOutFromLogto();
  destroySession();
  document.getElementById('main-app-shell')?.classList.add('hidden');
  document.getElementById('landing-login-gateway')?.classList.remove('hidden');
  showToast(customMsg || 'Anda telah keluar dari sesi operasional SIIRS.', 'info');
}

export function setNewAccountLockdown(active) {
  appState.isNewAccountLockdown = active;
  const banner = document.getElementById('new-account-lockdown-banner');
  if (banner) banner.classList.toggle('hidden', !active);

  // Nonaktifkan / aktifkan menu utama di sidebar
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    if (active) {
      el.classList.add('pointer-events-none', 'opacity-30', 'cursor-not-allowed');
      el.setAttribute('tabindex', '-1');
    } else {
      el.classList.remove('pointer-events-none', 'opacity-30', 'cursor-not-allowed');
      el.removeAttribute('tabindex');
    }
  });

  // Nonaktifkan / aktifkan daftar 22 bangsal di sidebar
  const wardList = document.getElementById('sidebar-wards-list');
  const wardFilter = document.getElementById('sidebar-ward-filter');
  if (wardList) {
    if (active) {
      wardList.classList.add('pointer-events-none', 'opacity-30', 'cursor-not-allowed');
    } else {
      wardList.classList.remove('pointer-events-none', 'opacity-30', 'cursor-not-allowed');
    }
  }
  if (wardFilter) {
    wardFilter.disabled = active;
    if (active) wardFilter.classList.add('opacity-40');
    else wardFilter.classList.remove('opacity-40');
  }

  // Nonaktifkan / aktifkan nav tabs horizontal
  const navTabs = document.getElementById('main-nav-tabs');
  if (navTabs) {
    if (active) {
      navTabs.classList.add('pointer-events-none', 'opacity-30');
    } else {
      navTabs.classList.remove('pointer-events-none', 'opacity-30');
    }
  }

  // Nonaktifkan switcher peran jika terkunci
  const switcher = document.getElementById('active-role-switcher');
  if (switcher) {
    switcher.disabled = active;
  }

  // Berikan animasi sorotan khusus pada tombol Pengaturan di sidebar
  const btnSettings = document.getElementById('btn-sidebar-settings');
  if (btnSettings) {
    if (active) {
      btnSettings.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100', 'text-amber-950', 'font-black', 'animate-pulse');
    } else {
      btnSettings.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-100', 'text-amber-950', 'font-black', 'animate-pulse');
    }
  }
}

export function switchRole(role, nip = appState.currentNip) {
  appState.currentRole = role;
  const meta = ROLE_META[role] || ROLE_META.admin_yanmed;
  const activeSwitcher = document.getElementById('active-role-switcher');
  if (activeSwitcher) activeSwitcher.value = role;

  const badgeHeader = document.getElementById('role-badge-header');
  if (badgeHeader) badgeHeader.textContent = meta.label;

  const userInfo = document.getElementById('header-user-info');
  if (userInfo) userInfo.textContent = `${meta.user} (${nip})`;

  // Perbarui label sidebar
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarUserRole = document.getElementById('sidebar-user-role-badge');
  const sidebarFallback = document.getElementById('sidebar-avatar-fallback');
  if (sidebarUserName) sidebarUserName.textContent = meta.user.split('(')[0].trim();
  if (sidebarUserRole) sidebarUserRole.textContent = meta.allowedWard !== 'ALL' && meta.allowedWard !== 'NONE' ? `Ruang ${meta.allowedWard}` : meta.label;
  if (sidebarFallback) {
    const words = meta.label.split(' ');
    sidebarFallback.textContent = words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  loadSavedAvatar(nip);

  const isPublic = role === 'public_display';
  document.getElementById('public-mode-banner')?.classList.toggle('hidden', !isPublic);
  document.getElementById('main-nav-tabs')?.classList.toggle('hidden', isPublic);

  // Alur pengalihan akun baru
  if (role === 'new_account') {
    setNewAccountLockdown(true);
    switchTab('dashboard');
    setTimeout(() => openAccountSettingsModal(true), 350);
    showToast('Akun Baru: Seluruh modul dikunci sementara. Silakan pilih ruangan jaga Anda terlebih dahulu.', 'warn');
  } else {
    setNewAccountLockdown(false);
    if (isPublic) {
      switchTab('dashboard');
    } else if (role === 'cathlab') {
      switchTab('cathlab');
    } else if (role === 'igd_admission') {
      switchTab('igd');
    } else if (meta.allowedWard && meta.allowedWard !== 'ALL' && meta.allowedWard !== 'NONE') {
      const wardSelector = document.getElementById('ward-selector');
      if (wardSelector) wardSelector.value = meta.allowedWard;
      switchTab('wards');
      renderBedBoard(meta.allowedWard);
    } else {
      switchTab('dashboard');
    }
  }

  initWardSelector();
  updateSidebarRoleFocus(role);
  renderWardTable();
  renderIgdQueue();
  const currentWard = document.getElementById('ward-selector')?.value || (meta.allowedWard && meta.allowedWard !== 'ALL' && meta.allowedWard !== 'NONE' ? meta.allowedWard : 'DAHLIA');
  renderBedBoard(currentWard);
}

export async function handleGoogleSignIn() {
  const selectedRole = document.getElementById('login-role-select')?.value || 'cathlab';
  showToast('Menghubungkan ke layanan Google OAuth...', 'info');

  try {
    const res = await signInWithGoogle(selectedRole);
    if (!res.success) {
      if (res.providerNotEnabled || (res.message && (res.message.includes('not enabled') || res.message.includes('provider') || res.message.includes('OAuth')))) {
        showToast('Google provider belum diaktifkan di Supabase Dashboard.', 'warn');
        openModalGoogleConfig();
      } else {
        showToast('Koneksi Google: ' + res.message, 'warn');
      }
    }
  } catch (err) {
    showToast('Koneksi Google bermasalah: ' + err.message, 'warn');
  }
}

export function openModalGoogleConfig() {
  document.getElementById('modal-google-config')?.classList.remove('hidden');
}

export function closeModalGoogleConfig() {
  document.getElementById('modal-google-config')?.classList.add('hidden');
}

export function copySupabaseCallbackUri() {
  const uri = 'https://whbinarvynbyemvqbfjg.supabase.co/auth/v1/callback';
  navigator.clipboard.writeText(uri).then(() => {
    showToast('Supabase Callback URI disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast(`URI: ${uri}`, 'info');
  });
}

export function testSimulateGoogleLogin(role) {
  closeModalGoogleConfig();
  const mockUser = simulateGoogleLogin(role);
  let effectiveRole = mockUser.role;
  if (role === 'new_account') {
    localStorage.removeItem('siirs_ward_selected_' + mockUser.nip);
    effectiveRole = 'new_account';
  }
  createSecureSession({
    user: mockUser.user,
    nip: mockUser.nip,
    role: effectiveRole,
    allowedWard: ROLE_META[effectiveRole]?.allowedWard || 'NONE',
    authProvider: 'GOOGLE_OAUTH_SIMULATION'
  });
  enterDashboardWithRole(effectiveRole, mockUser.nip);
  showToast(`Berhasil masuk via Google RSUD: ${mockUser.user}`, 'success');
}
