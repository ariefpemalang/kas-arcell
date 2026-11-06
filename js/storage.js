/**
 * storage.js - LocalStorage & Data Layer for BUKU ARcell
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'arcell_transactions',
  DEBTS: 'arcell_debts', // Hutang (kita berhutang ke orang/agen)
  RECEIVABLES: 'arcell_receivables', // Piutang (orang lain berhutang ke kita)
  SETTINGS: 'arcell_settings',
  CATEGORIES_IN: 'arcell_cat_in',
  CATEGORIES_OUT: 'arcell_cat_out',
  DELETED_CATEGORIES: 'arcell_deleted_categories',
  DAILY_SESSIONS: 'arcell_daily_sessions', // Pembukuan Harian Toko (Buka/Tutup)
  ACTIVE_SESSION: 'arcell_active_session'  // Sesi Toko yang Sedang Aktif
};

const DEFAULT_SETTINGS = {
  storeName: 'BUKU ARcell',
  tagline: 'Solusi Pulsa, Kuota, Aksesoris & Servis HP',
  storePhone: '081234567890',
  storeAddress: 'Jl. Pemuda No. 88 (Depan Pasar)',
  currency: 'IDR'
};

const DEFAULT_CATEGORIES_IN = [
  'Penjualan Pulsa & Paket Data',
  'Penjualan Voucher Fisik & Perdana',
  'Aksesoris HP (Case, Kabel, Charger)',
  'Jasa Servis & Pasang Tempered Glass',
  'Top Up E-Wallet (Dana, Ovo, Gopay)',
  'Token PLN & Pembayaran PPOB',
  'Pelunasan Piutang Pelanggan',
  'Pemasukan Lainnya'
];

const DEFAULT_CATEGORIES_OUT = [
  'Pemberian Piutang / Pinjaman',
  'Kulakan / Deposit Saldo Agen Pulsa',
  'Kulakan Aksesoris & Sparepart HP',
  'Belanja Stok Voucher & Kartu Perdana',
  'Biaya Operasional (Listrik, Wifi, Air)',
  'Sewa Tempat / Ruko',
  'Gaji Karyawan / Uang Makan',
  'Pembayaran Cicilan Hutang',
  'Keperluan Pribadi / Prive',
  'Pengeluaran Lainnya'
];

// Helper to get formatted date string (YYYY-MM-DD)
function getFormattedDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate Realistic Seed Data if empty
function getInitialSeedData() {
  const today = getFormattedDate(0);
  const yesterday = getFormattedDate(-1);
  const twoDaysAgo = getFormattedDate(-2);
  const threeDaysAgo = getFormattedDate(-3);

  const transactions = [
    {
      id: 'trx-1',
      date: threeDaysAgo,
      type: 'in',
      category: 'Penjualan Pulsa & Paket Data',
      amount: 150000,
      paymentMethod: 'Tunai',
      notes: 'Paket Data Telkomsel 25GB (3 pelanggan)',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'trx-2',
      date: threeDaysAgo,
      type: 'out',
      category: 'Kulakan / Deposit Saldo Agen Pulsa',
      amount: 500000,
      paymentMethod: 'Transfer Bank',
      notes: 'Top up deposit server pulsa Digipos & Mitra',
      createdAt: new Date(Date.now() - 3 * 86400000 + 1000).toISOString()
    },
    {
      id: 'trx-3',
      date: twoDaysAgo,
      type: 'in',
      category: 'Jasa Servis & Pasang Tempered Glass',
      amount: 220000,
      paymentMethod: 'QRIS',
      notes: 'Ganti LCD Oppo A5s + Pasang Antigores',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'trx-4',
      date: twoDaysAgo,
      type: 'in',
      category: 'Aksesoris HP (Case, Kabel, Charger)',
      amount: 85000,
      paymentMethod: 'Tunai',
      notes: 'Kabel data Type-C Robot & Softcase iPhone 11',
      createdAt: new Date(Date.now() - 2 * 86400000 + 2000).toISOString()
    },
    {
      id: 'trx-5',
      date: yesterday,
      type: 'out',
      category: 'Biaya Operasional (Listrik, Wifi, Air)',
      amount: 120000,
      paymentMethod: 'Tunai',
      notes: 'Beli token listrik konter & galon air',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'trx-6',
      date: yesterday,
      type: 'in',
      category: 'Top Up E-Wallet (Dana, Ovo, Gopay)',
      amount: 350000,
      paymentMethod: 'Tunai',
      notes: 'Topup Saldo Dana 300rb + Admin 10rb, Gopay 40rb',
      createdAt: new Date(Date.now() - 86400000 + 5000).toISOString()
    },
    {
      id: 'trx-7',
      date: today,
      type: 'in',
      category: 'Penjualan Pulsa & Paket Data',
      amount: 95000,
      paymentMethod: 'QRIS',
      notes: 'Paket Indosat Freedom 50GB',
      createdAt: new Date().toISOString()
    }
  ];

  const receivables = [
    {
      id: 'rec-1',
      debtorName: 'Pak Budi Santoso',
      phone: '081298765432',
      amount: 120000,
      paidAmount: 50000,
      dueDate: getFormattedDate(3),
      notes: 'Ganti baterai Redmi 9 (kurang 70rb)',
      status: 'partial',
      payments: [
        { date: yesterday, amount: 50000, note: 'DP Servis' }
      ],
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'rec-2',
      debtorName: 'Mbak Dewi Warung Depan',
      phone: '085712348899',
      amount: 60000,
      paidAmount: 0,
      dueDate: getFormattedDate(1),
      notes: 'Pulsa Telkomsel 50rb + Token 10rb',
      status: 'unpaid',
      payments: [],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const debts = [
    {
      id: 'dbt-1',
      creditorName: 'Distributor Kartu Perdana (Pak Agus)',
      phone: '081345678901',
      amount: 800000,
      paidAmount: 300000,
      dueDate: getFormattedDate(7),
      notes: 'Ambil 50 pcs Perdana Kuota Indosat & Telkomsel',
      status: 'partial',
      payments: [
        { date: threeDaysAgo, amount: 300000, note: 'Bayar bertahap nota #104' }
      ],
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    }
  ];

  const dailySessions = [
    {
      id: 'ses-' + (Date.now() - 2 * 86400000),
      tanggal: twoDaysAgo,
      jamBuka: '08:00',
      jamTutup: '21:30',
      saldoAwal: 250000,
      saldoAkhir: 820000,
      pengeluaran: 70000,
      pengeluaranList: [
        { nama: 'Beli air galon & lakban', nominal: 35000 },
        { nama: 'Makan siang karyawan', nominal: 35000 }
      ],
      keuntungan: 640000,
      catatan: 'Tutup normal, toko ramai'
    },
    {
      id: 'ses-' + (Date.now() - 86400000),
      tanggal: yesterday,
      jamBuka: '08:15',
      jamTutup: '22:00',
      saldoAwal: 820000,
      saldoAkhir: 1450000,
      pengeluaran: 50000,
      pengeluaranList: [
        { nama: 'Beli token listrik kasir', nominal: 50000 }
      ],
      keuntungan: 680000,
      catatan: 'Penjualan kuota & pulsa laris'
    }
  ];

  return { transactions, receivables, debts, dailySessions };
}

const Storage = {
  // Initialization
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES_IN)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES_IN, JSON.stringify(DEFAULT_CATEGORIES_IN));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES_OUT)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES_OUT, JSON.stringify(DEFAULT_CATEGORIES_OUT));
    }

    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      const seed = getInitialSeedData();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(seed.transactions));
      localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(seed.receivables));
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(seed.debts));
    }

    // Migrasi riwayat dari aplikasi PEMBUKUAN TOKO sebelumnya jika ada
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_SESSIONS)) {
      const existingToko = localStorage.getItem('pembukuan_toko_records_v2') || localStorage.getItem('pembukuan_toko_records');
      if (existingToko) {
        try {
          const parsed = JSON.parse(existingToko);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.DAILY_SESSIONS)) {
      const seed = getInitialSeedData();
      localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(seed.dailySessions));
    }
  },

  _notifyChange() {
    if (typeof SyncManager !== 'undefined' && SyncManager.triggerAutoSync) {
      SyncManager.triggerAutoSync();
    }
  },

  // Settings
  getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
      if (s.storeName === 'KAS ARcell') {
        s.storeName = 'BUKU ARcell';
        this.saveSettings(s);
      }
      return s;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushSettings) {
      SupabaseClient.pushSettings(settings);
    }
  },

  // Categories Deleted List (Blacklist)
  getDeletedCategories() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_CATEGORIES)) || [];
    } catch {
      return [];
    }
  },
  recordDeletedCategory(cat) {
    const list = this.getDeletedCategories();
    if (!list.includes(cat)) {
      list.push(cat);
      localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify(list));
    }
  },
  unmarkDeletedCategory(cat) {
    let list = this.getDeletedCategories();
    list = list.filter(c => c !== cat);
    localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify(list));
  },

  // Categories
  getCategories(type = 'in') {
    const key = type === 'in' ? STORAGE_KEYS.CATEGORIES_IN : STORAGE_KEYS.CATEGORIES_OUT;
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(raw) && raw.length > 0) return raw;
      return type === 'in' ? DEFAULT_CATEGORIES_IN : DEFAULT_CATEGORIES_OUT;
    } catch {
      return type === 'in' ? DEFAULT_CATEGORIES_IN : DEFAULT_CATEGORIES_OUT;
    }
  },
  saveCategories(type, list) {
    const key = type === 'in' ? STORAGE_KEYS.CATEGORIES_IN : STORAGE_KEYS.CATEGORIES_OUT;
    localStorage.setItem(key, JSON.stringify(list || []));
    this._notifyChange();
  },

  // Transactions (Kas Masuk & Kas Keluar)
  getTransactions() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
      return list.sort((a, b) => new Date(b.date + 'T23:59:59') - new Date(a.date + 'T23:59:59'));
    } catch {
      return [];
    }
  },
  addTransaction(trx) {
    const list = this.getTransactions();
    trx.id = 'trx-' + Date.now();
    trx.createdAt = new Date().toISOString();
    list.unshift(trx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushTransaction) {
      SupabaseClient.pushTransaction(trx);
    }
    return trx;
  },
  updateTransaction(id, updatedData) {
    let list = this.getTransactions();
    const index = list.findIndex(t => t.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedData };
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
      this._notifyChange();
      if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushTransaction) {
        SupabaseClient.pushTransaction(list[index]);
      }
      return list[index];
    }
    return null;
  },
  deleteTransaction(id) {
    let list = this.getTransactions();
    list = list.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.deleteTransaction) {
      SupabaseClient.deleteTransaction(id);
    }
    return true;
  },

  // Piutang (Receivables - Pelanggan hutang ke ARcell)
  getReceivables() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIVABLES)) || [];
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch {
      return [];
    }
  },
  addReceivable(item, deductFromCash = true, paymentMethod = 'Tunai') {
    const list = this.getReceivables();
    item.id = 'rec-' + Date.now();
    item.paidAmount = item.paidAmount || 0;
    item.payments = item.payments || [];
    item.date = item.date || getFormattedDate(0);
    item.status = item.paidAmount >= item.amount ? 'paid' : (item.paidAmount > 0 ? 'partial' : 'unpaid');
    item.createdAt = new Date().toISOString();
    item.deductFromCash = deductFromCash;
    item.paymentMethod = paymentMethod;

    // Jika potong saldo kas dicentang, otomatis buat transaksi Kas Keluar (Pengeluaran)
    if (deductFromCash) {
      const cashOutTrx = this.addTransaction({
        date: item.date,
        type: 'out',
        category: 'Pemberian Piutang / Pinjaman',
        amount: Number(item.amount),
        paymentMethod: paymentMethod || 'Tunai',
        notes: `Menghutangi: ${item.debtorName} (${item.notes || 'Pinjaman Uang Kas Toko'})`
      });
      item.cashOutTrxId = cashOutTrx.id;
    }

    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushReceivable) {
      SupabaseClient.pushReceivable(item);
    }
    return item;
  },
  updateReceivable(id, updatedData, deductFromCash = true, paymentMethod = 'Tunai') {
    let list = this.getReceivables();
    const index = list.findIndex(r => r.id === id);
    if (index !== -1) {
      const existing = list[index];
      list[index] = { ...existing, ...updatedData };
      list[index].status = list[index].paidAmount >= list[index].amount ? 'paid' : (list[index].paidAmount > 0 ? 'partial' : 'unpaid');

      // Sinkronkan ke transaksi kas keluar jika sebelumnya sudah ada
      if (existing.cashOutTrxId) {
        if (deductFromCash) {
          this.updateTransaction(existing.cashOutTrxId, {
            amount: Number(updatedData.amount),
            date: updatedData.date || existing.date || getFormattedDate(0),
            paymentMethod: paymentMethod || existing.paymentMethod || 'Tunai',
            notes: `Menghutangi: ${updatedData.debtorName} (${updatedData.notes || 'Pinjaman Uang Kas Toko'})`
          });
        } else {
          // Jika checkbox dimatikan saat edit, hapus transaksi kas keluar
          this.deleteTransaction(existing.cashOutTrxId);
          delete list[index].cashOutTrxId;
        }
      } else if (deductFromCash) {
        // Jika sebelumnya belum potong kas, tapi sekarang dicentang
        const cashOutTrx = this.addTransaction({
          date: updatedData.date || getFormattedDate(0),
          type: 'out',
          category: 'Pemberian Piutang / Pinjaman',
          amount: Number(updatedData.amount),
          paymentMethod: paymentMethod || 'Tunai',
          notes: `Menghutangi: ${updatedData.debtorName} (${updatedData.notes || 'Pinjaman Uang Kas Toko'})`
        });
        list[index].cashOutTrxId = cashOutTrx.id;
      }

      list[index].deductFromCash = deductFromCash;
      list[index].paymentMethod = paymentMethod;

      localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(list));
      this._notifyChange();
      if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushReceivable) {
        SupabaseClient.pushReceivable(list[index]);
      }
      return list[index];
    }
    return null;
  },
  deleteReceivable(id) {
    let list = this.getReceivables();
    const item = list.find(r => r.id === id);
    // Hapus juga transaksi Kas Keluar pemotongan saldo kas jika ada
    if (item && item.cashOutTrxId) {
      this.deleteTransaction(item.cashOutTrxId);
    }
    list = list.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.deleteReceivable) {
      SupabaseClient.deleteReceivable(id);
    }
    return true;
  },
  addReceivablePayment(id, paymentAmount, paymentNote = 'Cicilan Piutang', recordToCash = true) {
    const list = this.getReceivables();
    const item = list.find(r => r.id === id);
    if (!item) return null;

    item.paidAmount = (item.paidAmount || 0) + Number(paymentAmount);
    if (item.paidAmount >= item.amount) {
      item.paidAmount = item.amount;
      item.status = 'paid';
    } else {
      item.status = 'partial';
    }

    if (!item.payments) item.payments = [];
    item.payments.push({
      date: getFormattedDate(0),
      amount: Number(paymentAmount),
      note: paymentNote
    });

    localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushReceivable) {
      SupabaseClient.pushReceivable(item);
    }

    // Otomatis masukkan ke Kas Masuk jika recordToCash = true
    if (recordToCash) {
      this.addTransaction({
        date: getFormattedDate(0),
        type: 'in',
        category: 'Pelunasan Piutang Pelanggan',
        amount: Number(paymentAmount),
        paymentMethod: 'Tunai',
        notes: `Pembayaran Piutang: ${item.debtorName} (${paymentNote})`
      });
    }

    return item;
  },

  // Hutang (Debts - ARcell hutang ke Supplier/Pihak Lain)
  getDebts() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBTS)) || [];
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch {
      return [];
    }
  },
  addDebt(item) {
    const list = this.getDebts();
    item.id = 'dbt-' + Date.now();
    item.paidAmount = item.paidAmount || 0;
    item.payments = item.payments || [];
    item.status = item.paidAmount >= item.amount ? 'paid' : (item.paidAmount > 0 ? 'partial' : 'unpaid');
    item.createdAt = new Date().toISOString();
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushDebt) {
      SupabaseClient.pushDebt(item);
    }
    return item;
  },
  updateDebt(id, updatedData) {
    let list = this.getDebts();
    const index = list.findIndex(d => d.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedData };
      list[index].status = list[index].paidAmount >= list[index].amount ? 'paid' : (list[index].paidAmount > 0 ? 'partial' : 'unpaid');
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(list));
      this._notifyChange();
      return list[index];
    }
    return null;
  },
  deleteDebt(id) {
    let list = this.getDebts();
    list = list.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.deleteDebt) {
      SupabaseClient.deleteDebt(id);
    }
    return true;
  },
  addDebtPayment(id, paymentAmount, paymentNote = 'Bayar Hutang', recordToCash = true) {
    const list = this.getDebts();
    const item = list.find(d => d.id === id);
    if (!item) return null;

    item.paidAmount = (item.paidAmount || 0) + Number(paymentAmount);
    if (item.paidAmount >= item.amount) {
      item.paidAmount = item.amount;
      item.status = 'paid';
    } else {
      item.status = 'partial';
    }

    if (!item.payments) item.payments = [];
    item.payments.push({
      date: getFormattedDate(0),
      amount: Number(paymentAmount),
      note: paymentNote
    });

    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(list));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushDebt) {
      SupabaseClient.pushDebt(item);
    }

    // Otomatis masukkan ke Kas Keluar jika recordToCash = true
    if (recordToCash) {
      this.addTransaction({
        date: getFormattedDate(0),
        type: 'out',
        category: 'Pembayaran Cicilan Hutang',
        amount: Number(paymentAmount),
        paymentMethod: 'Tunai',
        notes: `Bayar Hutang ke: ${item.creditorName} (${paymentNote})`
      });
    }

    return item;
  },

  // ===================== PEMBUKUAN TOKO HARIAN (BUKA/TUTUP SESI) =====================
  getDailySessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_SESSIONS)) || [];
    } catch {
      return [];
    }
  },
  saveDailySessions(sessions) {
    localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(sessions));
    this._notifyChange();
  },
  getActiveSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION)) || null;
    } catch {
      return null;
    }
  },
  startSession({ tanggal, jamBuka, saldoAwal }) {
    const session = {
      id: 'ses-' + Date.now(),
      tanggal: tanggal || getFormattedDate(0),
      jamBuka: jamBuka || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      saldoAwal: Number(saldoAwal || 0),
      pengeluaran: 0,
      pengeluaranList: [],
      startedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushActiveSession) {
      SupabaseClient.pushActiveSession(session);
    }
    return session;
  },
  addSessionExpense(item) {
    const session = this.getActiveSession();
    if (!session) return null;
    if (!session.pengeluaranList) session.pengeluaranList = [];
    session.pengeluaranList.push(item);
    session.pengeluaran = session.pengeluaranList.reduce((sum, i) => sum + Number(i.nominal || 0), 0);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushActiveSession) {
      SupabaseClient.pushActiveSession(session);
    }
    return session;
  },
  removeSessionExpense(index) {
    const session = this.getActiveSession();
    if (!session || !session.pengeluaranList) return null;
    session.pengeluaranList.splice(index, 1);
    session.pengeluaran = session.pengeluaranList.reduce((sum, i) => sum + Number(i.nominal || 0), 0);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushActiveSession) {
      SupabaseClient.pushActiveSession(session);
    }
    return session;
  },
  cancelActiveSession() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    this._notifyChange();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushActiveSession) {
      SupabaseClient.pushActiveSession(null);
    }
  },
  finishSession({ saldoAkhir, catatan, jamTutup }) {
    const session = this.getActiveSession();
    if (!session) return null;
    const finalSaldoAkhir = Number(saldoAkhir || 0);
    const finalPengeluaran = (session.pengeluaranList || []).reduce((sum, i) => sum + Number(i.nominal || 0), 0);
    const keuntungan = (finalSaldoAkhir + finalPengeluaran) - Number(session.saldoAwal || 0);

    const record = {
      id: session.id,
      tanggal: session.tanggal,
      jamBuka: session.jamBuka,
      jamTutup: jamTutup || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      saldoAwal: session.saldoAwal,
      saldoAkhir: finalSaldoAkhir,
      pengeluaran: finalPengeluaran,
      pengeluaranList: session.pengeluaranList || [],
      keuntungan,
      catatan: catatan || '',
      completedAt: new Date().toISOString()
    };

    const list = this.getDailySessions();
    list.push(record);
    this.saveDailySessions(list);
    this.cancelActiveSession();
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.pushDailySession) {
      SupabaseClient.pushDailySession(record);
    }
    return record;
  },
  deleteDailySession(id) {
    let list = this.getDailySessions();
    list = list.filter(s => s.id !== id);
    this.saveDailySessions(list);
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.client) {
      SupabaseClient.client.from('daily_sessions').delete().eq('id', id);
    }
  },
  clearAllDailySessions() {
    this.saveDailySessions([]);
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.client) {
      SupabaseClient.client.from('daily_sessions').delete().neq('id', '___none___');
    }
  },

  // Perhitungan Ringkasan / Summary
  getSummary(startDate = null, endDate = null) {
    const transactions = this.getTransactions();
    const receivables = this.getReceivables();
    const debts = this.getDebts();

    let filteredTrx = transactions;
    if (startDate && endDate) {
      filteredTrx = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    }

    const totalIncome = filteredTrx
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpense = filteredTrx
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Saldo Total Keseluruhan (tidak dibatasi filter agar merefleksikan kas fisik saat ini)
    const allTotalIncome = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const allTotalExpense = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const currentCashBalance = allTotalIncome - allTotalExpense;

    // Piutang yang belum terbayar (uang kita di luar)
    const pendingReceivables = receivables.reduce((sum, r) => {
      const remaining = Number(r.amount || 0) - Number(r.paidAmount || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    // Hutang yang belum lunas (kewajiban kita ke supplier/agen)
    const pendingDebts = debts.reduce((sum, d) => {
      const remaining = Number(d.amount || 0) - Number(d.paidAmount || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    return {
      currentCashBalance,
      periodIncome: totalIncome,
      periodExpense: totalExpense,
      periodNet: totalIncome - totalExpense,
      pendingReceivables,
      pendingDebts,
      totalTransactions: filteredTrx.length
    };
  },

  // Export & Import Database
  exportAllData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      categoriesIn: this.getCategories('in'),
      categoriesOut: this.getCategories('out'),
      deletedCategories: this.getDeletedCategories(),
      transactions: this.getTransactions(),
      receivables: this.getReceivables(),
      debts: this.getDebts(),
      dailySessions: this.getDailySessions(),
      activeSession: this.getActiveSession()
    };
    return JSON.stringify(data, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const deleted = this.getDeletedCategories();
      if (data.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      if (data.receivables) localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(data.receivables));
      if (data.debts) localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(data.debts));
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.categoriesIn && Array.isArray(data.categoriesIn)) {
        const cleanIn = data.categoriesIn.filter(c => !deleted.includes(c));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES_IN, JSON.stringify(cleanIn));
      }
      if (data.categoriesOut && Array.isArray(data.categoriesOut)) {
        const cleanOut = data.categoriesOut.filter(c => !deleted.includes(c));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES_OUT, JSON.stringify(cleanOut));
      }
      if (data.dailySessions) localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(data.dailySessions));
      if (data.activeSession) localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(data.activeSession));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.RECEIVABLES);
    localStorage.removeItem(STORAGE_KEYS.DEBTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES_IN);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES_OUT);
    localStorage.removeItem(STORAGE_KEYS.DAILY_SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    this.init();
  }
};

// Initialize right away
Storage.init();
