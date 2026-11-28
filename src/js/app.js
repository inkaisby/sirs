/**
 * SIIRS — Sistem Informasi Integrasi Rumah Sakit
 * RSUD Dr. M. Soewandhie Surabaya
 * Main Application Orchestrator & Entry Point
 */

import { SIIRS_CONFIG, toggleDbTarget, setDbTarget, LOGTO_CONFIG } from './config.js';
import {
  initLogtoClient,
  signInWithLogto,
  signOutFromLogto,
  getCurrentLogtoUser,
  saveLogtoSettings
} from './logtoClient.js';
import {
  initSupabase,
  getSupabase,
  getConnectionState,
  getActiveSession,
  createSecureSession,
  handleGoogleOAuthCallback
} from './supabaseClient.js';

import { appState, ROLE_META, WARDS_DATA, IGD_QUEUE } from './state.js';
import { showToast } from './ui/toast.js';
import {
  switchTab,
  toggleSidebarCollapse,
  toggleSidebarMobile,
  renderSidebarWards,
  updateSidebarRoleFocus,
  updateWardHud,
  toggleComfortMode,
  openBriefingPlayer
} from './ui/navigation.js';

import {
  checkDbConnection,
  updateDbBadges,
  togglePasswordVisibility,
  handlePortalLogin,
  quickLoginAs,
  openTopLoginModal,
  closeTopLoginModal,
  submitModalLogin,
  enterPublicDisplay,
  enterDashboardWithRole,
  logoutToPortal,
  setNewAccountLockdown,
  switchRole,
  handleGoogleSignIn,
  openModalGoogleConfig,
  closeModalGoogleConfig,
  copySupabaseCallbackUri,
  testSimulateGoogleLogin,
  initIdleTimerWatcher
} from './modules/auth.js';

import {
  renderWardTable,
  openWardDetail,
  initWardSelector,
  renderBedBoard,
  openPatientDrawer,
  closePatientDrawer
} from './modules/wards.js';

import {
  loadTindakanData,
  filterTindakanData,
  handleInlineStatusChange,
  openDetailTindakan,
  closeDetailTindakan,
  openModalTambahTindakan,
  closeModalTambahTindakan,
  submitTambahTindakan,
  exportTindakanCsv
} from './modules/cathlab.js';

import { renderIgdQueue } from './modules/igd.js';

import {
  openAccountSettingsModal,
  closeAccountSettingsModal,
  switchAccountModalTab,
  applyWardDutySwitch,
  applyPasswordChange,
  openProfilePhotoModal,
  closeProfilePhotoModal,
  handleFilePhotoSelected,
  fetchPhotoFromGoogleDrive,
  saveCompressedPhoto,
  resetProfilePhotoToDefault,
  loadSavedAvatar,
  initClipboardPasteListener
} from './modules/account.js';

import { submitSpecialReport } from './modules/reports.js';

// =========================================================================
// EXPOSE HANDLERS KE WINDOW UNTUK KOMPATIBILITAS EVENT HANDLER INLINE HTML
// =========================================================================
window.showToast = showToast;
window.switchTab = switchTab;
window.handlePortalLogin = handlePortalLogin;
window.quickLoginAs = quickLoginAs;
window.openTopLoginModal = openTopLoginModal;
window.closeTopLoginModal = closeTopLoginModal;
window.submitModalLogin = submitModalLogin;
window.enterPublicDisplay = enterPublicDisplay;
window.logoutToPortal = logoutToPortal;
window.switchRole = switchRole;
window.openWardDetail = openWardDetail;
window.openPatientDrawer = openPatientDrawer;
window.closePatientDrawer = closePatientDrawer;
window.toggleComfortMode = toggleComfortMode;
window.openBriefingPlayer = openBriefingPlayer;
window.submitSpecialReport = submitSpecialReport;
window.togglePasswordVisibility = togglePasswordVisibility;
window.checkDbConnection = checkDbConnection;
window.updateDbBadges = updateDbBadges;
window.loadTindakanData = loadTindakanData;
window.filterTindakanData = filterTindakanData;
window.handleInlineStatusChange = handleInlineStatusChange;
window.openDetailTindakan = openDetailTindakan;
window.closeDetailTindakan = closeDetailTindakan;
window.openModalTambahTindakan = openModalTambahTindakan;
window.closeModalTambahTindakan = closeModalTambahTindakan;
window.submitTambahTindakan = submitTambahTindakan;
window.exportTindakanCsv = exportTindakanCsv;
window.toggleDbMode = () => toggleDbTarget();
window.handleGoogleSignIn = handleGoogleSignIn;
window.openModalGoogleConfig = openModalGoogleConfig;
window.closeModalGoogleConfig = closeModalGoogleConfig;
window.copySupabaseCallbackUri = copySupabaseCallbackUri;
window.testSimulateGoogleLogin = testSimulateGoogleLogin;
window.setNewAccountLockdown = setNewAccountLockdown;

// Sidebar & Pengaturan Akun & Foto Profil
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.toggleSidebarMobile = toggleSidebarMobile;
window.renderSidebarWards = renderSidebarWards;
window.openAccountSettingsModal = openAccountSettingsModal;
window.closeAccountSettingsModal = closeAccountSettingsModal;
window.switchAccountModalTab = switchAccountModalTab;
window.applyWardDutySwitch = applyWardDutySwitch;
window.applyPasswordChange = applyPasswordChange;
window.openProfilePhotoModal = openProfilePhotoModal;
window.closeProfilePhotoModal = closeProfilePhotoModal;
window.handleFilePhotoSelected = handleFilePhotoSelected;
window.fetchPhotoFromGoogleDrive = fetchPhotoFromGoogleDrive;
window.saveCompressedPhoto = saveCompressedPhoto;
window.resetProfilePhotoToDefault = resetProfilePhotoToDefault;

// =========================================================================
// INISIALISASI UTAMA SAAT HALAMAN DIMUAT (DOMContentLoaded)
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Inisialisasi event listener background
  initIdleTimerWatcher();
  initClipboardPasteListener();

  // 2. Perbarui label target database di kartu login
  const labelTarget = document.getElementById('label-db-target');
  if (labelTarget) {
    labelTarget.textContent = SIIRS_CONFIG.dbTarget === 'local' ? 'DB: Docker (54321)' : 'DB: Cloud Supabase';
  }

  // 3. Render awal komponen tabel dan denah
  initWardSelector();
  updateSidebarRoleFocus(appState.currentRole);
  renderWardTable();
  renderIgdQueue();
  renderBedBoard('DAHLIA');
  loadSavedAvatar(appState.currentNip);
  updateDbBadges();

  // 4. Hubungkan ke Supabase (Docker lokal atau Cloud)
  try {
    await initSupabase();
    updateDbBadges();
  } catch (err) {
    console.warn('Inisialisasi Supabase gagal, menggunakan mode mandiri:', err);
  }

  // 5. Cek sesi Google OAuth yang kembali dari alur autentikasi Supabase
  try {
    const googleUser = await handleGoogleOAuthCallback();
    if (googleUser && googleUser.role) {
      const savedWard = localStorage.getItem('siirs_ward_selected_' + googleUser.nip);
      let effectiveRole = googleUser.role;
      if (effectiveRole === 'new_account' || (!savedWard && effectiveRole !== 'admin_yanmed' && effectiveRole !== 'cathlab' && effectiveRole !== 'igd_admission')) {
        effectiveRole = 'new_account';
      }

      createSecureSession({
        user: googleUser.user,
        nip: googleUser.nip,
        role: effectiveRole,
        allowedWard: ROLE_META[effectiveRole]?.allowedWard || 'NONE',
        authProvider: 'GOOGLE_SUPABASE'
      });
      enterDashboardWithRole(effectiveRole, googleUser.nip);
      showToast(`Berhasil masuk dengan Google: ${googleUser.user}`, 'success');
      return;
    }
  } catch (gErr) {
    console.warn('Google auth check error:', gErr);
  }

  // 6. Deteksi parameter URL untuk 1-Klik Masuk Otomatis (misal: ?login=cathlab)
  const urlParams = new URLSearchParams(window.location.search);
  const autoLogin = urlParams.get('login') || urlParams.get('role');
  if (autoLogin) {
    const targetRole = (autoLogin.toLowerCase() === 'cath' || autoLogin.toLowerCase() === 'cathlab') ? 'cathlab' : autoLogin;
    if (ROLE_META[targetRole]) {
      quickLoginAs(targetRole);
      return;
    }
  }

  // 7. Periksa pemulihan sesi aktif yang valid
  const existingSession = getActiveSession();
  if (existingSession && existingSession.role) {
    enterDashboardWithRole(existingSession.role, existingSession.nip);
    showToast(`Sesi aktif dipulihkan: ${existingSession.user}`, 'info');
  }
});
