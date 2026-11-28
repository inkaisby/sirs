/**
 * Modul Integrasi Logto (Identity & Access Management / OIDC SSO)
 * SIIRS RSUD Dr. M. Soewandhie Surabaya
 *
 * Menggunakan @logto/browser via ESM untuk Single Sign-On (SSO)
 * terpusat lintas aplikasi rumah sakit (SIIRS, IDIK-App, SIMRS).
 */

import { LOGTO_CONFIG } from './config.js';
import { createSecureSession, logSecurityAudit } from './supabaseClient.js';

let logtoInstance = null;
let currentLogtoUser = null;

/**
 * Inisialisasi Logto Browser Client
 */
export async function initLogtoClient() {
  const endpoint = LOGTO_CONFIG.endpoint;
  const appId = LOGTO_CONFIG.appId;

  if (!endpoint || !appId) {
    return null;
  }

  try {
    const { default: LogtoClient } = await import('https://esm.sh/@logto/browser');
    logtoInstance = new LogtoClient({
      endpoint,
      appId,
      scopes: LOGTO_CONFIG.scopes || ['openid', 'profile', 'email', 'roles', 'custom_data'],
      resources: LOGTO_CONFIG.resources || []
    });

    // Periksa apakah ini halaman callback dari redirect Logto (?code=... atau ?state=...)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') && (urlParams.has('state') || window.location.pathname.includes('callback'))) {
      try {
        await logtoInstance.handleSignInCallback(window.location.href);
        // Bersihkan query string auth dari URL browser agar rapi
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (cbErr) {
        console.warn('[Logto] Gagal memproses callback:', cbErr.message);
      }
    }

    // Periksa apakah sesi Logto aktif
    const isAuthenticated = await logtoInstance.isAuthenticated();
    if (isAuthenticated) {
      const userInfo = await logtoInstance.fetchUserInfo();
      const claims = await logtoInstance.getIdTokenClaims();
      currentLogtoUser = {
        ...userInfo,
        claims,
        siirsRole: mapLogtoClaimsToSiirsRole(userInfo, claims)
      };
      return currentLogtoUser;
    }

    return null;
  } catch (err) {
    console.warn('[Logto] Inisialisasi SDK dilewati / offline:', err.message);
    return null;
  }
}

/**
 * Mapping peran dari token Logto (claims / roles / custom_data) ke peran resmi SIIRS
 */
export function mapLogtoClaimsToSiirsRole(userInfo, claims) {
  const roles = claims?.roles || userInfo?.roles || [];
  const username = (userInfo?.username || userInfo?.name || userInfo?.email || '').toLowerCase();
  const customData = userInfo?.custom_data || claims?.custom_data || {};

  // 1. Cek peran eksplisit di custom_data atau roles Logto
  if (customData.siirs_role) {
    return customData.siirs_role;
  }

  const roleStr = roles.join(',').toLowerCase();

  // 2. Evaluasi peran Cathlab
  if (roleStr.includes('cathlab') || username.includes('cathlab')) {
    return 'cathlab';
  }

  // 3. Evaluasi peran Admin Yanmed / Pelayanan Medik
  if (roleStr.includes('admin') || roleStr.includes('yanmed') || username.includes('yanmed')) {
    return 'admin_yanmed';
  }

  // 4. Evaluasi peran IGD & Admisi
  if (roleStr.includes('igd') || roleStr.includes('admission') || username.includes('igd')) {
    return 'igd_admission';
  }

  // 5. Evaluasi peran Perawat Bangsal
  if (roleStr.includes('dahlia') || username.includes('dahlia')) {
    return 'nurse_dahlia';
  }
  if (roleStr.includes('teratai') || username.includes('teratai')) {
    return 'nurse_teratai';
  }
  if (roleStr.includes('icu') || username.includes('icu')) {
    return 'nurse_icu';
  }

  // Default fallback
  return 'admin_yanmed';
}

/**
 * Memulai alur login redirect OIDC Logto
 */
export async function signInWithLogto() {
  const endpoint = LOGTO_CONFIG.endpoint;
  const appId = LOGTO_CONFIG.appId;

  // Cek apakah endpoint masih placeholder / belum disetel
  const isDummyEndpoint = !endpoint || endpoint.includes('placeholder');

  if (isDummyEndpoint && !logtoInstance) {
    // Tampilkan modal pengaturan kredensial Logto atau jalankan simulasi sandbox OIDC
    return {
      needsConfig: true,
      message: 'Kredensial Logto (Endpoint & App ID) belum disetel. Buka pengaturan untuk menyetel atau gunakan demo SSO.'
    };
  }

  try {
    if (!logtoInstance) {
      await initLogtoClient();
    }
    if (logtoInstance) {
      await logtoInstance.signIn(LOGTO_CONFIG.redirectUri);
      return { success: true };
    }
  } catch (err) {
    console.error('[Logto] Redirect sign in error:', err);
    return {
      success: false,
      message: 'Gagal mengarahkan ke portal Logto: ' + err.message
    };
  }

  return { success: false, message: 'Logto Client belum siap.' };
}

/**
 * Logout dari sesi Logto
 */
export async function signOutFromLogto() {
  if (logtoInstance) {
    try {
      const isAuth = await logtoInstance.isAuthenticated();
      if (isAuth) {
        await logtoInstance.signOut(LOGTO_CONFIG.postLogoutRedirectUri);
      }
    } catch (err) {
      console.warn('[Logto] Logout error:', err.message);
    }
  }
  currentLogtoUser = null;
}

/**
 * Dapatkan user aktif Logto saat ini
 */
export function getCurrentLogtoUser() {
  return currentLogtoUser;
}

/**
 * Simpan konfigurasi Logto ke localStorage
 */
export function saveLogtoSettings(endpoint, appId) {
  if (endpoint) localStorage.setItem('SIIRS_LOGTO_ENDPOINT', endpoint.trim());
  if (appId) localStorage.setItem('SIIRS_LOGTO_APP_ID', appId.trim());
  window.location.reload();
}
