/**
 * SIIRS — Module Re-exporter untuk Ruangan & Bangsal
 * Terhubung langsung ke modul modular di ./wards/index.js
 */

export {
  renderWardTable,
  openWardDetail,
  initWardSelector,
  renderBedBoard,
  WARD_CATEGORIES,
  CATEGORY_META,
  openPatientDrawer,
  closePatientDrawer
} from './wards/index.js';
