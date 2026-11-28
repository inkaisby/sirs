import { INITIAL_WARDS_DATA, INITIAL_IGD_QUEUE } from '../data/wardsSeed.js';

// Salin data master lokal untuk fallback offline & performa render cepat
export const WARDS_DATA = [...INITIAL_WARDS_DATA];
export const IGD_QUEUE = [...INITIAL_IGD_QUEUE];

export const ROLE_META = {
  admin_yanmed: { label: 'Admin Yanmed', user: 'Pelayanan Medik (Akses Penuh)', allowedWard: 'ALL' },
  cathlab: { label: 'Petugas Cathlab', user: 'Instalasi Kateterisasi Jantung (Cathlab)', allowedWard: 'CATHLAB' },
  igd_admission: { label: 'Petugas IGD', user: 'Instalasi Gawat Darurat & Admisi', allowedWard: 'IGD' },
  nurse_dahlia: { label: 'Perawat Dahlia', user: 'Ruang Rawat Inap DAHLIA', allowedWard: 'DAHLIA' },
  nurse_teratai: { label: 'Perawat Teratai', user: 'Ruang Rawat Inap TERATAI', allowedWard: 'TERATAI' },
  nurse_icu: { label: 'Perawat ICU', user: 'Instalasi Perawatan Intensif (ICU)', allowedWard: 'ICU' },
  new_account: { label: 'Akun Baru', user: 'Petugas Baru (Wajib Pilih Ruangan)', allowedWard: 'NONE' },
  public_display: { label: 'Display Publik', user: 'Layar Informasi Web RS (Read-Only)', allowedWard: 'NONE' }
};

export const appState = {
  currentRole: 'admin_yanmed',
  currentTab: 'dashboard',
  currentNip: '199204152020121004',
  isSidebarCollapsed: false,
  isNewAccountLockdown: false
};
