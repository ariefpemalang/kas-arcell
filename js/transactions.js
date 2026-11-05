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
        this.saveTransaction();
      });
    }

    // Toggle type change in form
    const typeRadios = document.querySelectorAll('input[name="trx-type"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.renderCategoryOptions();
      });
    });

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
  },

  getCategoryIcon(cat) {
    const c = (cat || '').toLowerCase();
    if (c.includes('pulsa') || c.includes('paket data')) return '<i class="fa-solid fa-mobile-screen"></i>';
    if (c.includes('voucher') || c.includes('perdana')) return '<i class="fa-solid fa-sim-card"></i>';
    if (c.includes('aksesoris') || c.includes('headphone') || c.includes('case') || c.includes('charger')) return '<i class="fa-solid fa-headphones"></i>';
    if (c.includes('servis') || c.includes('tempered') || c.includes('lcd')) return '<i class="fa-solid fa-screwdriver-wrench"></i>';
    if (c.includes('wallet') || c.includes('dana') || c.includes('ovo') || c.includes('gopay')) return '<i class="fa-solid fa-wallet"></i>';
    if (c.includes('pln') || c.includes('token') || c.includes('ppob')) return '<i class="fa-solid fa-bolt"></i>';
    if (c.includes('piutang') || c.includes('pinjam')) return '<i class="fa-solid fa-hand-holding-dollar"></i>';
    if (c.includes('kulakan') || c.includes('deposit')) return '<i class="fa-solid fa-money-bill-transfer"></i>';
    if (c.includes('operasional') || c.includes('listrik') || c.includes('wifi') || c.includes('air')) return '<i class="fa-solid fa-lightbulb"></i>';
    if (c.includes('sewa') || c.includes('ruko')) return '<i class="fa-solid fa-shop"></i>';
    if (c.includes('gaji') || c.includes('makan')) return '<i class="fa-solid fa-utensils"></i>';
    if (c.includes('hutang')) return '<i class="fa-solid fa-receipt"></i>';
    if (c.includes('pribadi') || c.includes('prive')) return '<i class="fa-solid fa-user"></i>';
    return '<i class="fa-solid fa-tag"></i>';
  },

  renderCategoryOptions(selectedCat = null) {
    const selectedType = document.querySelector('input[name="trx-type"]:checked')?.value || 'in';
    const categories = Storage.getCategories(selectedType);
    const categoryInput = document.getElementById('trx-category');
    const categoryLabel = document.getElementById('trx-category-label');
    const buttonsContainer = document.getElementById('trx-category-buttons');
    const filterSelect = document.getElementById('trx-filter-category');

    // Tentukan kategori terpilih (jika ada argumen selectedCat atau default kategori pertama)
    const activeCategory = selectedCat && categories.includes(selectedCat)
      ? selectedCat
      : (categories.length > 0 ? categories[0] : '');

    if (categoryInput) {
      categoryInput.value = activeCategory;
    }

    if (categoryLabel) {
      categoryLabel.textContent = activeCategory;
      categoryLabel.className = selectedType === 'in' 
        ? 'text-[11px] font-bold text-emerald-600 truncate max-w-[200px]'
        : 'text-[11px] font-bold text-rose-600 truncate max-w-[200px]';
    }

    // Render Tombol-Tombol Kategori
    if (buttonsContainer) {
      buttonsContainer.innerHTML = '';
      categories.forEach(cat => {
        const isSelected = cat === activeCategory;
        const btn = document.createElement('button');
        btn.type = 'button';

        if (isSelected) {
          btn.className = selectedType === 'in'
            ? 'p-2.5 rounded-xl text-xs font-bold text-left transition flex items-center gap-2 border bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-500/30'
            : 'p-2.5 rounded-xl text-xs font-bold text-left transition flex items-center gap-2 border bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30 ring-2 ring-rose-500/30';
        } else {
          btn.className = 'p-2.5 rounded-xl text-xs font-medium text-left transition flex items-center gap-2 border bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/70 active:scale-98';
        }

        const iconHtml = this.getCategoryIcon(cat);
        btn.innerHTML = `
          <span class="shrink-0 w-6 h-6 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-[11px]">
            ${iconHtml}
          </span>
          <span class="truncate font-semibold">${cat}</span>
        `;

        btn.addEventListener('click', () => {
          this.renderCategoryOptions(cat);
        });

        buttonsContainer.appendChild(btn);
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

  openModal(trx = null) {
    const modal = document.getElementById('transaction-modal');
    const modalTitle = document.getElementById('trx-modal-title');
    const form = document.getElementById('transaction-form');
    form.reset();

    if (trx) {
      this.editingId = trx.id;
      modalTitle.textContent = 'Edit Transaksi';
      const radio = document.querySelector(`input[name="trx-type"][value="${trx.type}"]`);
      if (radio) radio.checked = true;
      this.renderCategoryOptions(trx.category);
      document.getElementById('trx-date').value = trx.date;
      document.getElementById('trx-amount').value = App.formatNumberOnly(trx.amount);
      document.getElementById('trx-payment').value = trx.paymentMethod || 'Tunai';
      document.getElementById('trx-notes').value = trx.notes || '';
    } else {
      this.editingId = null;
      modalTitle.textContent = 'Tambah Transaksi Baru';
      document.querySelector('input[name="trx-type"][value="in"]').checked = true;
      this.renderCategoryOptions();
      document.getElementById('trx-date').value = getFormattedDate(0);
      document.getElementById('trx-amount').value = '';
      document.getElementById('trx-payment').value = 'Tunai';
      document.getElementById('trx-notes').value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('trx-amount').focus(), 100);
  },

  closeModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.editingId = null;
  },

  saveTransaction() {
    const type = document.querySelector('input[name="trx-type"]:checked').value;
    const date = document.getElementById('trx-date').value;
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
