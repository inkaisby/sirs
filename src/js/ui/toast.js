export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const colors = type === 'success'
    ? 'bg-emerald-800 text-white border-emerald-700'
    : type === 'warn'
    ? 'bg-amber-800 text-white border-amber-700'
    : 'bg-slate-900 text-white border-slate-700';
  toast.className = `${colors} border px-4 py-3 rounded-xl shadow-lg text-xs font-semibold pointer-events-auto motion-view-enter`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3400);
}
