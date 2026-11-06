/**
 * app.js - Main Application Controller for BUKU ARcell
 */

const App = {
  currentView: 'dashboard',

  init() {
    this.bindNavigation();
    this.bindCurrencyInputs();
    this.bindSettings();
    this.refreshDashboard();

    // Initialize submodules
    Transactions.init();
    Debts.init();
    Reports.init();
    StoreSessions.init();

    // Check for overdue debts/receivables and notify
    this.checkOverdueAlerts();
  },

  // Navigation
  bindNavigation() {
    const navButtons = document.querySelectorAll('[data-view-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-view-target');
        this.switchView(targetView);
      });
    });
  },

  switchView(viewName) {
    this.currentView = viewName;

    // Hide all view sections
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.add('hidden'));

    // Show target view
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Update active nav state in desktop sidebar and mobile bottom nav
    const allNavLinks = document.querySelectorAll('[data-view-target]');
    allNavLinks.forEach(link => {
      const isCurrent = link.getAttribute('data-view-target') === viewName;
      if (link.classList.contains('nav-item-desktop')) {
        if (isCurrent) {
          link.className = 'nav-item-desktop flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20 transition';
        } else {
          link.className = 'nav-item-desktop flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition';
        }
      } else if (link.classList.contains('nav-item-mobile')) {
        if (isCurrent) {
          link.className = 'nav-item-mobile flex flex-col items-center justify-center text-sky-600 font-bold text-xs py-1 transition';
        } else {
          link.className = 'nav-item-mobile flex flex-col items-center justify-center text-slate-400 font-medium text-xs py-1 transition';
        }
      }
    });

    // Refresh data in specific view
    if (viewName === 'dashboard') {
      this.refreshDashboard();
    } else if (viewName === 'storeSessions') {
      StoreSessions.renderSessionState();
      StoreSessions.renderTableAndStats();
    } else if (viewName === 'transactions') {
      Transactions.renderTable();
    } else if (viewName === 'debts') {
      Debts.renderReceivablesTable();
      Debts.renderDebtsTable();
    } else if (viewName === 'reports') {
      Reports.updateReport();
    } else if (viewName === 'settings') {
      this.loadSettingsForm();
    }

    // Otomatis sinkronisasi cloud senyap saat berpindah menu (tanpa pop-up)
    if (typeof SyncManager !== 'undefined' && SyncManager.syncNow) {
      SyncManager.syncNow(false, true);
    }

    // Kontrol visibilitas tombol aksi di Header atas
    const headerBtnTrx = document.getElementById('header-btn-trx');
    const headerBtnPiutang = document.getElementById('header-btn-piutang') || document.getElementById('header-btn-rec');

    if (viewName === 'storeSessions') {
      // Pada menu Buka / Tutup Toko: sembunyikan Catat Transaksi dan + Piutang di header
      if (headerBtnTrx) headerBtnTrx.classList.add('hidden');
      if (headerBtnPiutang) headerBtnPiutang.classList.add('hidden');
    } else if (viewName === 'transactions') {
      // Pada menu Transaksi Kas: sembunyikan Catat Transaksi di header
      if (headerBtnTrx) headerBtnTrx.classList.add('hidden');
      if (headerBtnPiutang) headerBtnPiutang.classList.remove('hidden');
    } else {
      if (headerBtnTrx) headerBtnTrx.classList.remove('hidden');
      if (headerBtnPiutang) headerBtnPiutang.classList.remove('hidden');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Dashboard Stats Refresh
  refreshDashboard() {
    const today = getFormattedDate(0);
    const summary = Storage.getSummary();
    const transactions = Storage.getTransactions();

    // Transactions today
    const todayTrx = transactions.filter(t => t.date === today);
    const todayIn = todayTrx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const todayOut = todayTrx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);

    // Saldo Kas Utama
    const balanceElem = document.getElementById('dash-balance');
    if (balanceElem) {
      balanceElem.textContent = this.formatCurrency(summary.currentCashBalance);
    }

    // Pemasukan Hari Ini
    const dashInElem = document.getElementById('dash-income-today');
    if (dashInElem) dashInElem.textContent = this.formatCurrency(todayIn);

    // Pengeluaran Hari Ini
    const dashOutElem = document.getElementById('dash-expense-today');
    if (dashOutElem) dashOutElem.textContent = this.formatCurrency(todayOut);

    // Piutang Belum Lunas (uang kita di orang lain)
    const dashRecElem = document.getElementById('dash-receivables-pending');
    if (dashRecElem) dashRecElem.textContent = this.formatCurrency(summary.pendingReceivables);

    // Hutang Belum Lunas (kewajiban kita ke supplier)
    const dashDebtElem = document.getElementById('dash-debts-pending');
    if (dashDebtElem) dashDebtElem.textContent = this.formatCurrency(summary.pendingDebts);

    // Render Recent 5 Transactions in Dashboard
    this.renderRecentTransactions();

    // Render Overdue & Due Soon Warnings in Dashboard
    this.renderDashboardReminders();

    // Render Sesi Status Toko
    if (typeof StoreSessions !== 'undefined') {
      StoreSessions.renderSessionState();
    }
  },

  renderRecentTransactions() {
    const list = Storage.getTransactions().slice(0, 5);
    const container = document.getElementById('dash-recent-transactions');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center italic">Belum ada transaksi tercatat.</p>`;
      return;
    }

    let html = '';
    list.forEach(t => {
      const isIncome = t.type === 'in';
      html += `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">
              <i class="fa-solid ${isIncome ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-800 block">${t.category}</span>
              <span class="text-[11px] text-slate-400">${t.date} &bull; ${t.paymentMethod || 'Tunai'}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'} block">
              ${isIncome ? '+' : '-'}${this.formatCurrency(t.amount)}
            </span>
            <span class="text-[10px] text-slate-400 truncate max-w-[120px] inline-block">${t.notes || ''}</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  renderDashboardReminders() {
    const container = document.getElementById('dash-debt-reminders');
    if (!container) return;

    const todayStr = getFormattedDate(0);
    const receivables = Storage.getReceivables().filter(r => r.status !== 'paid');
    const debts = Storage.getDebts().filter(d => d.status !== 'paid');

    const alerts = [];

    receivables.forEach(r => {
      const remaining = Number(r.amount) - Number(r.paidAmount || 0);
      if (r.dueDate && r.dueDate <= todayStr) {
        alerts.push({
          type: 'rec',
          title: `Tagihan Piutang: ${r.debtorName}`,
          amount: remaining,
          dueDate: r.dueDate,
          isOverdue: r.dueDate < todayStr,
          id: r.id
        });
      }
    });

    debts.forEach(d => {
      const remaining = Number(d.amount) - Number(d.paidAmount || 0);
      if (d.dueDate && d.dueDate <= todayStr) {
        alerts.push({
          type: 'debt',
          title: `Jatuh Tempo Hutang: ${d.creditorName}`,
          amount: remaining,
          dueDate: d.dueDate,
          isOverdue: d.dueDate < todayStr,
          id: d.id
        });
      }
    });

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-800 text-xs">
          <i class="fa-solid fa-circle-check text-base text-emerald-500"></i>
          <span>Semua aman! Tidak ada hutang atau piutang yang jatuh tempo hari ini.</span>
        </div>
      `;
      return;
    }

    let html = `<div class="space-y-2">`;
    alerts.forEach(a => {
      html += `
        <div class="p-3 rounded-xl border flex items-center justify-between text-xs ${a.isOverdue ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}">
          <div class="flex items-center gap-2">
            <i class="fa-solid ${a.isOverdue ? 'fa-triangle-exclamation text-rose-600' : 'fa-bell text-amber-600'}"></i>
            <div>
              <span class="font-bold block">${a.title}</span>
              <span class="text-[11px] opacity-75">${a.isOverdue ? 'Sudah Lewat Jatuh Tempo' : 'Jatuh Tempo Hari Ini'} (${a.dueDate})</span>
            </div>
          </div>
          <div class="text-right">
            <span class="font-extrabold block">${this.formatCurrency(a.amount)}</span>
            <button onclick="App.switchView('debts')" class="text-[10px] underline font-medium">Buka Buku &rarr;</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  },

  checkOverdueAlerts() {
    const todayStr = getFormattedDate(0);
    const receivables = Storage.getReceivables().filter(r => r.status !== 'paid' && r.dueDate && r.dueDate < todayStr);
    const debts = Storage.getDebts().filter(d => d.status !== 'paid' && d.dueDate && d.dueDate < todayStr);

    if (receivables.length > 0 || debts.length > 0) {
      console.log(`Perhatian: Ada ${receivables.length} piutang dan ${debts.length} hutang yang sudah melewati jatuh tempo.`);
    }
  },

  // Currency input auto formatting
  bindCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('.currency-input');
    currencyInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        if (!rawValue) {
          e.target.value = '';
          return;
        }
        e.target.value = this.formatNumberOnly(Number(rawValue));
      });
    });
  },

  // Format Helper
  formatCurrency(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  },

  formatNumberOnly(num) {
    return Number(num || 0).toLocaleString('id-ID');
  },

  // Toast Notification
  showToast(message, type = 'info') {
    if (!message) return;
    // Blokir semua notifikasi pop-up terkait sinkronisasi cloud agar tidak mengganggu
    const msgLower = String(message).toLowerCase();
    if (msgLower.includes('sinkron') || msgLower.includes('sync')) {
      return;
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgMap = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-sky-600 text-white'
    };
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-triangle-exclamation',
      warning: 'fa-circle-exclamation',
      info: 'fa-info-circle'
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${bgMap[type] || bgMap.info} transform transition-all duration-300 translate-y-3 opacity-0`;
    toast.innerHTML = `
      <i class="fa-solid ${iconMap[type] || iconMap.info} text-base"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('translate-y-3', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Settings & Store Configuration
  bindSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = {
          storeName: document.getElementById('setting-store-name').value.trim() || 'BUKU ARcell',
          tagline: document.getElementById('setting-tagline').value.trim(),
          storePhone: document.getElementById('setting-store-phone').value.trim(),
          storeAddress: document.getElementById('setting-store-address').value.trim()
        };
        Storage.saveSettings(settings);
        this.updateHeaderBrand();
        this.showToast('Pengaturan toko berhasil diperbarui!', 'success');
      });
    }

    // Category additions
    const btnAddCatIn = document.getElementById('btn-add-cat-in');
    if (btnAddCatIn) {
      btnAddCatIn.addEventListener('click', () => this.addNewCategory('in'));
    }

    const btnAddCatOut = document.getElementById('btn-add-cat-out');
    if (btnAddCatOut) {
      btnAddCatOut.addEventListener('click', () => this.addNewCategory('out'));
    }

    // Backup & Restore
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => this.exportBackupFile());
    }

    const fileInputRestore = document.getElementById('file-restore-json');
    if (fileInputRestore) {
      fileInputRestore.addEventListener('change', (e) => this.handleFileRestore(e));
    }

    const btnResetAll = document.getElementById('btn-reset-all');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('PERINGATAN: Semua data transaksi, hutang, dan piutang akan di-reset ke data bawaan! Lanjutkan?')) {
          Storage.resetAllData();
          this.showToast('Data berhasil di-reset!', 'info');
          setTimeout(() => location.reload(), 800);
        }
      });
    }

    this.updateHeaderBrand();
  },

  updateHeaderBrand() {
    const settings = Storage.getSettings();
    const brandElems = document.querySelectorAll('.store-brand-name');
    brandElems.forEach(el => el.textContent = settings.storeName);
  },

  loadSettingsForm() {
    const settings = Storage.getSettings();
    document.getElementById('setting-store-name').value = settings.storeName || '';
    document.getElementById('setting-tagline').value = settings.tagline || '';
    document.getElementById('setting-store-phone').value = settings.storePhone || '';
    document.getElementById('setting-store-address').value = settings.storeAddress || '';

    this.renderCategoryChips('in');
    this.renderCategoryChips('out');
  },

  renderCategoryChips(type) {
    const list = Storage.getCategories(type);
    const container = document.getElementById(type === 'in' ? 'chips-cat-in' : 'chips-cat-out');
    if (!container) return;

    container.innerHTML = '';
    list.forEach(cat => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 shadow-sm';
      
      const spanText = document.createElement('span');
      spanText.textContent = cat;
      chip.appendChild(spanText);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'text-slate-400 hover:text-rose-500 p-0.5 rounded transition active:scale-90';
      delBtn.innerHTML = '<i class="fa-solid fa-xmark text-xs"></i>';
      delBtn.title = `Hapus ${cat}`;
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deleteCategory(type, cat);
      });
      chip.appendChild(delBtn);

      container.appendChild(chip);
    });
  },

  addNewCategory(type) {
    const input = document.getElementById(type === 'in' ? 'input-new-cat-in' : 'input-new-cat-out');
    const val = input.value.trim();
    if (!val) return;

    const list = Storage.getCategories(type);
    if (list.includes(val)) {
      this.showToast('Kategori sudah ada!', 'warning');
      return;
    }

    list.push(val);
    Storage.saveCategories(type, list);
    input.value = '';
    this.renderCategoryChips(type);
    Transactions.renderCategoryOptions();
    this.showToast('Kategori berhasil ditambahkan!', 'success');
  },

  deleteCategory(type, cat) {
    if (!confirm(`Hapus kategori "${cat}"?`)) return;
    let list = Storage.getCategories(type);
    if (list.length <= 1) {
      this.showToast('Minimal harus ada satu kategori!', 'warning');
      return;
    }
    list = list.filter(c => c !== cat);
    Storage.saveCategories(type, list);
    this.renderCategoryChips(type);
    Transactions.renderCategoryOptions();
    this.showToast(`Kategori "${cat}" berhasil dihapus.`, 'info');
  },

  exportBackupFile() {
    const jsonStr = Storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_KAS_ARcell_${getFormattedDate(0)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('File backup database JSON berhasil diunduh!', 'success');
  },

  handleFileRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = Storage.importData(event.target.result);
      if (res.success) {
        this.showToast('Data berhasil dipulihkan dari backup!', 'success');
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showToast('Gagal memulihkan data: ' + res.error, 'error');
      }
    };
    reader.readAsText(file);
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
