/**
 * js/sync.js - Cloud Database Synchronization Manager for BUKU ARcell
 * Mode Senyap (Silent Sync) - Otomatis sinkron saat refresh / buka aplikasi tanpa pop-up yang mengganggu
 */

const SyncManager = {
  CONFIG_KEY: 'arcell_sync_config',
  isSyncing: false,
  debounceTimer: null,

  defaultConfig: {
    enabled: true,
    serverUrl: 'https://ar-pro.my.id/api/sync.php',
    syncKey: 'arcell-sync-2026',
    autoSyncOnChange: true,
    autoSyncOnStartup: true,
    lastSyncTime: null
  },

  getConfig() {
    try {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      if (!raw) return { ...this.defaultConfig };
      return { ...this.defaultConfig, ...JSON.parse(raw) };
    } catch (e) {
      return { ...this.defaultConfig };
    }
  },

  saveConfig(newConfig) {
    const current = this.getConfig();
    const updated = { ...current, ...newConfig };
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(updated));
    this.updateUIStatus();
    return updated;
  },

  isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine !== false;
  },

  init() {
    this.bindEvents();
    this.updateUIStatus();

    // SINKRONISASI OTOMATIS SAAT REFRESH / BUKA APLIKASI
    // Berjalan sepenuhnya secara senyap (silent) di latar belakang tanpa pop-up
    const cfg = this.getConfig();
    if (cfg.enabled && cfg.autoSyncOnStartup && this.isOnline()) {
      // Jalankan langsung sinkronisasi saat halaman dimuat/direfresh
      this.syncNow(false, true);
    }

    // Jika perangkat kembali online, sinkronkan otomatis secara senyap
    window.addEventListener('online', () => {
      this.updateUIStatus();
      if (cfg.enabled) {
        this.syncNow(false, true);
      }
    });

    window.addEventListener('offline', () => {
      this.updateUIStatus();
    });
  },

  bindEvents() {
    // Tombol sinkronisasi manual di settings (senyap)
    const btnSyncNow = document.getElementById('btn-sync-cloud-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', () => this.syncNow(true, false));
    }

    // Tombol tes koneksi server di settings (satu-satunya yang menampilkan notifikasi tes)
    const btnTestConn = document.getElementById('btn-test-cloud-conn');
    if (btnTestConn) {
      btnTestConn.addEventListener('click', () => this.testConnection());
    }

    // Form simpan pengaturan cloud
    const formCloud = document.getElementById('form-cloud-settings');
    if (formCloud) {
      formCloud.addEventListener('submit', (e) => {
        e.preventDefault();
        const serverUrl = document.getElementById('cloud-server-url').value.trim();
        const syncKey = document.getElementById('cloud-sync-key').value.trim();
        const autoSyncOnChange = document.getElementById('cloud-auto-sync-change').checked;
        const autoSyncOnStartup = document.getElementById('cloud-auto-sync-startup').checked;

        this.saveConfig({
          serverUrl: serverUrl || this.defaultConfig.serverUrl,
          syncKey: syncKey || this.defaultConfig.syncKey,
          autoSyncOnChange,
          autoSyncOnStartup
        });

        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('Pengaturan sinkronisasi cloud disimpan', 'success');
        }
      });
    }

    // Header Quick Sync buttons (Desktop & Mobile) - senyap hanya animasi putar icon
    document.querySelectorAll('.btn-quick-sync').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.syncNow(false, true);
      });
    });
  },

  async testConnection() {
    const cfg = this.getConfig();
    const btn = document.getElementById('btn-test-cloud-conn');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>';
    }

    try {
      const url = `${cfg.serverUrl}?action=ping&_t=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Sync-Key': cfg.syncKey || ''
        }
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const json = await res.json();
      if (json && json.success) {
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('✅ Koneksi ke ar-pro.my.id berhasil', 'success');
        }
      } else {
        throw new Error(json.message || 'Koneksi ditolak');
      }
    } catch (err) {
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast(`❌ Gagal terhubung: ${err.message}`, 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  },

  // Otomatis kirim perubahan saat user mencatat data baru (senyap tanpa pop-up)
  triggerAutoSync() {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.autoSyncOnChange || !this.isOnline()) {
      return;
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncNow(false, true); // Selalu silent (senyap)
    }, 400);
  },

  /**
   * Proses Sinkronisasi Utama Dua Arah
   * @param {boolean} manual - jika dipicu manual
   * @param {boolean} silent - jika true, TIDAK AKAN ADA POPUP APAPUN
   */
  async syncNow(manual = false, silent = true) {
    if (this.isSyncing || !this.isOnline()) {
      this.updateUIStatus();
      return;
    }

    const cfg = this.getConfig();
    this.isSyncing = true;
    this.setSyncingState(true);

    try {
      // Ambil data lokal
      const localDataJson = Storage.exportAllData();
      const localData = JSON.parse(localDataJson);

      const payload = {
        clientTimestamp: new Date().toISOString(),
        data: localData
      };

      const res = await fetch(cfg.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': cfg.syncKey || ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      if (!result || !result.success) {
        throw new Error(result?.message || 'Gagal sinkron');
      }

      // Terapkan data gabungan terbaru ke penyimpanan lokal
      if (result.data) {
        Storage.importData(JSON.stringify(result.data));
      }

      // Catat waktu sukses sinkron
      const now = new Date().toISOString();
      this.saveConfig({ lastSyncTime: now });

      // Refresh tampilan aktif (Dashboard, Transaksi, Hutang) secara mulus
      if (typeof App !== 'undefined' && App.renderActiveView) {
        App.renderActiveView();
      }

      // HANYA jika manual dan silent bernilai false (misal klik tombol di setting), tampilkan toast singkat
      if (manual && !silent && typeof App !== 'undefined' && App.showToast) {
        App.showToast('Database tersinkronkan', 'success');
      }
    } catch (err) {
      console.warn('[Sync]', err.message);
      if (manual && !silent && typeof App !== 'undefined' && App.showToast) {
        App.showToast(`Sinkronisasi tertunda: ${err.message}`, 'error');
      }
    } finally {
      this.isSyncing = false;
      this.setSyncingState(false);
      this.updateUIStatus();
    }
  },

  setSyncingState(isSyncing) {
    // Animasi putar pada icon sync
    document.querySelectorAll('.sync-spinner-icon').forEach(icon => {
      if (isSyncing) {
        icon.classList.add('fa-spin');
      } else {
        icon.classList.remove('fa-spin');
      }
    });

    const statusTextEl = document.getElementById('cloud-sync-status-text');
    if (statusTextEl && isSyncing) {
      statusTextEl.textContent = 'Menyinkronkan...';
    }
  },

  formatTime(isoString) {
    if (!isoString) return 'Belum pernah';
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month} ${hours}:${mins} WIB`;
    } catch (e) {
      return isoString;
    }
  },

  updateUIStatus() {
    const cfg = this.getConfig();
    const isOnline = this.isOnline();
    const lastTimeStr = this.formatTime(cfg.lastSyncTime);

    // Update Header Pill Indicators (Hanya indikator visual tanpa pop-up)
    document.querySelectorAll('.cloud-sync-indicator').forEach(el => {
      if (!isOnline) {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="text-[11px] font-semibold text-slate-500 hidden sm:inline">Offline</span>
        `;
        el.title = 'Offline. Data tersimpan di perangkat.';
      } else if (cfg.lastSyncTime) {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="text-[11px] font-semibold text-slate-700 hidden sm:inline">Tersinkron</span>
        `;
        el.title = `Tersinkron dengan ar-pro.my.id (${lastTimeStr})`;
      } else {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-sky-400"></span>
          <span class="text-[11px] font-semibold text-slate-600 hidden sm:inline">ar-pro.my.id</span>
        `;
        el.title = 'Siap sinkron';
      }
    });

    // Update Detail di Halaman Pengaturan (Settings View)
    const statusTextEl = document.getElementById('cloud-sync-status-text');
    const statusDotEl = document.getElementById('cloud-sync-status-dot');
    const lastSyncEl = document.getElementById('cloud-sync-last-time');

    if (statusTextEl && !this.isSyncing) {
      if (!isOnline) {
        statusTextEl.textContent = 'Offline (Tersimpan lokal)';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-amber-500';
      } else if (cfg.lastSyncTime) {
        statusTextEl.textContent = 'Terhubung & Tersinkron';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-emerald-500';
      } else {
        statusTextEl.textContent = 'Terhubung (Siap sinkron)';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-sky-500';
      }
    }

    if (lastSyncEl) {
      lastSyncEl.textContent = lastTimeStr;
    }

    const urlInput = document.getElementById('cloud-server-url');
    const keyInput = document.getElementById('cloud-sync-key');
    const changeCheckbox = document.getElementById('cloud-auto-sync-change');
    const startupCheckbox = document.getElementById('cloud-auto-sync-startup');

    if (urlInput && !urlInput.value) urlInput.value = cfg.serverUrl || this.defaultConfig.serverUrl;
    if (keyInput && !keyInput.value) keyInput.value = cfg.syncKey || this.defaultConfig.syncKey;
    if (changeCheckbox) changeCheckbox.checked = cfg.autoSyncOnChange !== false;
    if (startupCheckbox) startupCheckbox.checked = cfg.autoSyncOnStartup !== false;
  }
};

// Jalankan inisialisasi saat script dimuat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
  SyncManager.init();
}
