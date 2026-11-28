/**
 * Konfigurasi Integrasi SIIRS (Sistem Informasi Integrasi Rumah Sakit)
 * RSUD Dr. M. Soewandhie Surabaya
 * Terhubung dengan Supabase database (Shared dengan IDIK-App)
 */

const isLocalHost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.')
);

// Nilai default Supabase Lokal (Docker Supabase dari D:\website\idik-app)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0NDEyMDB9.EG-dummy-anon-key-replace-with-status';

// Nilai default Supabase Cloud Production (Shared DB dengan IDIK-App)
const DEFAULT_CLOUD_SUPABASE_URL = 'https://whbinarvynbyemvqbfjg.supabase.co';
const DEFAULT_CLOUD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYmluYXJ2eW5ieWVtdnFiZmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDUzNjMsImV4cCI6MjA3MjU4MTM2M30.7gGW62Rehd4YiRn9rzwrGzgC8Kjl-uHZ74cOjDDfFaY';

// Nilai Cloud Production (Bisa di-override lewat window.SIIRS_ENV atau localStorage)
const CLOUD_SUPABASE_URL = window.SIIRS_ENV?.SUPABASE_URL || localStorage.getItem('SIIRS_SUPABASE_URL') || DEFAULT_CLOUD_SUPABASE_URL;
const CLOUD_SUPABASE_ANON_KEY = window.SIIRS_ENV?.SUPABASE_ANON_KEY || localStorage.getItem('SIIRS_SUPABASE_ANON_KEY') || DEFAULT_CLOUD_SUPABASE_ANON_KEY;

// Pilihan target database ('cloud' default agar di localhost tetap terhubung ke data real Supabase)
const currentDbTarget = localStorage.getItem('SIIRS_DB_TARGET') || 'cloud';

export const SIIRS_CONFIG = {
  appName: 'SIIRS RSUD Dr. M. Soewandhie',
  version: '2.0.0',
  isLocal: isLocalHost,
  dbTarget: currentDbTarget,
  // Di localhost default tetap gunakan Cloud DB terpadu kecuali pengguna memilih 'local'
  supabaseUrl: currentDbTarget === 'local' ? (localStorage.getItem('SIIRS_SUPABASE_URL') || LOCAL_SUPABASE_URL) : CLOUD_SUPABASE_URL,
  supabaseAnonKey: currentDbTarget === 'local' ? (localStorage.getItem('SIIRS_SUPABASE_ANON_KEY') || LOCAL_SUPABASE_ANON_KEY) : CLOUD_SUPABASE_ANON_KEY,
  sharedWithIdikApp: true,
  ports: {
    siirsLocal: 3300,
    idikAppDev: 3000,
    supabaseApi: 54321,
    supabaseStudio: 54323,
    postgresDb: 54322,
  }
};

/**
 * Beralih target basis data antara Cloud Supabase dan Docker Lokal dalam 1-klik
 */
export function setDbTarget(target) {
  if (target === 'local') {
    localStorage.setItem('SIIRS_DB_TARGET', 'local');
    localStorage.setItem('SIIRS_SUPABASE_URL', LOCAL_SUPABASE_URL);
    localStorage.setItem('SIIRS_SUPABASE_ANON_KEY', LOCAL_SUPABASE_ANON_KEY);
  } else {
    localStorage.setItem('SIIRS_DB_TARGET', 'cloud');
    localStorage.setItem('SIIRS_SUPABASE_URL', DEFAULT_CLOUD_SUPABASE_URL);
    localStorage.setItem('SIIRS_SUPABASE_ANON_KEY', DEFAULT_CLOUD_SUPABASE_ANON_KEY);
  }
  window.location.reload();
}

export function toggleDbTarget() {
  const current = localStorage.getItem('SIIRS_DB_TARGET') || 'cloud';
  setDbTarget(current === 'cloud' ? 'local' : 'cloud');
}

// ==============================================================================
// KONFIGURASI LOGTO IAM (IDENTITY & ACCESS MANAGEMENT / OIDC SSO)
// ==============================================================================
export const LOGTO_CONFIG = {
  endpoint: localStorage.getItem('SIIRS_LOGTO_ENDPOINT') || window.SIIRS_ENV?.LOGTO_ENDPOINT || 'https://ftsb3h.logto.app/',
  appId: localStorage.getItem('SIIRS_LOGTO_APP_ID') || window.SIIRS_ENV?.LOGTO_APP_ID || 'eodliref1opa1lgpsicnn',
  scopes: ['openid', 'profile', 'email', 'roles', 'custom_data'],
  get redirectUri() {
    return window.location.origin + '/';
  },
  get postLogoutRedirectUri() {
    return window.location.origin + '/';
  }
};
