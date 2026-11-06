/**
 * transactions.js - Manajemen Transaksi Kas Masuk & Kas Keluar untuk BUKU ARcell
 */

const Transactions = {
  currentFilter: {
    type: 'all',
    category: 'all',
    search: '',
    startDate: '',
    endDate: ''
  },
  editingId: null,
  currentCalc: '0',

  init() {
    this.renderCategoryOptions();
    this.bindEvents();
    this.renderTable();
  },

  bindEvents() {
    // Form submit
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitKeypad();
      });
    }

    // Toggle type change in form
    const typeRadios = document.querySelectorAll('input[name="trx-type"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.renderCategoryOptions();
      });
    });

    // Date input change listener
    const dateInput = document.getElementById('trx-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        this.updateDateLabel();
      });
    }

    // Search & Filter listeners
    const searchInput = document.getElementById('trx-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter.search = e.target.value.toLowerCase();
        this.renderTable();
      });
    }

    const typeFilter = document.getElementById('trx-filter-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.currentFilter.type = e.target.value;
        this.renderTable();
      });
    }

    const catFilter = document.getElementById('trx-filter-category');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.currentFilter.category = e.target.value;
        this.renderTable();
      });
    }

    const startDateInput = document.getElementById('trx-filter-start');
    const endDateInput = document.getElementById('trx-filter-end');
    if (startDateInput && endDateInput) {
      const handleDateChange = () => {
        this.currentFilter.startDate = startDateInput.value;
        this.currentFilter.endDate = endDateInput.value;
        this.renderTable();
      };
      startDateInput.addEventListener('change', handleDateChange);
      endDateInput.addEventListener('change', handleDateChange);
    }

    // Keyboard fisik untuk mode PC / Laptop (Numpad & Tombol Angka)
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('transaction-modal');
      if (!modal || modal.classList.contains('hidden')) return;

      const activeEl = document.activeElement;
      const isNotes = activeEl && activeEl.id === 'trx-notes';

      // Jika kursor sedang di dalam kolom Catatan
      if (isNotes) {
        if (e.key === 'Enter') {
          e.preventDefault();
          activeEl.blur();
          this.submitKeypad();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          activeEl.blur();
        }
        return; // Biarkan pengetikan huruf/angka normal di catatan
      }

      // Jika ada input teks/select lain yang sedang fokus, abaikan
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      // Tombol Angka (0-9) baik dari keyboard utama maupun Numpad fisik
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this.pressKey(e.key);
        this.animateKeyButton(e.key);
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        this.pressOp(e.key);
        this.animateKeyButton(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.backspace();
        this.animateKeyButton('backspace');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.animateKeyButton('enter');
        this.submitKeypad();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeModal();
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        e.preventDefault();
        this.resetKeypad();
      }
    });
  },

  getCategoryIcon(cat) {
    const c = (cat || '').toLowerCase();
    if (c.includes('pulsa') || c.includes('paket data')) return '<i class="fa-solid fa-mobile-screen"></i>';
    if (c.includes('voucher') || c.includes('perdana')) return '<i class="fa-solid fa-sim-card"></i>';
    if (c.includes('aksesoris') || c.includes('headphone') || c.includes('case') || c.includes('charger')) return '<i class="fa-solid fa-headphones"></i>';
    if (c.includes('servis') || c.includes('tempered') || c.includes('lcd')) return '<i class="fa-solid fa-screwdriver-wrench"></i>';
    if (c.includes('wallet') || c.includes('dana') || c.includes('ovo') || c.includes('gopay')) return '<i class="fa-solid fa-wallet"></i>';
    if (c.includes('pln') || c.includes('token') || c.includes('ppob')) return '<i class="fa-solid fa-bolt"></i>';
    if (c.includes('piutang') || c.includes('pinjam') || c.includes('bon')) return '<i class="fa-solid fa-hand-holding-dollar"></i>';
    if (c.includes('kulakan') || c.includes('deposit')) return '<i class="fa-solid fa-money-bill-transfer"></i>';
    if (c.includes('operasional') || c.includes('listrik') || c.includes('wifi') || c.includes('air')) return '<i class="fa-solid fa-lightbulb"></i>';
    if (c.includes('sewa') || c.includes('ruko')) return '<i class="fa-solid fa-shop"></i>';
    if (c.includes('gaji') || c.includes('makan')) return '<i class="fa-solid fa-utensils"></i>';
    if (c.includes('hutang')) return '<i class="fa-solid fa-receipt"></i>';
    if (c.includes('pribadi') || c.includes('prive')) return '<i class="fa-solid fa-user"></i>';
    return '<i class="fa-solid fa-tag"></i>';
  },

  getShortCategoryName(cat) {
    const map = {
      'Penjualan Pulsa & Paket Data': 'Pulsa & Data',
      'Penjualan Voucher Fisik & Perdana': 'Voucher & SIM',
      'Aksesoris HP (Case, Kabel, Charger)': 'Aksesoris HP',
      'Jasa Servis & Pasang Tempered Glass': 'Servis HP',
      'Top Up E-Wallet (Dana, Ovo, Gopay)': 'E-Wallet',
      'Token PLN & Pembayaran PPOB': 'Token & PPOB',
      'Pelunasan Piutang Pelanggan': 'Pelunasan',
      'Pemasukan Lainnya': 'Lainnya',
      'Kulakan / Deposit Saldo Agen Pulsa': 'Deposit Pulsa',
      'Kulakan Aksesoris & Sparepart HP': 'Sparepart',
      'Belanja Stok Voucher & Kartu Perdana': 'Stok Voucher',
      'Pemberian Piutang / Pinjaman': 'Pinjaman/Bon',
      'Biaya Operasional (Listrik, Wifi, Air)': 'Operasional',
      'Sewa Tempat / Ruko': 'Sewa Ruko',
      'Gaji Karyawan / Uang Makan': 'Gaji & Makan',
      'Pembayaran Cicilan Hutang': 'Bayar Hutang',
      'Keperluan Pribadi / Prive': 'Pribadi/Prive',
      'Pengeluaran Lainnya': 'Lainnya'
    };
    return map[cat] || cat;
  },

  renderCategoryOptions(selectedCat = null) {
    const selectedType = document.querySelector('input[name="trx-type"]:checked')?.value || 'out';
    const categories = Storage.getCategories(selectedType);
    const categoryInput = document.getElementById('trx-category');
    const buttonsContainer = document.getElementById('trx-category-buttons');
    const filterSelect = document.getElementById('trx-filter-category');

    // Tentukan kategori terpilih (jika ada argumen selectedCat atau default kategori pertama)
    const activeCategory = selectedCat && categories.includes(selectedCat)
      ? selectedCat
      : (categories.length > 0 ? categories[0] : '');

    if (categoryInput) {
      categoryInput.value = activeCategory;
    }

    // Render Grid Ikon Kategori Bulat (4 Kolom persis seperti gambar)
    if (buttonsContainer) {
      buttonsContainer.innerHTML = '';
      categories.forEach(cat => {
        const isSelected = cat === activeCategory;
        const col = document.createElement('div');
        col.className = 'flex flex-col items-center cursor-pointer group select-none';

        const circle = document.createElement('div');
        if (isSelected) {
          circle.className = 'w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-black flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-amber-400/30 scale-105 transition-all';
        } else {
          circle.className = 'w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#27272a] text-zinc-300 border border-zinc-700/60 flex items-center justify-center text-base sm:text-lg hover:border-zinc-500 hover:text-white transition-all';
        }

        circle.innerHTML = this.getCategoryIcon(cat);

        const label = document.createElement('span');
        label.className = `text-[11px] font-medium text-center mt-1.5 px-0.5 line-clamp-2 leading-tight transition ${isSelected ? 'text-amber-400 font-bold' : 'text-zinc-400 group-hover:text-zinc-200'}`;
        label.textContent = this.getShortCategoryName(cat);

        col.appendChild(circle);
        col.appendChild(label);

        col.addEventListener('click', () => {
          this.renderCategoryOptions(cat);
        });

        buttonsContainer.appendChild(col);
      });
    }

    // Update filter dropdown di tabel riwayat transaksi (tetap dropdown biasa)
    if (filterSelect) {
      const curFilterVal = filterSelect.value;
      const allCats = [...new Set([...Storage.getCategories('in'), ...Storage.getCategories('out')])];
      filterSelect.innerHTML = '<option value="all">Semua Kategori</option>';
      allCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (curFilterVal === cat) opt.selected = true;
        filterSelect.appendChild(opt);
      });
    }
  },

  switchType(type) {
    const radioIn = document.getElementById('trx-type-in');
    const radioOut = document.getElementById('trx-type-out');
    const tabIn = document.getElementById('tab-trx-in');
    const tabOut = document.getElementById('tab-trx-out');

    if (type === 'in') {
      if (radioIn) radioIn.checked = true;
      if (radioOut) radioOut.checked = false;
      if (tabIn) {
        tabIn.className = 'py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white text-black shadow-sm';
      }
      if (tabOut) {
        tabOut.className = 'py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white';
      }
    } else {
      if (radioOut) radioOut.checked = true;
      if (radioIn) radioIn.checked = false;
      if (tabOut) {
        tabOut.className = 'py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white text-black shadow-sm';
      }
      if (tabIn) {
        tabIn.className = 'py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white';
      }
    }
    this.renderCategoryOptions();
  },

  // Logika Keypad Numpad
  pressKey(val) {
    if (this.currentCalc === '0') {
      this.currentCalc = val;
    } else {
      this.currentCalc += val;
    }
    this.updateKeypadDisplay();
  },

  pressOp(op) {
    if (!this.currentCalc || this.currentCalc === '0') return;
    const lastChar = this.currentCalc.slice(-1);
    if (['+', '-'].includes(lastChar)) {
      this.currentCalc = this.currentCalc.slice(0, -1) + op;
    } else {
      this.currentCalc += op;
    }
    this.updateKeypadDisplay();
  },

  backspace() {
    if (this.currentCalc.length > 0) {
      this.currentCalc = this.currentCalc.slice(0, -1);
    }
    if (!this.currentCalc) {
      this.currentCalc = '0';
    }
    this.updateKeypadDisplay();
  },

  resetKeypad() {
    this.currentCalc = '0';
    this.updateKeypadDisplay();
  },

  animateKeyButton(k) {
    const btn = document.querySelector(`button[data-k="${k}"]`);
    if (btn) {
      btn.classList.add('brightness-150', 'ring-2', 'ring-amber-400');
      setTimeout(() => {
        btn.classList.remove('brightness-150', 'ring-2', 'ring-amber-400');
      }, 120);
    }
  },

  updateKeypadDisplay() {
    const dispAmount = document.getElementById('trx-display-amount');
    const dispCalc = document.getElementById('trx-display-calc');
    const hiddenAmount = document.getElementById('trx-amount');

    let evalVal = 0;
    try {
      const cleanExpr = this.currentCalc.replace(/[^0-9+-]/g, '');
      if (cleanExpr) {
        evalVal = Function('"use strict";return (' + cleanExpr + ')')() || 0;
      }
    } catch (e) {
      evalVal = 0;
    }

    if (evalVal < 0) evalVal = 0;

    if (hiddenAmount) {
      hiddenAmount.value = evalVal;
    }

    if (dispAmount) {
      if (this.currentCalc.includes('+') || (this.currentCalc.includes('-') && this.currentCalc !== '0')) {
        dispAmount.textContent = App.formatNumberOnly(evalVal);
        if (dispCalc) {
          dispCalc.textContent = this.currentCalc;
          dispCalc.classList.remove('hidden');
        }
      } else {
        const num = Number(this.currentCalc) || 0;
        dispAmount.textContent = num > 0 ? App.formatNumberOnly(num) : '0';
        if (dispCalc) dispCalc.classList.add('hidden');
      }
    }
  },

  openDatePicker() {
    const dateInput = document.getElementById('trx-date');
    if (dateInput) {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.focus();
        dateInput.click();
      }
    }
  },

  updateDateLabel() {
    const dateInput = document.getElementById('trx-date');
    const label = document.getElementById('label-trx-date');
    if (!dateInput || !label) return;
    const today = getFormattedDate(0);
    if (dateInput.value === today) {
      label.textContent = 'Hari ini';
    } else if (dateInput.value) {
      const parts = dateInput.value.split('-');
      label.textContent = `${parts[2]}/${parts[1]}`;
    }
  },

  submitKeypad() {
    if (this.currentCalc.includes('+') || this.currentCalc.includes('-')) {
      try {
        const cleanExpr = this.currentCalc.replace(/[^0-9+-]/g, '');
        const evalVal = Function('"use strict";return (' + cleanExpr + ')')() || 0;
        this.currentCalc = String(Math.max(0, evalVal));
        this.updateKeypadDisplay();
      } catch (e) {}
    }
    this.saveTransaction();
  },

  openModal(trx = null) {
    const modal = document.getElementById('transaction-modal');
    const modalTitle = document.getElementById('trx-modal-title');
    const form = document.getElementById('transaction-form');
    if (form) form.reset();

    if (trx) {
      this.editingId = trx.id;
      if (modalTitle) modalTitle.textContent = 'Edit Transaksi';
      this.currentCalc = String(trx.amount || '0');
      this.switchType(trx.type);
      this.renderCategoryOptions(trx.category);
      document.getElementById('trx-date').value = trx.date;
      document.getElementById('trx-notes').value = trx.notes || '';
    } else {
      this.editingId = null;
      if (modalTitle) modalTitle.textContent = 'Tambahkan';
      this.currentCalc = '0';
      this.switchType('out'); // Default Pengeluaran seperti di gambar
      this.renderCategoryOptions();
      document.getElementById('trx-date').value = getFormattedDate(0);
      document.getElementById('trx-notes').value = '';
    }

    this.updateKeypadDisplay();
    this.updateDateLabel();

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.editingId = null;
    this.currentCalc = '0';
  },

  saveTransaction() {
    const typeRadio = document.querySelector('input[name="trx-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'out';
    const date = document.getElementById('trx-date').value || getFormattedDate(0);
    const category = document.getElementById('trx-category').value;
    const rawAmount = document.getElementById('trx-amount').value.replace(/[^0-9]/g, '');
    const amount = Number(rawAmount);
    const paymentEl = document.getElementById('trx-payment');
    const paymentMethod = paymentEl && paymentEl.value ? paymentEl.value : 'Tunai';
    const notes = document.getElementById('trx-notes').value.trim();

    if (!date) {
      App.showToast('Silakan pilih tanggal transaksi!', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      App.showToast('Jumlah nominal harus lebih dari 0!', 'error');
      return;
    }
    if (!category) {
      App.showToast('Silakan pilih kategori transaksi!', 'error');
      return;
    }

    const payload = {
      date,
      type,
      category,
      amount,
      paymentMethod,
      notes
    };

    if (this.editingId) {
      Storage.updateTransaction(this.editingId, payload);
      App.showToast('Transaksi berhasil diperbarui!', 'success');
    } else {
      Storage.addTransaction(payload);
      App.showToast('Transaksi berhasil disimpan!', 'success');
    }

    this.closeModal();
    this.renderTable();
    App.refreshDashboard();
  },

  deleteTransaction(id) {
    if (confirm('Yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.')) {
      Storage.deleteTransaction(id);
      App.showToast('Transaksi berhasil dihapus!', 'info');
      this.renderTable();
      App.refreshDashboard();
    }
  },

  getFilteredTransactions() {
    let list = Storage.getTransactions();

    if (this.currentFilter.type !== 'all') {
      list = list.filter(t => t.type === this.currentFilter.type);
    }
    if (this.currentFilter.category !== 'all') {
      list = list.filter(t => t.category === this.currentFilter.category);
    }
    if (this.currentFilter.startDate) {
      list = list.filter(t => t.date >= this.currentFilter.startDate);
    }
    if (this.currentFilter.endDate) {
      list = list.filter(t => t.date <= this.currentFilter.endDate);
    }
    if (this.currentFilter.search) {
      const q = this.currentFilter.search;
      list = list.filter(t => 
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
      );
    }

    return list;
  },

  renderTable() {
    const list = this.getFilteredTransactions();
    const tbody = document.getElementById('trx-table-body');
    const emptyState = document.getElementById('trx-empty-state');
    const countBadge = document.getElementById('trx-count-badge');
    const totalInElem = document.getElementById('trx-filter-total-in');
    const totalOutElem = document.getElementById('trx-filter-total-out');

    if (countBadge) countBadge.textContent = `${list.length} Data`;

    // Calculate totals for filtered transactions
    const totalIn = list.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalOut = list.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);

    if (totalInElem) totalInElem.textContent = App.formatCurrency(totalIn);
    if (totalOutElem) totalOutElem.textContent = App.formatCurrency(totalOut);

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    list.forEach(t => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 text-sm';

      const isIncome = t.type === 'in';
      const typeBadge = isIncome
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-arrow-down-left text-xs"></i> Pemasukan</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><i class="fa-solid fa-arrow-up-right text-xs"></i> Pengeluaran</span>`;

      const formattedAmount = isIncome
        ? `<span class="font-bold text-emerald-600">+${App.formatCurrency(t.amount)}</span>`
        : `<span class="font-bold text-rose-600">-${App.formatCurrency(t.amount)}</span>`;

      // Format date Indonesian style
      const dateParts = t.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : t.date;

      tr.innerHTML = `
        <td class="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">${formattedDate}</td>
        <td class="py-3.5 px-4 whitespace-nowrap">${typeBadge}</td>
        <td class="py-3.5 px-4 font-medium text-slate-800">${t.category}</td>
        <td class="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate" title="${t.notes || '-'}">${t.notes || '<span class="text-slate-400 italic">Tanpa catatan</span>'}</td>
        <td class="py-3.5 px-4 whitespace-nowrap"><span class="px-2 py-0.5 rounded text-xs bg-slate-100 font-medium text-slate-700">${t.paymentMethod || 'Tunai'}</span></td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">${formattedAmount}</td>
        <td class="py-3.5 px-4 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1">
            <button onclick="Transactions.showReceipt('${t.id}')" title="Cetak Nota / Struk" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition">
              <i class="fa-solid fa-receipt"></i>
            </button>
            <button onclick="Transactions.editTransaction('${t.id}')" title="Edit" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="Transactions.deleteTransaction('${t.id}')" title="Hapus" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  editTransaction(id) {
    const list = Storage.getTransactions();
    const trx = list.find(t => t.id === id);
    if (trx) {
      this.openModal(trx);
    }
  },

  // Modal Cetak Nota / Struk Transaksi
  showReceipt(id) {
    const list = Storage.getTransactions();
    const trx = list.find(t => t.id === id);
    if (!trx) return;

    const settings = Storage.getSettings();
    const modal = document.getElementById('receipt-modal');
    const container = document.getElementById('receipt-modal-content');

    const isIncome = trx.type === 'in';
    const typeLabel = isIncome ? 'BUKTI PEMASUKAN' : 'BUKTI PENGELUARAN';

    container.innerHTML = `
      <div class="p-6 bg-white border border-slate-200 rounded-2xl max-w-sm mx-auto font-mono text-xs text-slate-800 shadow-sm print:shadow-none print:border-none print:max-w-none">
        <div class="text-center pb-3 border-b border-dashed border-slate-300">
          <img src="assets/logo.jpg" alt="Logo" class="w-12 h-12 mx-auto mb-2 rounded-2xl object-cover shadow-sm border border-slate-200">
          <h2 class="text-base font-bold tracking-wider text-slate-900">${settings.storeName}</h2>
          <p class="text-[11px] text-slate-500">${settings.tagline || 'Konter Pulsa, Kuota & Servis'}</p>
          <p class="text-[11px] text-slate-500">${settings.storeAddress || ''}</p>
          <p class="text-[11px] text-slate-500">WA: ${settings.storePhone || '-'}</p>
        </div>

        <div class="py-3 text-center">
          <span class="inline-block px-3 py-1 font-bold text-xs uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} rounded">
            ${typeLabel}
          </span>
        </div>

        <div class="space-y-1.5 py-2 border-b border-dashed border-slate-300">
          <div class="flex justify-between">
            <span class="text-slate-500">No. Ref:</span>
            <span class="font-semibold">${trx.id}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Tanggal:</span>
            <span>${trx.date}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Metode Bayar:</span>
            <span>${trx.paymentMethod || 'Tunai'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Kategori:</span>
            <span class="font-semibold text-right max-w-[170px] truncate">${trx.category}</span>
          </div>
          ${trx.notes ? `
          <div class="pt-1">
            <span class="text-slate-500 block">Keterangan:</span>
            <span class="text-slate-700 italic block bg-slate-50 p-1.5 rounded mt-0.5">${trx.notes}</span>
          </div>` : ''}
        </div>

        <div class="py-3 border-b border-dashed border-slate-300 flex justify-between items-center text-sm">
          <span class="font-bold">TOTAL:</span>
          <span class="font-extrabold text-base ${isIncome ? 'text-emerald-700' : 'text-rose-700'}">
            ${App.formatCurrency(trx.amount)}
          </span>
        </div>

        <div class="pt-4 text-center text-[11px] text-slate-400">
          <p>Terima kasih atas kepercayaannya.</p>
          <p>Dicetak otomatis oleh BUKU ARcell</p>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeReceipt() {
    const modal = document.getElementById('receipt-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
