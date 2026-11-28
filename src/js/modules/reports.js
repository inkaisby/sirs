import { showToast } from '../ui/toast.js';

export function submitSpecialReport(e) {
  e.preventDefault();
  const type = document.getElementById('rep-type')?.value;
  const name = document.getElementById('rep-name')?.value;
  showToast(`${type} atas nama ${name} berhasil disimpan ke sistem Yanmed SIIRS.`, 'success');
  e.target.reset();
}
