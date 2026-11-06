/**
 * js/sync.js - Cloud Database Synchronization Manager for BUKU ARcell
 * Integrasi & Sinkronisasi dua arah otomatis antara PC (ar-pro.my.id) dan HP (APK)
 */

const SyncManager = {
  CONFIG_KEY: 'arcell_sync_config',
  isSyncing: false,
  debounceTimer: null,
  pollingTimer: null,
  pollingIntervalMs: 10000, // Periksa update setiap 10 detik
  lastServerHash: null,

  defaultConfig: {
    enabled: true,
    serverUrl: 'https://ar-pro.my.id/api/sync.php',
    syncKey: 'arcell-sync-2026',
    autoSyncOnChange: true,
    autoSyncOnStartup: true,
    realtimePolling: true,
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

    // Auto-sync saat aplikasi dibuka jika online dan diaktifkan
    const cfg = this.getConfig();
    if (cfg.enabled && cfg.autoSyncOnStartup && this.isOnline()) {
      setTimeout(() => {
        this.syncNow(false, true); // initial sync
      }, 800);
    }

    // Mulai auto-polling berkala (real-time sync dari PC ke HP atau sebaliknya)
    if (cfg.enabled && cfg.realtimePolling !== false) {
      this.startAutoPolling();
    }

    // Dengarkan event saat layar HP menyala / tab aktif kembali (Visibility Change & Focus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkServerUpdates();
      }
    });

    window.addEventListener('focus', () => {
      this.checkServerUpdates();
    });

    // Dengarkan event online / offline perangkat
    window.addEventListener('online', () => {
      this.updateUIStatus();
      if (cfg.enabled) {
        this.syncNow(false, true);
        this.startAutoPolling();
      }
    });

    window.addEventListener('offline', () => {
      this.updateUIStatus();
      this.stopAutoPolling();
    });
  },

  bindEvents() {
    // Tombol sinkronisasi manual di settings
    const btnSyncNow = document.getElementById('btn-sync-cloud-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', () => this.syncNow(true));
    }

    // Tombol tes koneksi server di settings
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
        const realtimePolling = document.getElementById('cloud-auto-sync-polling') ? document.getElementById('cloud-auto-sync-polling').checked : true;

        this.saveConfig({
          serverUrl: serverUrl || this.defaultConfig.serverUrl,
          syncKey: syncKey || this.defaultConfig.syncKey,
          autoSyncOnChange,
          autoSyncOnStartup,
          realtimePolling
        });

        if (realtimePolling) {
          this.startAutoPolling();
        } else {
          this.stopAutoPolling();
        }

        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('Pengaturan sinkronisasi cloud berhasil disimpan!', 'success');
        }
      });
    }

    // Header Quick Sync buttons (Desktop & Mobile)
    document.querySelectorAll('.btn-quick-sync').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.syncNow(true);
      });
    });
  },

  startAutoPolling() {
    this.stopAutoPolling();
    this.pollingTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkServerUpdates();
      }
    }, this.pollingIntervalMs);
  },

  stopAutoPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  // Periksa apakah server memiliki data baru (dari PC atau perangkat lain)
  async checkServerUpdates() {
    if (this.isSyncing || !this.isOnline()) return;
    const cfg = this.getConfig();
    if (!cfg.enabled) return;

    try {
      const url = `${cfg.serverUrl}?action=check&_t=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Sync-Key': cfg.syncKey || ''
        }
      });

      if (!res.ok) return;

      const json = await res.json();
      if (!json || !json.success || !json.hash) return;

      // Jika hash server berbeda dari hash lokal, berarti ada data baru dari PC!
      if (this.lastServerHash && json.hash !== this.lastServerHash) {
        console.log('[Sync] Terdeteksi data baru di server ar-pro.my.id, sinkronisasi otomatis...');
        await this.syncNow(false, true, true); // true = fromRemoteChange
      } else {
        this.lastServerHash = json.hash;
      }
    } catch (e) {
      // Abaikan silent error saat polling berkala
    }
  },

  async testConnection() {
    const cfg = this.getConfig();
    const btn = document.getElementById('btn-test-cloud-conn');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menguji...';
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
        throw new Error(`Server merespon dengan status ${res.status}`);
      }

      const json = await res.json();
      if (json && json.success) {
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('✅ Berhasil terhubung ke server ar-pro.my.id!', 'success');
        }
      } else {
        throw new Error(json.message || 'Koneksi ditolak server.');
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

  // Dipanggil otomatis saat user menambah/mengubah data di perangkat ini
  triggerAutoSync() {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.autoSyncOnChange || !this.isOnline()) {
      return;
    }

    // Debounce cepat (500ms) agar data segera terkirim ke server
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncNow(false, true);
    }, 500);
  },

  async syncNow(manual = false, silent = false, fromRemoteChange = false) {
    if (this.isSyncing) return;
    const cfg = this.getConfig();

    if (!this.isOnline()) {
      if (manual && typeof App !== 'undefined' && App.showToast) {
        App.showToast('Perangkat sedang offline. Data tersimpan di HP/PC dan akan sinkron saat online.', 'warning');
      }
      this.updateUIStatus();
      return;
    }

    this.isSyncing = true;
    this.setSyncingState(true);

    try {
      // Ambil data lokal lengkap
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
        const errText = await res.text();
        let errMsg = `Server error HTTP ${res.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson && errJson.message) errMsg = errJson.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      if (!result || !result.success) {
        throw new Error((result && result.message) || 'Gagal memproses sinkronisasi.');
      }

      // Terapkan data hasil gabungan (two-way merged) ke LocalStorage
      if (result.data) {
        Storage.importData(JSON.stringify(result.data));

        // Hitung hash server saat ini agar tidak loop
        const ts = result.data.updatedAt || new Date().toISOString();
        const trxCount = (result.data.transactions || []).length;
        const sessCount = (result.data.dailySessions || []).length;
        const debtCount = (result.data.debts || []).length + (result.data.receivables || []).length;
        this.lastServerHash = `${ts}_${trxCount}_${sessCount}_${debtCount}`;
      }

      // Catat waktu sukses sinkron
      const now = new Date().toISOString();
      this.saveConfig({ lastSyncTime: now });

      // Refresh tampilan layar yang sedang aktif (Dashboard, Kasir, Hutang, dll.)
      if (typeof App !== 'undefined' && App.renderActiveView) {
        App.renderActiveView();
      }

      if (fromRemoteChange && typeof App !== 'undefined' && App.showToast) {
        App.showToast('📥 Data baru dari server ar-pro.my.id otomatis dimuat!', 'info');
      } else if (manual && !silent && typeof App !== 'undefined' && App.showToast) {
        App.showToast('✅ Database berhasil disinkronkan dengan ar-pro.my.id!', 'success');
      }
    } catch (err) {
      console.warn('Sync error:', err);
      if (manual && typeof App !== 'undefined' && App.showToast) {
        App.showToast(`Gagal sinkron: ${err.message}`, 'error');
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
      statusTextEl.textContent = 'Menyinkronkan data...';
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

    // Update Header Pill Indicators
    document.querySelectorAll('.cloud-sync-indicator').forEach(el => {
      if (!isOnline) {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-[11px] font-semibold text-slate-600 hidden sm:inline">Offline</span>
        `;
        el.title = 'Perangkat sedang offline. Menggunakan database lokal.';
      } else if (cfg.lastSyncTime) {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="text-[11px] font-semibold text-slate-700 hidden sm:inline">Realtime</span>
        `;
        el.title = `Tersinkron Real-Time dengan ar-pro.my.id (${lastTimeStr})`;
      } else {
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-sky-400"></span>
          <span class="text-[11px] font-semibold text-slate-600 hidden sm:inline">Siap Sinkron</span>
        `;
        el.title = 'Klik untuk sinkronisasi database pertama kali';
      }
    });

    // Update Detail di Halaman Pengaturan (Settings View)
    const statusTextEl = document.getElementById('cloud-sync-status-text');
    const statusDotEl = document.getElementById('cloud-sync-status-dot');
    const lastSyncEl = document.getElementById('cloud-sync-last-time');

    if (statusTextEl && !this.isSyncing) {
      if (!isOnline) {
        statusTextEl.textContent = 'Offline (Menggunakan data lokal)';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-amber-500';
      } else if (cfg.lastSyncTime) {
        statusTextEl.textContent = 'Terhubung Real-Time & Tersinkron';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-emerald-500';
      } else {
        statusTextEl.textContent = 'Terhubung (Menunggu sinkronisasi pertama)';
        if (statusDotEl) statusDotEl.className = 'w-3 h-3 rounded-full bg-sky-500';
      }
    }

    if (lastSyncEl) {
      lastSyncEl.textContent = lastTimeStr;
    }

    // Populate form inputs if exist
    const urlInput = document.getElementById('cloud-server-url');
    const keyInput = document.getElementById('cloud-sync-key');
    const changeCheckbox = document.getElementById('cloud-auto-sync-change');
    const startupCheckbox = document.getElementById('cloud-auto-sync-startup');
    const pollingCheckbox = document.getElementById('cloud-auto-sync-polling');

    if (urlInput && !urlInput.value) urlInput.value = cfg.serverUrl || this.defaultConfig.serverUrl;
    if (keyInput && !keyInput.value) keyInput.value = cfg.syncKey || this.defaultConfig.syncKey;
    if (changeCheckbox) changeCheckbox.checked = cfg.autoSyncOnChange !== false;
    if (startupCheckbox) startupCheckbox.checked = cfg.autoSyncOnStartup !== false;
    if (pollingCheckbox) pollingCheckbox.checked = cfg.realtimePolling !== false;
  }
};

// Jalankan inisialisasi saat script dimuat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
  SyncManager.init();
}
