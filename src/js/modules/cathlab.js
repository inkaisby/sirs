import { appState } from '../state.js';
import { showToast } from '../ui/toast.js';
import { fetchTindakanFromDb, updateTindakanStatusDb, createTindakanDb } from '../supabaseClient.js';

export let tindakanDataList = [];
export let isTindakanLoading = false;

export async function loadTindakanData(forceToast = false) {
  if (isTindakanLoading) return;
  isTindakanLoading = true;
  const syncIcon = document.getElementById('sync-tindakan-icon');
  if (syncIcon) syncIcon.classList.add('animate-spin');

  try {
    const data = await fetchTindakanFromDb({ limit: 120 });
    if (data && Array.isArray(data) && data.length > 0) {
      tindakanDataList = data;
    } else if (tindakanDataList.length === 0) {
      // Fallback data demo klinis jika offline
      tindakanDataList = [
        {
          id: 4471,
          tanggal: '2026-11-26',
          waktu: '09:15',
          nama: 'NY. AMINATUN',
          dokter: 'dr. Lely P Candra, SpJP(K), FIHA, FAPSIC, FAPS',
          tindakan: 'PPCI',
          kategori: 'PCI',
          status: 'Selesai',
          ruangan: 'IGD - ICCU',
          no_rm: '939094',
          asisten: 'ADI',
          sirkuler: 'BIRAWA',
          logger: 'AZIZA',
          fluoro_time: 1420,
          dap_dose: 185.4,
          temuan_pembuluh: 'LM: Normal\nLAD: Total occlusion at mid\nLCx: Normal\nRCA: Calcified 40%',
          kesimpulan_laporan: 'SUCCESSFUL PRIMARY PCI 1 DES TO MID LAD'
        },
        {
          id: 4470,
          tanggal: '2026-11-26',
          waktu: '11:00',
          nama: 'TINNEKE',
          dokter: 'dr. M. Faishal Riza, SpJP(K), FIHA, FAPSC, FAPSIC, FAsCC, FSC',
          tindakan: 'PPCI',
          kategori: 'PCI',
          status: 'Selesai',
          ruangan: 'ICCU',
          no_rm: '939012',
          asisten: 'ADI',
          sirkuler: 'BIRAWA',
          logger: 'AZIZA',
          fluoro_time: 2100,
          dap_dose: 210.2,
          temuan_pembuluh: 'LM: Normal\nLAD: 90% stenosis\nLCx: Normal\nRCA: 60% mid',
          kesimpulan_laporan: 'SUCCESSFUL PROCEDURE 1 DES TO PROX-MID LAD'
        },
        {
          id: 4469,
          tanggal: '2026-11-25',
          waktu: '13:30',
          nama: 'SALAMA',
          dokter: 'dr. Andrianus Oktovianto, SpJP, FIHA',
          tindakan: 'PPM GANTI BATERRY',
          kategori: 'PPM',
          status: 'Selesai',
          ruangan: 'SAFIR HCU',
          no_rm: '938935',
          fluoro_time: 450,
          dap_dose: 45.1,
          kesimpulan_laporan: 'SUCCESSFUL PACEMAKER GENERATOR REPLACEMENT'
        },
        {
          id: 4466,
          tanggal: '2026-11-25',
          waktu: '15:10',
          nama: 'SOEPRIYADI',
          dokter: 'dr. Deo Idarto,M.Biomed, SpJP (K), FIHA,FAPSC',
          tindakan: 'PPCI',
          kategori: 'PCI',
          status: 'Proses',
          ruangan: 'TULIP - SAFIR HCU',
          no_rm: '429519',
          fluoro_time: 1800,
          dap_dose: 195.0,
          kesimpulan_laporan: 'PROCEDURE ONGOING'
        },
        {
          id: 4459,
          tanggal: '2026-11-25',
          waktu: '16:45',
          nama: 'SAYONAH',
          dokter: 'dr. Andrianus Oktovianto, SpJP, FIHA',
          tindakan: 'EP STUDY',
          kategori: 'EP',
          status: 'Menunggu',
          ruangan: 'ASTER',
          no_rm: '687237',
          kesimpulan_laporan: 'PRE-PROCEDURE PREPARATION'
        }
      ];
    }

    updateTindakanStats();
    filterTindakanData();
    if (forceToast) {
      showToast(`Berhasil menyinkronkan ${tindakanDataList.length} rekam tindakan dari database.`, 'success');
    }
  } catch (err) {
    console.error('Error loadTindakanData:', err);
    showToast('Gagal memuat tindakan dari DB, menggunakan data lokal.', 'warn');
  } finally {
    isTindakanLoading = false;
    if (syncIcon) syncIcon.classList.remove('animate-spin');
  }
}

export function updateTindakanStats() {
  const total = tindakanDataList.length;
  const selesai = tindakanDataList.filter(t => (t.status || '').toLowerCase() === 'selesai').length;
  const proses = tindakanDataList.filter(t => (t.status || '').toLowerCase() === 'proses').length;
  const menunggu = tindakanDataList.filter(t => (t.status || '').toLowerCase() === 'menunggu').length;

  const elTotal = document.getElementById('stat-tindakan-total');
  const elSelesai = document.getElementById('stat-tindakan-selesai');
  const elProses = document.getElementById('stat-tindakan-proses');
  const elMenunggu = document.getElementById('stat-tindakan-menunggu');

  if (elTotal) elTotal.textContent = total;
  if (elSelesai) elSelesai.textContent = selesai;
  if (elProses) elProses.textContent = proses;
  if (elMenunggu) elMenunggu.textContent = menunggu;
}

export function filterTindakanData() {
  const q = (document.getElementById('tindakan-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('tindakan-filter-status')?.value || 'ALL';
  const dokterFilter = document.getElementById('tindakan-filter-dokter')?.value || 'ALL';
  const ruanganFilter = document.getElementById('tindakan-filter-ruangan')?.value || 'ALL';

  const filtered = tindakanDataList.filter(item => {
    // Query search
    if (q) {
      const matchNama = (item.nama || item.nama_pasien || '').toLowerCase().includes(q);
      const matchRm = String(item.no_rm || '').toLowerCase().includes(q);
      const matchDokter = (item.dokter || '').toLowerCase().includes(q);
      const matchTindakan = (item.tindakan || '').toLowerCase().includes(q);
      if (!matchNama && !matchRm && !matchDokter && !matchTindakan) return false;
    }

    // Status
    if (statusFilter !== 'ALL') {
      if ((item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // Dokter
    if (dokterFilter !== 'ALL') {
      if (!(item.dokter || '').toLowerCase().includes(dokterFilter.toLowerCase())) return false;
    }

    // Ruangan
    if (ruanganFilter !== 'ALL') {
      if (!(item.ruangan || '').toLowerCase().includes(ruanganFilter.toLowerCase())) return false;
    }

    return true;
  });

  renderTindakanTable(filtered);
}

export function renderTindakanTable(rows) {
  const tbody = document.getElementById('tindakan-tbody');
  const countInfo = document.getElementById('tindakan-count-info');
  if (!tbody) return;

  if (countInfo) {
    countInfo.textContent = `Menampilkan ${rows.length} dari ${tindakanDataList.length} total prosedur`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-1.5">
            <span class="text-sm font-semibold text-slate-600">Tidak ada tindakan yang cocok dengan filter.</span>
            <span class="text-xs text-slate-400">Coba ubah kata kunci atau pilih opsi filter lain.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  rows.forEach((row, idx) => {
    const id = row.id;
    const no = idx + 1;
    const nama = row.nama || row.nama_pasien || '—';
    const norm = row.no_rm || '—';
    const tgl = row.tanggal || '—';
    const waktu = row.waktu || '—';
    const dokter = row.dokter || '—';
    const ruangan = row.ruangan || '—';
    const tindakan = row.tindakan || '—';
    const status = row.status || 'Menunggu';
    const fluoro = row.fluoro_time ? `${row.fluoro_time}s` : '—';
    const dose = row.dap_dose || row.dose ? `${row.dap_dose || row.dose} mGy` : '—';

    let statusClass = 'bg-amber-100 text-amber-800 border-amber-300';
    if (status.toLowerCase() === 'selesai') {
      statusClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (status.toLowerCase() === 'proses') {
      statusClass = 'bg-cyan-100 text-cyan-800 border-cyan-300';
    } else if (status.toLowerCase() === 'meninggal' || status.toLowerCase() === 'batal') {
      statusClass = 'bg-rose-100 text-rose-800 border-rose-300';
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-cyan-50/40 transition duration-150 border-b border-slate-100';
    tr.innerHTML = `
      <td class="py-3 px-3 text-center font-mono text-[11px] text-slate-400 font-bold">${no}</td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="font-mono text-xs font-bold text-slate-800">${tgl}</div>
        <div class="font-mono text-[11px] text-slate-500">${waktu}</div>
      </td>
      <td class="py-3 px-4 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-900 leading-tight whitespace-nowrap">${nama}</span>
          <span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-bold whitespace-nowrap">RM: ${norm}</span>
        </div>
        ${row.kelas_pembiayaan ? `<span class="text-[10px] text-slate-400 font-medium block whitespace-nowrap">${row.kelas_pembiayaan}</span>` : ''}
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold whitespace-nowrap">${ruangan}</span>
      </td>
      <td class="py-3 px-4 whitespace-nowrap">
        <span class="text-xs font-bold text-slate-800 block leading-snug whitespace-nowrap">${dokter}</span>
        ${row.asisten ? `<span class="text-[10px] text-slate-400 block mt-0.5 whitespace-nowrap">Asist: ${row.asisten}</span>` : ''}
      </td>
      <td class="py-3 px-3">
        <span class="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-[11px] tracking-wide uppercase inline-block">
          ${tindakan}
        </span>
      </td>
      <td class="py-3 px-3 text-center whitespace-nowrap">
        <select onchange="handleInlineStatusChange(${id}, this.value)" class="px-2.5 py-1 rounded-xl text-xs font-extrabold border ${statusClass} focus:outline-none cursor-pointer">
          <option value="Menunggu" ${status === 'Menunggu' ? 'selected' : ''}>⏳ Menunggu</option>
          <option value="Proses" ${status === 'Proses' ? 'selected' : ''}>⚡ Proses</option>
          <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>✅ Selesai</option>
          <option value="Meninggal" ${status === 'Meninggal' ? 'selected' : ''}>🥀 Meninggal</option>
          <option value="Batal" ${status === 'Batal' ? 'selected' : ''}>❌ Batal</option>
        </select>
      </td>
      <td class="py-3 px-3 text-center whitespace-nowrap font-mono text-[11px]">
        <span class="text-slate-700 font-semibold block">${fluoro}</span>
        <span class="text-slate-400 text-[10px] block">${dose}</span>
      </td>
      <td class="py-3 px-3 text-center whitespace-nowrap">
        <button type="button" onclick="openDetailTindakan(${id})" class="px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-[11px] transition shadow-2xs">
          Detail
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export async function handleInlineStatusChange(tindakanId, newStatus) {
  const idx = tindakanDataList.findIndex(t => t.id === tindakanId);
  if (idx !== -1) {
    tindakanDataList[idx].status = newStatus;
    tindakanDataList[idx].updated_at = new Date().toISOString();
  }
  updateTindakanStats();
  filterTindakanData();

  showToast(`Mengubah status ID #${tindakanId} menjadi '${newStatus}'...`, 'info');
  try {
    const res = await updateTindakanStatusDb(tindakanId, newStatus, appState.currentNip);
    if (res.success) {
      showToast(`Status berhasil diperbarui ke database Supabase.`, 'success');
    } else if (res.offline) {
      showToast(`Status diperbarui di memori lokal (Mode Offline).`, 'info');
    } else {
      showToast(`Gagal update DB: ${res.error}`, 'warn');
    }
  } catch (err) {
    console.error('Error handleInlineStatusChange:', err);
  }
}

export function openDetailTindakan(id) {
  const item = tindakanDataList.find(t => t.id === id);
  if (!item) return;

  document.getElementById('dtl-tindakan-badge').textContent = item.tindakan || 'TINDAKAN';
  document.getElementById('dtl-status-badge').textContent = item.status || 'Menunggu';
  document.getElementById('dtl-pasien-nama').textContent = item.nama || item.nama_pasien || '—';
  document.getElementById('dtl-pasien-rm').textContent = item.no_rm || '—';
  document.getElementById('dtl-ruangan').textContent = item.ruangan || '—';
  document.getElementById('dtl-dokter').textContent = item.dokter || '—';
  document.getElementById('dtl-tanggal').textContent = item.tanggal || '—';
  document.getElementById('dtl-waktu').textContent = item.waktu || '—';
  document.getElementById('dtl-tim').textContent = `Asist: ${item.asisten || '—'}, Sirkuler: ${item.sirkuler || '—'}, Logger: ${item.logger || '—'}`;
  document.getElementById('dtl-fluoro').textContent = item.fluoro_time ? `${item.fluoro_time} Detik` : '—';
  document.getElementById('dtl-dose').textContent = item.dap_dose || item.dose ? `${item.dap_dose || item.dose} mGy/cm²` : '—';
  document.getElementById('dtl-temuan').textContent = item.temuan_pembuluh || 'Tidak ada catatan temuan pembuluh khusus.';
  document.getElementById('dtl-kesimpulan').textContent = item.kesimpulan_laporan || 'SUCCESSFUL PROCEDURE';

  const pciLinkContainer = document.getElementById('dtl-pci-link-container');
  const pciLink = document.getElementById('dtl-pci-link');
  if (item.pci_report_link) {
    pciLink.href = item.pci_report_link;
    pciLinkContainer?.classList.remove('hidden');
  } else {
    pciLinkContainer?.classList.add('hidden');
  }

  document.getElementById('modal-detail-tindakan')?.classList.remove('hidden');
}

export function closeDetailTindakan() {
  document.getElementById('modal-detail-tindakan')?.classList.add('hidden');
}

export function openModalTambahTindakan() {
  const today = new Date().toISOString().split('T')[0];
  const tglInput = document.getElementById('tb-tanggal');
  if (tglInput) tglInput.value = today;
  document.getElementById('modal-tambah-tindakan')?.classList.remove('hidden');
}

export function closeModalTambahTindakan() {
  document.getElementById('modal-tambah-tindakan')?.classList.add('hidden');
}

export async function submitTambahTindakan(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('tb-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Menyimpan ke DB...</span>';
  }

  const payload = {
    tanggal: document.getElementById('tb-tanggal')?.value,
    waktu: document.getElementById('tb-waktu')?.value || null,
    no_rm: document.getElementById('tb-norm')?.value.trim(),
    nama: document.getElementById('tb-nama')?.value.trim(),
    nama_pasien: document.getElementById('tb-nama')?.value.trim(),
    ruangan: document.getElementById('tb-ruangan')?.value,
    dokter: document.getElementById('tb-dokter')?.value,
    tindakan: document.getElementById('tb-tindakan')?.value.trim().toUpperCase(),
    kategori: 'PCI',
    status: document.getElementById('tb-status')?.value || 'Menunggu',
    keterangan: document.getElementById('tb-keterangan')?.value || null
  };

  try {
    const res = await createTindakanDb(payload, appState.currentNip);
    if (res.success && res.data) {
      tindakanDataList.unshift(res.data);
      showToast(`Tindakan untuk ${payload.nama} berhasil dijadwalkan ke DB Supabase!`, 'success');
    } else {
      // Local fallback jika offline
      const mockId = Date.now();
      tindakanDataList.unshift({ id: mockId, ...payload });
      showToast(`Tindakan disimpan ke memori operasional (Mode Offline).`, 'info');
    }
    updateTindakanStats();
    filterTindakanData();
    closeModalTambahTindakan();
    e.target.reset();
  } catch (err) {
    console.error('Error submitTambahTindakan:', err);
    showToast('Gagal menyimpan tindakan: ' + err.message, 'warn');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Simpan ke Database</span>';
    }
  }
}

export function exportTindakanCsv() {
  if (tindakanDataList.length === 0) {
    showToast('Tidak ada data tindakan untuk diekspor.', 'warn');
    return;
  }
  let csv = 'ID,Tanggal,Waktu,No RM,Nama Pasien,Ruangan,Dokter,Tindakan,Status,Fluoro Time (s),DAP Dose\n';
  tindakanDataList.forEach(r => {
    csv += `"${r.id}","${r.tanggal || ''}","${r.waktu || ''}","${r.no_rm || ''}","${(r.nama || r.nama_pasien || '').replace(/"/g, '""')}","${r.ruangan || ''}","${(r.dokter || '').replace(/"/g, '""')}","${r.tindakan || ''}","${r.status || ''}","${r.fluoro_time || ''}","${r.dap_dose || r.dose || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `siirs_cathlab_tindakan_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Berkas CSV Rekam Tindakan Cathlab berhasil diunduh.', 'success');
}
