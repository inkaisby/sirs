import { appState, ROLE_META, WARDS_DATA } from '../state.js';
import { showToast } from '../ui/toast.js';
import { switchTab, renderSidebarWards } from '../ui/navigation.js';
import { renderBedBoard } from './wards.js';
import { getActiveSession, createSecureSession, logSecurityAudit } from '../supabaseClient.js';

let currentCompressedPhotoDataUrl = null;

export function openAccountSettingsModal(isNewUser = false) {
  const modal = document.getElementById('account-settings-modal');
  const select = document.getElementById('acc-ward-select');
  const isLockdown = isNewUser || appState.isNewAccountLockdown || appState.currentRole === 'new_account';

  if (select) {
    select.innerHTML = '';
    WARDS_DATA.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `Ruang ${w.name} (${w.available} Kosong / ${w.total} Bed)`;
      select.appendChild(opt);
    });
    const meta = ROLE_META[appState.currentRole] || ROLE_META.admin_yanmed;
    select.value = (meta.allowedWard && meta.allowedWard !== 'ALL' && meta.allowedWard !== 'NONE') ? meta.allowedWard : (document.getElementById('ward-selector')?.value || 'DAHLIA');
  }

  // Atur tampilan khusus jika akun baru dalam status lockdown ruangan
  const alertNew = document.getElementById('acc-new-user-alert');
  const tabBtnPass = document.getElementById('tab-btn-acc-pass');
  const btnClose = document.getElementById('btn-close-acc-settings');
  const btnCancel = document.getElementById('btn-cancel-acc-settings');
  const btnApplyText = document.getElementById('btn-apply-acc-ward-text');
  const modalTitle = document.getElementById('acc-modal-title');
  const modalDesc = document.getElementById('acc-modal-desc');

  if (isLockdown) {
    if (alertNew) alertNew.classList.remove('hidden');
    if (tabBtnPass) tabBtnPass.classList.add('hidden');
    if (btnClose) btnClose.classList.add('hidden');
    if (btnCancel) btnCancel.classList.add('hidden');
    if (btnApplyText) btnApplyText.textContent = 'Konfirmasi Ruangan & Buka Akses SIIRS';
    if (modalTitle) modalTitle.textContent = 'Pilih Ruangan Jaga (Akun Baru)';
    if (modalDesc) modalDesc.textContent = 'Tentukan bangsal tugas Anda untuk membuka seluruh menu operasional';
  } else {
    if (alertNew) alertNew.classList.add('hidden');
    if (tabBtnPass) tabBtnPass.classList.remove('hidden');
    if (btnClose) btnClose.classList.remove('hidden');
    if (btnCancel) btnCancel.classList.remove('hidden');
    if (btnApplyText) btnApplyText.textContent = 'Terapkan & Buka Ruangan';
    if (modalTitle) modalTitle.textContent = 'Pengaturan Akun Petugas Jaga';
    if (modalDesc) modalDesc.textContent = 'Kelola preferensi ruangan jaga aktif dan kredensial keamanan';
  }

  switchAccountModalTab('ward');
  if (modal) modal.classList.remove('hidden');
}

export function closeAccountSettingsModal() {
  if (appState.isNewAccountLockdown || appState.currentRole === 'new_account') {
    showToast('Pilih ruangan terlebih dahulu untuk membuka akses sistem.', 'warn');
    return;
  }
  document.getElementById('account-settings-modal')?.classList.add('hidden');
}

export function switchAccountModalTab(tab) {
  const isWard = tab === 'ward';
  document.getElementById('modal-acc-tab-ward')?.classList.toggle('hidden', !isWard);
  document.getElementById('modal-acc-tab-password')?.classList.toggle('hidden', isWard);

  const btnWard = document.getElementById('tab-btn-acc-ward');
  const btnPass = document.getElementById('tab-btn-acc-pass');
  if (btnWard) {
    btnWard.className = isWard
      ? 'pb-2.5 px-3 border-b-2 border-blue-600 text-blue-700 transition font-bold'
      : 'pb-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition font-semibold';
  }
  if (btnPass) {
    btnPass.className = !isWard
      ? 'pb-2.5 px-3 border-b-2 border-blue-600 text-blue-700 transition font-bold'
      : 'pb-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition font-semibold';
  }
}

export async function applyWardDutySwitch() {
  const newWard = document.getElementById('acc-ward-select')?.value;
  const notes = document.getElementById('acc-ward-notes')?.value?.trim();
  if (!newWard) return;

  const wardObj = WARDS_DATA.find(w => w.id === newWard);
  const wardName = wardObj ? wardObj.name : newWard;

  // Simpan preferensi ruangan akun secara persisten
  localStorage.setItem('siirs_ward_selected_' + appState.currentNip, newWard);

  // Jika sebelumnya dalam kondisi lockdown akun baru, matikan lockdown dan aktifkan seluruh sistem!
  const wasLockdown = appState.isNewAccountLockdown || appState.currentRole === 'new_account';
  if (wasLockdown) {
    if (typeof window.setNewAccountLockdown === 'function') {
      window.setNewAccountLockdown(false);
    }
    appState.currentRole = 'nurse_' + newWard.toLowerCase();
    if (!ROLE_META[appState.currentRole]) {
      ROLE_META[appState.currentRole] = {
        label: `Perawat ${wardName}`,
        user: `Ruang Rawat Inap ${wardName}`,
        allowedWard: newWard
      };
    }
  }

  // Update hak akses ruangan pada role jika bukan ALL
  if (ROLE_META[appState.currentRole].allowedWard !== 'ALL') {
    ROLE_META[appState.currentRole].allowedWard = newWard;
    ROLE_META[appState.currentRole].user = `Ruang Rawat Inap ${wardName}`;
  }

  // Update session storage
  const session = getActiveSession();
  if (session) {
    session.role = appState.currentRole;
    session.allowedWard = newWard;
    session.user = ROLE_META[appState.currentRole].user;
    createSecureSession(session);
  }

  // Sinkronkan UI
  const wardSel = document.getElementById('ward-selector');
  if (wardSel) wardSel.value = newWard;

  const userRoleBadge = document.getElementById('sidebar-user-role-badge');
  if (userRoleBadge) userRoleBadge.textContent = `Ruang ${wardName}`;

  const userInfo = document.getElementById('header-user-info');
  if (userInfo) userInfo.textContent = `${ROLE_META[appState.currentRole].user} (${appState.currentNip})`;

  const badgeHeader = document.getElementById('role-badge-header');
  if (badgeHeader) badgeHeader.textContent = ROLE_META[appState.currentRole].label;

  const activeSwitcher = document.getElementById('active-role-switcher');
  if (activeSwitcher) activeSwitcher.value = appState.currentRole;

  switchTab('wards');
  renderBedBoard(newWard);

  await logSecurityAudit('WARD_DUTY_SWITCHED', appState.currentNip, appState.currentRole, {
    targetWard: newWard,
    notes: notes || (wasLockdown ? 'Konfigurasi awal ruangan akun baru' : 'Perpindahan tugas shift jaga')
  });

  // Tutup modal
  document.getElementById('account-settings-modal')?.classList.add('hidden');
  showToast(`Ruangan jaga berhasil diatur ke Ruang ${wardName}. Seluruh menu operasional aktif!`, 'success');
}

export async function applyPasswordChange() {
  const currentPass = document.getElementById('acc-current-pass')?.value;
  const newPass = document.getElementById('acc-new-pass')?.value;
  const confirmPass = document.getElementById('acc-confirm-pass')?.value;

  if (!currentPass) {
    showToast('Masukkan kata sandi saat ini.', 'warn');
    return;
  }
  if (!newPass || newPass.length < 8) {
    showToast('Kata sandi baru minimal 8 karakter.', 'warn');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('Konfirmasi kata sandi tidak cocok.', 'warn');
    return;
  }

  showToast('Menyimpan kata sandi baru...', 'info');

  await logSecurityAudit('AUTH_PASSWORD_CHANGED', appState.currentNip, appState.currentRole, {
    status: 'SUCCESS',
    timestamp: new Date().toISOString()
  });

  // Bersihkan input
  const p1 = document.getElementById('acc-current-pass');
  const p2 = document.getElementById('acc-new-pass');
  const p3 = document.getElementById('acc-confirm-pass');
  if (p1) p1.value = '';
  if (p2) p2.value = '';
  if (p3) p3.value = '';

  closeAccountSettingsModal();
  showToast('Kata sandi akun petugas berhasil diperbarui!', 'success');
}

export function openProfilePhotoModal() {
  const modal = document.getElementById('profile-photo-modal');
  const userLabel = document.getElementById('photo-modal-user-label');
  if (userLabel) userLabel.textContent = `${ROLE_META[appState.currentRole].user} (${appState.currentNip})`;

  const saved = localStorage.getItem(`siirs_avatar_${appState.currentNip}`);
  const previewImg = document.getElementById('photo-modal-preview');
  const previewPlaceholder = document.getElementById('photo-modal-preview-placeholder');

  if (saved) {
    if (previewImg) {
      previewImg.src = saved;
      previewImg.classList.remove('hidden');
    }
    if (previewPlaceholder) previewPlaceholder.classList.add('hidden');
    currentCompressedPhotoDataUrl = saved;
  } else {
    if (previewImg) previewImg.classList.add('hidden');
    if (previewPlaceholder) {
      previewPlaceholder.classList.remove('hidden');
      const words = ROLE_META[appState.currentRole].label.split(' ');
      previewPlaceholder.textContent = words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }
    currentCompressedPhotoDataUrl = null;
  }

  if (modal) modal.classList.remove('hidden');
}

export function closeProfilePhotoModal() {
  document.getElementById('profile-photo-modal')?.classList.add('hidden');
}

export async function compressImageTo150KB(fileOrBlob) {
  const MAX_BYTES = 150 * 1024; // 150 KB
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIM = 400;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.88;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompres gambar'));
              return;
            }
            if (blob.size <= MAX_BYTES || quality <= 0.40) {
              const fr = new FileReader();
              fr.onloadend = () => {
                resolve({
                  dataUrl: fr.result,
                  sizeKB: Math.round(blob.size / 1024)
                });
              };
              fr.readAsDataURL(blob);
            } else {
              quality -= 0.12;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };

        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

export async function handleFilePhotoSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  await processAndPreviewPhoto(file, `File: ${file.name}`);
  e.target.value = '';
}

export async function processAndPreviewPhoto(fileOrBlob, sourceLabel = '') {
  showToast('Mengompres foto ke batas ≤ 150 KB...', 'info');
  try {
    const result = await compressImageTo150KB(fileOrBlob);
    currentCompressedPhotoDataUrl = result.dataUrl;

    const previewImg = document.getElementById('photo-modal-preview');
    const previewPlaceholder = document.getElementById('photo-modal-preview-placeholder');
    const sizeBadge = document.getElementById('photo-size-badge');
    const compInfo = document.getElementById('photo-compression-info');

    if (previewImg) {
      previewImg.src = result.dataUrl;
      previewImg.classList.remove('hidden');
    }
    if (previewPlaceholder) previewPlaceholder.classList.add('hidden');
    if (sizeBadge) {
      sizeBadge.textContent = `Terkompresi: ${result.sizeKB} KB (≤ 150 KB)`;
      sizeBadge.className = 'px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold';
    }
    if (compInfo) {
      compInfo.innerHTML = `Foto berhasil dioptimasi ke <strong>${result.sizeKB} KB</strong>. Siap disimpan untuk workstation.`;
    }
    showToast(`Foto berhasil dikompres ke ${result.sizeKB} KB!`, 'success');
  } catch (err) {
    console.error('Error proses foto:', err);
    showToast('Gagal memproses gambar: ' + err.message, 'warn');
  }
}

export async function fetchPhotoFromGoogleDrive() {
  const input = document.getElementById('drive-link-input');
  const link = (input?.value || '').trim();
  if (!link) {
    showToast('Tempelkan tautan Google Drive terlebih dahulu.', 'warn');
    return;
  }

  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) {
    showToast('Tautan Google Drive tidak valid. Pastikan link memiliki format file ID.', 'warn');
    return;
  }

  const fileId = match[1];
  showToast('Mengambil gambar dari Google Drive...', 'info');
  const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}=s400`;
  
  try {
    const response = await fetch(driveUrl);
    if (!response.ok) throw new Error('Akses Google Drive ditolak atau file tidak publik');
    const blob = await response.blob();
    await processAndPreviewPhoto(blob, 'Google Drive');
    if (input) input.value = '';
  } catch (err) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) processAndPreviewPhoto(blob, 'Google Drive');
      }, 'image/jpeg', 0.88);
    };
    img.onerror = () => {
      showToast('Gagal memuat dari Google Drive. Pastikan akses file adalah "Siapa saja yang memiliki link".', 'warn');
    };
    img.src = driveUrl;
  }
}

export function saveCompressedPhoto() {
  if (!currentCompressedPhotoDataUrl) {
    showToast('Belum ada foto yang dipilih atau di-paste.', 'warn');
    return;
  }
  localStorage.setItem(`siirs_avatar_${appState.currentNip}`, currentCompressedPhotoDataUrl);
  loadSavedAvatar(appState.currentNip);
  closeProfilePhotoModal();
  showToast('Foto profil berhasil disimpan dan diterapkan ke sidebar!', 'success');
}

export function resetProfilePhotoToDefault() {
  localStorage.removeItem(`siirs_avatar_${appState.currentNip}`);
  loadSavedAvatar(appState.currentNip);
  closeProfilePhotoModal();
  showToast('Foto profil direset ke avatar bawaan.', 'info');
}

export function loadSavedAvatar(nip) {
  const saved = localStorage.getItem(`siirs_avatar_${nip}`);
  const sidebarImg = document.getElementById('sidebar-avatar-img');
  const sidebarFallback = document.getElementById('sidebar-avatar-fallback');

  if (saved) {
    if (sidebarImg) {
      sidebarImg.src = saved;
      sidebarImg.classList.remove('hidden');
    }
    if (sidebarFallback) sidebarFallback.classList.add('hidden');
  } else {
    if (sidebarImg) sidebarImg.classList.add('hidden');
    if (sidebarFallback) {
      sidebarFallback.classList.remove('hidden');
      const meta = ROLE_META[appState.currentRole] || ROLE_META.admin_yanmed;
      const words = meta.label.split(' ');
      sidebarFallback.textContent = words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }
  }
}

export function initClipboardPasteListener() {
  window.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const modal = document.getElementById('profile-photo-modal');
          if (modal?.classList.contains('hidden')) {
            openProfilePhotoModal();
          }
          await processAndPreviewPhoto(blob, 'Clipboard Paste');
          showToast('Foto dari Clipboard (Ctrl+V) berhasil dimuat dan dikompres!', 'success');
          break;
        }
      }
    }
  });
}
