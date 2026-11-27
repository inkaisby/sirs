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

// Nilai Cloud Production (Bisa di-override lewat window.SIIRS_ENV atau localStorage)
const CLOUD_SUPABASE_URL = window.SIIRS_ENV?.SUPABASE_URL || localStorage.getItem('SIIRS_SUPABASE_URL') || '';
const CLOUD_SUPABASE_ANON_KEY = window.SIIRS_ENV?.SUPABASE_ANON_KEY || localStorage.getItem('SIIRS_SUPABASE_ANON_KEY') || '';

export const SIIRS_CONFIG = {
  appName: 'SIIRS RSUD Dr. M. Soewandhie',
  version: '2.0.0',
  isLocal: isLocalHost,
  supabaseUrl: isLocalHost ? (localStorage.getItem('SIIRS_SUPABASE_URL') || LOCAL_SUPABASE_URL) : CLOUD_SUPABASE_URL,
  supabaseAnonKey: isLocalHost ? (localStorage.getItem('SIIRS_SUPABASE_ANON_KEY') || LOCAL_SUPABASE_ANON_KEY) : CLOUD_SUPABASE_ANON_KEY,
  sharedWithIdikApp: true,
  ports: {
    idikAppDev: 3000,
    supabaseApi: 54321,
    supabaseStudio: 54323,
    postgresDb: 54322,
  }
};
