import { appState, IGD_QUEUE } from '../state.js';

export function renderIgdQueue() {
  const container = document.getElementById('igd-queue-list');
  if (!container) return;
  container.innerHTML = '';
  const isPublic = appState.currentRole === 'public_display';

  IGD_QUEUE.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-2xs';
    
    // Proteksi privasi pasien untuk layar publik
    const displayName = isPublic ? 'Pasien Anonim (***)' : item.name;
    const displayDiag = isPublic ? 'Kondisi Medis Dilindungi (Mode Publik)' : item.diag;
    const displayConsult = isPublic ? 'Tim Dokter Jaga RSUD' : `Konsul: ${item.consult}`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-blue-700 text-white text-xs font-extrabold">${item.bed}</span>
          <h4 class="text-sm font-extrabold text-slate-900">${displayName}</h4>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">Tujuan: ${item.target}</span>
      </div>
      <p class="text-xs text-slate-700 leading-relaxed">${displayDiag}</p>
      <p class="text-[11px] text-slate-500 font-medium">${displayConsult}</p>
    `;
    container.appendChild(card);
  });
}
