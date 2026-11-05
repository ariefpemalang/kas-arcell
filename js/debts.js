/**
 * debts.js - Manajemen Buku Hutang & Piutang untuk KAS ARcell
 */

const Debts = {
  currentTab: 'receivables', // 'receivables' (Piutang) or 'debts' (Hutang)
  currentRecFilter: 'unpaid', // Default sembunyikan yang sudah lunas
  currentDebtFilter: 'all',
  activePaymentTarget: null, // { type: 'rec' | 'debt', id: string, name: string, remaining: number }

  init() {
    this.bindEvents();
    this.renderReceivablesTable();
    this.renderDebtsTable();
  },

  bindEvents() {
    // Tab switch between Piutang and Hutang
    const tabRecBtn = document.getElementById('tab-btn-receivables');
    const tabDebtBtn = document.getElementById('tab-btn-debts');

    if (tabRecBtn && tabDebtBtn) {
      tabRecBtn.addEventListener('click', () => this.switchDebtTab('receivables'));
      tabDebtBtn.addEventListener('click', () => this.switchDebtTab('debts'));
    }

    // Filter Piutang
    const filterRec = document.getElementById('rec-filter-status');
    if (filterRec) {
      filterRec.addEventListener('change', (e) => {
        this.currentRecFilter = e.target.value;
        this.renderReceivablesTable();
      });
    }

    // Filter Hutang
    const filterDebt = document.getElementById('debt-filter-status');
    if (filterDebt) {
      filterDebt.addEventListener('change', (e) => {
        this.currentDebtFilter = e.target.value;
        this.renderDebtsTable();
      });
    }

    // Search Piutang
    const searchRec = document.getElementById('rec-search');
    if (searchRec) {
      searchRec.addEventListener('input', () => this.renderReceivablesTable());
    }

    // Search Hutang
    const searchDebt = document.getElementById('debt-search');
    if (searchDebt) {
      searchDebt.addEventListener('input', () => this.renderDebtsTable());
    }

    // Forms
    const recForm = document.getElementById('receivable-form');
    if (recForm) {
      recForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveReceivable();
      });
    }

    // Toggle potong kas listener
    const deductCashCheckbox = document.getElementById('rec-deduct-cash');
    const paymentMethodRow = document.getElementById('rec-payment-method-row');
    if (deductCashCheckbox && paymentMethodRow) {
      deductCashCheckbox.addEventListener('change', (e) => {
        paymentMethodRow.style.display = e.target.checked ? 'flex' : 'none';
      });
    }

    const debtForm = document.getElementById('debt-form');
    if (debtForm) {
      debtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveDebt();
      });
    }

    const payForm = document.getElementById('debt-payment-form');
    if (payForm) {
      payForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePayment();
      });
    }
  },

  switchDebtTab(tab) {
    this.currentTab = tab;
    const tabRecBtn = document.getElementById('tab-btn-receivables');
    const tabDebtBtn = document.getElementById('tab-btn-debts');
    const recSection = document.getElementById('receivables-section');
    const debtSection = document.getElementById('debts-section');

    if (tab === 'receivables') {
      tabRecBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-600 text-white shadow-sm flex items-center gap-2 transition';
      tabDebtBtn.className = 'px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-2 transition';
      recSection.classList.remove('hidden');
      debtSection.classList.add('hidden');
      this.renderReceivablesTable();
    } else {
      tabDebtBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-600 text-white shadow-sm flex items-center gap-2 transition';
      tabRecBtn.className = 'px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-2 transition';
      debtSection.classList.remove('hidden');
      recSection.classList.add('hidden');
      this.renderDebtsTable();
    }
  },

  // ======================= PIUTANG (RECEIVABLES) =======================
  openReceivableModal(item = null) {
    const modal = document.getElementById('receivable-modal');
    const title = document.getElementById('rec-modal-title');
    const form = document.getElementById('receivable-form');
    form.reset();

    if (item) {
      document.getElementById('rec-id').value = item.id;
      title.textContent = 'Edit Data Piutang Pelanggan';
      document.getElementById('rec-name').value = item.debtorName;
      if (document.getElementById('rec-phone')) document.getElementById('rec-phone').value = item.phone || '';
      document.getElementById('rec-amount').value = App.formatNumberOnly(item.amount);
      document.getElementById('rec-date').value = item.date || getFormattedDate(0);
      if (document.getElementById('rec-due-date')) document.getElementById('rec-due-date').value = item.dueDate || '';
      document.getElementById('rec-notes').value = item.notes || '';
      if (document.getElementById('rec-deduct-cash')) document.getElementById('rec-deduct-cash').value = 'true';
      if (document.getElementById('rec-payment-method')) document.getElementById('rec-payment-method').value = item.paymentMethod || 'Tunai';
    } else {
      document.getElementById('rec-id').value = '';
      title.textContent = 'Tambah Piutang Pelanggan Baru';
      if (document.getElementById('rec-phone')) document.getElementById('rec-phone').value = '';
      document.getElementById('rec-date').value = getFormattedDate(0);
      if (document.getElementById('rec-due-date')) document.getElementById('rec-due-date').value = '';
      if (document.getElementById('rec-deduct-cash')) document.getElementById('rec-deduct-cash').value = 'true';
      if (document.getElementById('rec-payment-method')) document.getElementById('rec-payment-method').value = 'Tunai';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('rec-name').focus(), 100);
  },

  closeReceivableModal() {
    const modal = document.getElementById('receivable-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveReceivable() {
    const id = document.getElementById('rec-id').value;
    const name = document.getElementById('rec-name').value.trim();
    const phone = document.getElementById('rec-phone')?.value.trim() || '';
    const rawAmount = document.getElementById('rec-amount').value.replace(/[^0-9]/g, '');
    const amount = Number(rawAmount);
    const date = document.getElementById('rec-date').value || getFormattedDate(0);
    const dueDate = document.getElementById('rec-due-date')?.value || '';
    const notes = document.getElementById('rec-notes').value.trim();
    
    // Selalu potong saldo kas toko secara otomatis
    const deductCash = true;
    const paymentMethod = document.getElementById('rec-payment-method')?.value || 'Tunai';

    if (!name) {
      App.showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      App.showToast('Nominal piutang harus lebih dari 0!', 'error');
      return;
    }

    const payload = {
      debtorName: name,
      phone,
      amount,
      date,
      dueDate,
      notes
    };

    if (id) {
      Storage.updateReceivable(id, payload, deductCash, paymentMethod);
      App.showToast('Data piutang & kas berhasil diperbarui!', 'success');
    } else {
      Storage.addReceivable(payload, deductCash, paymentMethod);
      App.showToast(`Piutang dicatat & Saldo Kas dipotong (-${App.formatCurrency(amount)})!`, 'success');
    }

    this.closeReceivableModal();
    this.renderReceivablesTable();
    Transactions.renderTable();
    App.refreshDashboard();
  },

  deleteReceivable(id) {
    if (confirm('Yakin ingin menghapus catatan piutang ini? Jika sebelumnya memotong kas, nominal akan otomatis dikembalikan ke saldo kas.')) {
      Storage.deleteReceivable(id);
      App.showToast('Catatan piutang telah dihapus & saldo kas disesuaikan.', 'info');
      this.renderReceivablesTable();
      Transactions.renderTable();
      App.refreshDashboard();
    }
  },

  renderReceivablesTable() {
    let list = Storage.getReceivables();
    const tbody = document.getElementById('rec-table-body');
    const emptyState = document.getElementById('rec-empty-state');
    const summaryRemaining = document.getElementById('rec-summary-remaining');
    const searchVal = (document.getElementById('rec-search')?.value || '').toLowerCase();

    // Calculate total remaining
    const totalRemaining = list.reduce((s, r) => s + Math.max(0, Number(r.amount || 0) - Number(r.paidAmount || 0)), 0);
    if (summaryRemaining) summaryRemaining.textContent = App.formatCurrency(totalRemaining);

    // Apply filters
    if (this.currentRecFilter === 'unpaid') {
      list = list.filter(r => {
        const remaining = Number(r.amount || 0) - Number(r.paidAmount || 0);
        return r.status !== 'paid' && remaining > 0;
      });
    } else if (this.currentRecFilter === 'paid') {
      list = list.filter(r => {
        const remaining = Number(r.amount || 0) - Number(r.paidAmount || 0);
        return r.status === 'paid' || remaining <= 0;
      });
    }

    if (searchVal) {
      list = list.filter(r => 
        r.debtorName.toLowerCase().includes(searchVal) ||
        (r.phone && r.phone.includes(searchVal)) ||
        (r.notes && r.notes.toLowerCase().includes(searchVal))
      );
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    const todayStr = getFormattedDate(0);

    list.forEach(item => {
      const remaining = Math.max(0, Number(item.amount) - Number(item.paidAmount || 0));
      const isPaid = item.status === 'paid' || remaining <= 0;
      const isOverdue = !isPaid && item.dueDate && item.dueDate < todayStr;
      const isDueToday = !isPaid && item.dueDate && item.dueDate === todayStr;

      let statusBadge = '';
      if (isPaid) {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check"></i> Lunas</span>';
      } else if (item.paidAmount > 0) {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><i class="fa-solid fa-clock-rotate-left"></i> Dicicil</span>`;
      } else {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><i class="fa-solid fa-hourglass-start"></i> Belum Lunas</span>';
      }

      const dateParts = (item.date || '').split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : (item.date || '-');

      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-50 transition border-b border-slate-100 text-sm ${isPaid ? 'opacity-70 bg-slate-50/50' : ''}`;

      tr.innerHTML = `
        <td class="py-3.5 px-4 font-bold text-slate-800">
          <div class="flex items-center gap-2">
            <span>${item.debtorName}</span>
          </div>
          ${item.phone ? `<span class="text-xs font-normal text-slate-400 block">${item.phone}</span>` : ''}
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">${App.formatCurrency(item.amount)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap text-emerald-600 font-medium">${App.formatCurrency(item.paidAmount || 0)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap font-extrabold ${remaining > 0 ? 'text-rose-600' : 'text-slate-400'}">${App.formatCurrency(remaining)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">${formattedDate}</td>
        <td class="py-3.5 px-4 whitespace-nowrap">${statusBadge}</td>
        <td class="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate" title="${item.notes || ''}">${item.notes || '-'}</td>
        <td class="py-3.5 px-4 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            ${!isPaid ? `
            <button onclick="Debts.openPaymentModal('rec', '${item.id}')" title="Catat Cicilan / Pelunasan" class="px-2 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1">
              <i class="fa-solid fa-hand-holding-dollar"></i> Bayar
            </button>
            ` : ''}
            ${item.phone && !isPaid ? `
            <button onclick="Debts.sendWhatsAppReminder('${item.id}')" title="Kirim Tagihan via WhatsApp" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition">
              <i class="fa-brands fa-whatsapp text-base"></i>
            </button>
            ` : ''}
            <button onclick="Debts.showHistory('rec', '${item.id}')" title="Riwayat Cicilan" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition">
              <i class="fa-solid fa-history"></i>
            </button>
            <button onclick="Debts.editReceivable('${item.id}')" title="Edit Data" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="Debts.deleteReceivable('${item.id}')" title="Hapus" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  editReceivable(id) {
    const list = Storage.getReceivables();
    const item = list.find(r => r.id === id);
    if (item) this.openReceivableModal(item);
  },

  sendWhatsAppReminder(id) {
    const list = Storage.getReceivables();
    const item = list.find(r => r.id === id);
    if (!item || !item.phone) {
      App.showToast('Nomor WhatsApp belum tersedia!', 'error');
      return;
    }

    const settings = Storage.getSettings();
    const remaining = Number(item.amount) - Number(item.paidAmount || 0);
    
    // Clean phone number (format Indonesian 08xxx -> 628xxx)
    let cleanPhone = item.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    const message = `Halo Kak ${item.debtorName}, kami dari *${settings.storeName}* menginformasikan mengenai rincian piutang belanja / servis HP:
    
📌 *Rincian:* ${item.notes || 'Transaksi di Konter'}
💰 *Total Tagihan:* ${App.formatCurrency(item.amount)}
💵 *Sudah Dibayar:* ${App.formatCurrency(item.paidAmount || 0)}
⚠️ *Sisa Pembayaran:* *${App.formatCurrency(remaining)}*
📅 *Jatuh Tempo:* ${item.dueDate || '-'}

Mohon konfirmasi atau pelunasannya ya Kak. Terima kasih banyak atas kerjasamanya! 🙏`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  },

  // ======================= HUTANG (DEBTS) =======================
  openDebtModal(item = null) {
    const modal = document.getElementById('debt-modal');
    const title = document.getElementById('debt-modal-title');
    const form = document.getElementById('debt-form');
    form.reset();

    if (item) {
      document.getElementById('debt-id').value = item.id;
      title.textContent = 'Edit Data Hutang Toko';
      document.getElementById('debt-name').value = item.creditorName;
      document.getElementById('debt-phone').value = item.phone || '';
      document.getElementById('debt-amount').value = App.formatNumberOnly(item.amount);
      document.getElementById('debt-due-date').value = item.dueDate || '';
      document.getElementById('debt-notes').value = item.notes || '';
    } else {
      document.getElementById('debt-id').value = '';
      title.textContent = 'Tambah Catatan Hutang Toko Baru';
      document.getElementById('debt-due-date').value = getFormattedDate(7);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('debt-name').focus(), 100);
  },

  closeDebtModal() {
    const modal = document.getElementById('debt-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveDebt() {
    const id = document.getElementById('debt-id').value;
    const name = document.getElementById('debt-name').value.trim();
    const phone = document.getElementById('debt-phone').value.trim();
    const rawAmount = document.getElementById('debt-amount').value.replace(/[^0-9]/g, '');
    const amount = Number(rawAmount);
    const dueDate = document.getElementById('debt-due-date').value;
    const notes = document.getElementById('debt-notes').value.trim();

    if (!name) {
      App.showToast('Nama pihak kreditur/supplier wajib diisi!', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      App.showToast('Nominal hutang harus lebih dari 0!', 'error');
      return;
    }

    const payload = {
      creditorName: name,
      phone,
      amount,
      dueDate,
      notes
    };

    if (id) {
      Storage.updateDebt(id, payload);
      App.showToast('Data hutang berhasil diperbarui!', 'success');
    } else {
      Storage.addDebt(payload);
      App.showToast('Catatan hutang toko berhasil disimpan!', 'success');
    }

    this.closeDebtModal();
    this.renderDebtsTable();
    App.refreshDashboard();
  },

  deleteDebt(id) {
    if (confirm('Yakin ingin menghapus catatan hutang ini?')) {
      Storage.deleteDebt(id);
      App.showToast('Catatan hutang telah dihapus.', 'info');
      this.renderDebtsTable();
      App.refreshDashboard();
    }
  },

  renderDebtsTable() {
    let list = Storage.getDebts();
    const tbody = document.getElementById('debt-table-body');
    const emptyState = document.getElementById('debt-empty-state');
    const summaryRemaining = document.getElementById('debt-summary-remaining');
    const searchVal = (document.getElementById('debt-search')?.value || '').toLowerCase();

    // Total remaining debts
    const totalRemaining = list.reduce((s, d) => s + Math.max(0, Number(d.amount || 0) - Number(d.paidAmount || 0)), 0);
    if (summaryRemaining) summaryRemaining.textContent = App.formatCurrency(totalRemaining);

    // Apply filters
    if (this.currentDebtFilter === 'unpaid') {
      list = list.filter(d => d.status !== 'paid');
    } else if (this.currentDebtFilter === 'paid') {
      list = list.filter(d => d.status === 'paid');
    }

    if (searchVal) {
      list = list.filter(d => 
        d.creditorName.toLowerCase().includes(searchVal) ||
        (d.phone && d.phone.includes(searchVal)) ||
        (d.notes && d.notes.toLowerCase().includes(searchVal))
      );
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    const todayStr = getFormattedDate(0);

    list.forEach(item => {
      const remaining = Math.max(0, Number(item.amount) - Number(item.paidAmount || 0));
      const isPaid = item.status === 'paid' || remaining <= 0;
      const isOverdue = !isPaid && item.dueDate && item.dueDate < todayStr;
      const isDueToday = !isPaid && item.dueDate && item.dueDate === todayStr;

      let statusBadge = '';
      if (isPaid) {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check"></i> Lunas</span>';
      } else if (item.paidAmount > 0) {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><i class="fa-solid fa-clock-rotate-left"></i> Dicicil</span>`;
      } else {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><i class="fa-solid fa-hourglass-start"></i> Belum Lunas</span>';
      }

      let dueBadge = item.dueDate || '-';
      if (isOverdue) {
        dueBadge = `<span class="text-rose-600 font-bold flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> Lewat: ${item.dueDate}</span>`;
      } else if (isDueToday) {
        dueBadge = `<span class="text-amber-600 font-bold flex items-center gap-1"><i class="fa-solid fa-bell"></i> Hari Ini: ${item.dueDate}</span>`;
      }

      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-50 transition border-b border-slate-100 text-sm ${isPaid ? 'opacity-70 bg-slate-50/50' : ''}`;

      tr.innerHTML = `
        <td class="py-3.5 px-4 font-bold text-slate-800">
          <div>${item.creditorName}</div>
          <span class="text-xs font-normal text-slate-400 block">${item.phone ? 'Kontak: ' + item.phone : 'Tanpa Kontak'}</span>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">${App.formatCurrency(item.amount)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap text-emerald-600 font-medium">${App.formatCurrency(item.paidAmount || 0)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap font-extrabold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}">${App.formatCurrency(remaining)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap text-xs">${dueBadge}</td>
        <td class="py-3.5 px-4 whitespace-nowrap">${statusBadge}</td>
        <td class="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate" title="${item.notes || ''}">${item.notes || '-'}</td>
        <td class="py-3.5 px-4 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            ${!isPaid ? `
            <button onclick="Debts.openPaymentModal('debt', '${item.id}')" title="Bayar Hutang / Cicilan" class="px-2 py-1 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1">
              <i class="fa-solid fa-money-bill-transfer"></i> Bayar
            </button>
            ` : ''}
            <button onclick="Debts.showHistory('debt', '${item.id}')" title="Riwayat Pembayaran" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition">
              <i class="fa-solid fa-history"></i>
            </button>
            <button onclick="Debts.editDebt('${item.id}')" title="Edit Data" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="Debts.deleteDebt('${item.id}')" title="Hapus" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  editDebt(id) {
    const list = Storage.getDebts();
    const item = list.find(d => d.id === id);
    if (item) this.openDebtModal(item);
  },

  // ======================= MODAL PEMBAYARAN CICILAN / LUNAS =======================
  openPaymentModal(type, id) {
    const isRec = type === 'rec';
    const item = isRec ? Storage.getReceivables().find(r => r.id === id) : Storage.getDebts().find(d => d.id === id);
    if (!item) return;

    const remaining = Number(item.amount) - Number(item.paidAmount || 0);
    const targetName = isRec ? item.debtorName : item.creditorName;

    this.activePaymentTarget = { type, id, name: targetName, remaining };

    const modal = document.getElementById('debt-payment-modal');
    document.getElementById('pay-target-name').textContent = targetName;
    document.getElementById('pay-target-type-label').textContent = isRec ? 'Piutang Pelanggan' : 'Hutang Toko';
    document.getElementById('pay-remaining-amount').textContent = App.formatCurrency(remaining);
    document.getElementById('pay-amount').value = App.formatNumberOnly(remaining); // default bayar lunas
    document.getElementById('pay-notes').value = isRec ? 'Cicilan / Pelunasan Piutang' : 'Bayar Tagihan';
    
    // Label checkbox sync ke kas
    const syncLabel = document.getElementById('pay-sync-label');
    if (syncLabel) {
      syncLabel.textContent = isRec 
        ? 'Catat otomatis ke KAS MASUK (Pemasukan Konter)' 
        : 'Catat otomatis ke KAS KELUAR (Pengeluaran Konter)';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('pay-amount').focus(), 100);
  },

  closePaymentModal() {
    const modal = document.getElementById('debt-payment-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.activePaymentTarget = null;
  },

  savePayment() {
    if (!this.activePaymentTarget) return;

    const rawAmount = document.getElementById('pay-amount').value.replace(/[^0-9]/g, '');
    const amount = Number(rawAmount);
    const note = document.getElementById('pay-notes').value.trim() || 'Pembayaran';
    const recordToCash = document.getElementById('pay-record-to-cash').checked;

    if (!amount || amount <= 0) {
      App.showToast('Nominal pembayaran harus lebih dari 0!', 'error');
      return;
    }

    if (amount > this.activePaymentTarget.remaining) {
      if (!confirm(`Nominal (${App.formatCurrency(amount)}) melebihi sisa (${App.formatCurrency(this.activePaymentTarget.remaining)}). Tetapkan lunas?`)) {
        return;
      }
    }

    if (this.activePaymentTarget.type === 'rec') {
      Storage.addReceivablePayment(this.activePaymentTarget.id, amount, note, recordToCash);
      App.showToast('Pembayaran piutang berhasil dicatat!', 'success');
      this.renderReceivablesTable();
    } else {
      Storage.addDebtPayment(this.activePaymentTarget.id, amount, note, recordToCash);
      App.showToast('Pembayaran hutang berhasil dicatat!', 'success');
      this.renderDebtsTable();
    }

    this.closePaymentModal();
    App.refreshDashboard();
    Transactions.renderTable();
  },

  // Modal Riwayat Cicilan
  showHistory(type, id) {
    const isRec = type === 'rec';
    const item = isRec ? Storage.getReceivables().find(r => r.id === id) : Storage.getDebts().find(d => d.id === id);
    if (!item) return;

    const modal = document.getElementById('history-modal');
    const title = document.getElementById('history-modal-title');
    const container = document.getElementById('history-modal-content');

    const name = isRec ? item.debtorName : item.creditorName;
    title.textContent = `Riwayat Pembayaran - ${name}`;

    const payments = item.payments || [];
    const remaining = Math.max(0, Number(item.amount) - Number(item.paidAmount || 0));

    let html = `
      <div class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span class="text-slate-500 block">Total Awal</span>
            <span class="font-bold text-slate-800 text-sm">${App.formatCurrency(item.amount)}</span>
          </div>
          <div>
            <span class="text-slate-500 block">Sudah Dibayar</span>
            <span class="font-bold text-emerald-600 text-sm">${App.formatCurrency(item.paidAmount || 0)}</span>
          </div>
          <div>
            <span class="text-slate-500 block">Sisa</span>
            <span class="font-bold text-rose-600 text-sm">${App.formatCurrency(remaining)}</span>
          </div>
        </div>
      </div>
      <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daftar Cicilan (${payments.length})</h4>
    `;

    if (payments.length === 0) {
      html += `<p class="text-slate-400 text-center py-6 text-sm italic">Belum ada riwayat cicilan yang tercatat.</p>`;
    } else {
      html += `<div class="space-y-2 max-h-60 overflow-y-auto">`;
      payments.forEach((p, idx) => {
        html += `
          <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 text-xs">
            <div>
              <span class="font-bold text-slate-800 block">#${idx + 1} - ${p.note || 'Pembayaran'}</span>
              <span class="text-slate-400">${p.date}</span>
            </div>
            <span class="font-bold text-emerald-600 text-sm">+${App.formatCurrency(p.amount)}</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
