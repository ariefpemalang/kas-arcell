/**
 * js/supabase-client.js - Real-time Database Client for BUKU ARcell
 * Powered by Supabase (PostgreSQL + Realtime WebSocket)
 */

const SupabaseClient = {
  config: {
    url: 'https://umysveuuvouchvnakgwu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteXN2ZXV1dm91Y2h2bmFrZ3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5ODgyNzksImV4cCI6MjEwOTU2NDI3OX0.-H1ZhcT50KXLSlfFN7qCwxzZ1lgyC4-ZjRsLPLoxVOY'
  },
  client: null,
  realtimeChannel: null,
  isConnected: false,

  init() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('[Supabase] Library not loaded yet, retrying...');
      setTimeout(() => this.init(), 300);
      return;
    }

    try {
      this.client = supabase.createClient(this.config.url, this.config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      console.log('✅ [Supabase] Client initialized successfully.');

      // 1. Ambil data terbaru dari cloud saat startup
      this.pullAllData();

      // 2. Hubungkan listener real-time (WebSocket)
      this.subscribeRealtime();

      // 3. Update status UI
      this.updateStatusUI(true);

      // Listen browser online/offline
      window.addEventListener('online', () => {
        this.updateStatusUI(true);
        this.pullAllData();
      });
      window.addEventListener('offline', () => {
        this.updateStatusUI(false);
      });
    } catch (err) {
      console.error('[Supabase] Initialization error:', err);
      this.updateStatusUI(false);
    }
  },

  updateStatusUI(online) {
    this.isConnected = online;
    const statusTextEls = document.querySelectorAll('#cloud-sync-status-text, .sync-status-text');
    statusTextEls.forEach(el => {
      if (el) {
        el.textContent = online ? '⚡ Realtime Supabase Aktif' : 'Offline (Mode Lokal)';
        el.className = online ? 'text-xs text-emerald-400 font-medium' : 'text-xs text-slate-400';
      }
    });

    const statusDots = document.querySelectorAll('.sync-status-dot');
    statusDots.forEach(dot => {
      if (dot) {
        dot.className = online 
          ? 'sync-status-dot w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5'
          : 'sync-status-dot w-2 h-2 rounded-full bg-amber-400 inline-block mr-1.5';
      }
    });
  },

  // ==========================================
  // PULL DATA LENGKAP DARI SUPABASE KE LOKAL
  // ==========================================
  async pullAllData() {
    if (!this.client || !navigator.onLine) return;

    try {
      // 1. Categories
      const { data: cats, error: errCats } = await this.client.from('categories').select('*').order('id', { ascending: true });
      if (!errCats && Array.isArray(cats) && cats.length > 0) {
        const inCats = cats.filter(c => c.type === 'in').map(c => c.name);
        const outCats = cats.filter(c => c.type === 'out').map(c => c.name);
        if (inCats.length > 0) localStorage.setItem(STORAGE_KEYS.CATEGORIES_IN, JSON.stringify(inCats));
        if (outCats.length > 0) localStorage.setItem(STORAGE_KEYS.CATEGORIES_OUT, JSON.stringify(outCats));

        // Re-render kategori seketika di layar
        if (typeof App !== 'undefined') {
          App.renderCategoryChips('in');
          App.renderCategoryChips('out');
        }
        if (typeof Transactions !== 'undefined') {
          Transactions.renderCategoryOptions();
        }
      }

      // 2. Transactions
      const { data: trxs, error: errTrxs } = await this.client.from('transactions').select('*').order('date', { ascending: false });
      if (!errTrxs && Array.isArray(trxs)) {
        const mappedTrxs = trxs.map(t => ({
          id: t.id,
          date: t.date,
          type: t.type,
          category: t.category,
          amount: parseFloat(t.amount),
          paymentMethod: t.payment_method,
          notes: t.notes || '',
          createdAt: t.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mappedTrxs));
      }

      // 3. Receivables
      const { data: recs, error: errRecs } = await this.client.from('receivables').select('*');
      if (!errRecs && Array.isArray(recs)) {
        const mappedRecs = recs.map(r => ({
          id: r.id,
          debtorName: r.debtor_name,
          phone: r.phone || '',
          amount: parseFloat(r.amount),
          paidAmount: parseFloat(r.paid_amount || 0),
          dueDate: r.due_date || '',
          notes: r.notes || '',
          status: r.status,
          payments: r.payments || [],
          createdAt: r.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(mappedRecs));
      }

      // 4. Debts
      const { data: dbts, error: errDbts } = await this.client.from('debts').select('*');
      if (!errDbts && Array.isArray(dbts)) {
        const mappedDbts = dbts.map(d => ({
          id: d.id,
          creditorName: d.creditor_name,
          phone: d.phone || '',
          amount: parseFloat(d.amount),
          paidAmount: parseFloat(d.paid_amount || 0),
          dueDate: d.due_date || '',
          notes: d.notes || '',
          status: d.status,
          payments: d.payments || [],
          createdAt: d.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(mappedDbts));
      }

      // 5. Daily Sessions
      const { data: sessions, error: errSess } = await this.client.from('daily_sessions').select('*').order('tanggal', { ascending: true });
      if (!errSess && Array.isArray(sessions)) {
        const mappedSessions = sessions.map(s => ({
          id: s.id,
          tanggal: s.tanggal,
          jamBuka: s.jam_buka,
          jamTutup: s.jam_tutup,
          saldoAwal: parseFloat(s.saldo_awal || 0),
          saldoAkhir: parseFloat(s.saldo_akhir || 0),
          pengeluaran: parseFloat(s.pengeluaran || 0),
          pengeluaranList: s.pengeluaran_list || [],
          keuntungan: parseFloat(s.keuntungan || 0),
          catatan: s.catatan || ''
        }));
        localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(mappedSessions));
      }

      // 6. Active Session
      const { data: active, error: errAct } = await this.client.from('active_session').select('*').eq('id', 'current').maybeSingle();
      if (!errAct) {
        if (active && active.data) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(active.data));
        } else {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
        }
      }

      // 7. Settings
      const { data: settingsData, error: errSet } = await this.client.from('settings').select('*').eq('id', 'current').maybeSingle();
      if (!errSet && settingsData && settingsData.data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsData.data));
      }

      // Refresh seluruh UI setelah data ditarik
      this.refreshActiveViews();
      console.log('✅ [Supabase] Full data sync complete.');
    } catch (e) {
      console.warn('[Supabase] pullAllData error:', e);
    }
  },

  // ==========================================
  // REAL-TIME LISTENER (INSTAN TANPA RELOAD)
  // ==========================================
  subscribeRealtime() {
    if (!this.client) return;

    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.client
      .channel('arcell-realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
        console.log('⚡ [Realtime] Category change:', payload);
        this.pullCategoriesOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
        console.log('⚡ [Realtime] Transaction change:', payload.eventType);
        this.handleTransactionRealtime(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivables' }, payload => {
        console.log('⚡ [Realtime] Receivable change:', payload.eventType);
        this.handleReceivableRealtime(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, payload => {
        console.log('⚡ [Realtime] Debt change:', payload.eventType);
        this.handleDebtRealtime(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_sessions' }, payload => {
        console.log('⚡ [Realtime] Daily session change:', payload.eventType);
        this.handleSessionRealtime(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_session' }, payload => {
        console.log('⚡ [Realtime] Active session change:', payload.eventType);
        this.handleActiveSessionRealtime(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🚀 [Supabase] WebSocket Realtime SUBSCRIBED & ACTIVE!');
          this.updateStatusUI(true);
        }
      });
  },

  async pullCategoriesOnly() {
    if (!this.client) return;
    try {
      const { data: cats, error } = await this.client.from('categories').select('*').order('id', { ascending: true });
      if (!error && Array.isArray(cats) && cats.length > 0) {
        const inCats = cats.filter(c => c.type === 'in').map(c => c.name);
        const outCats = cats.filter(c => c.type === 'out').map(c => c.name);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES_IN, JSON.stringify(inCats));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES_OUT, JSON.stringify(outCats));

        if (typeof App !== 'undefined') {
          App.renderCategoryChips('in');
          App.renderCategoryChips('out');
        }
        if (typeof Transactions !== 'undefined') {
          Transactions.renderCategoryOptions();
          const activeType = document.querySelector('input[name="trx-type"]:checked')?.value || 'out';
          Transactions.renderCategoryManagerList(activeType);
        }
      }
    } catch(e) {
      console.warn('[Supabase] pullCategoriesOnly error:', e);
    }
  },

  handleTransactionRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    let list = Storage.getTransactions();

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const mapped = {
        id: newRow.id,
        date: newRow.date,
        type: newRow.type,
        category: newRow.category,
        amount: parseFloat(newRow.amount),
        paymentMethod: newRow.payment_method,
        notes: newRow.notes || '',
        createdAt: newRow.created_at
      };
      const idx = list.findIndex(t => t.id === mapped.id);
      if (idx >= 0) list[idx] = mapped;
      else list.unshift(mapped);
    } else if (eventType === 'DELETE') {
      const delId = oldRow ? oldRow.id : null;
      if (delId) list = list.filter(t => t.id !== delId);
    }

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    this.refreshActiveViews();
  },

  handleReceivableRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    let list = Storage.getReceivables();

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const mapped = {
        id: newRow.id,
        debtorName: newRow.debtor_name,
        phone: newRow.phone || '',
        amount: parseFloat(newRow.amount),
        paidAmount: parseFloat(newRow.paid_amount || 0),
        dueDate: newRow.due_date || '',
        notes: newRow.notes || '',
        status: newRow.status,
        payments: newRow.payments || [],
        createdAt: newRow.created_at
      };
      const idx = list.findIndex(r => r.id === mapped.id);
      if (idx >= 0) list[idx] = mapped;
      else list.unshift(mapped);
    } else if (eventType === 'DELETE') {
      const delId = oldRow ? oldRow.id : null;
      if (delId) list = list.filter(r => r.id !== delId);
    }

    localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(list));
    this.refreshActiveViews();
  },

  handleDebtRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    let list = Storage.getDebts();

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const mapped = {
        id: newRow.id,
        creditorName: newRow.creditor_name,
        phone: newRow.phone || '',
        amount: parseFloat(newRow.amount),
        paidAmount: parseFloat(newRow.paid_amount || 0),
        dueDate: newRow.due_date || '',
        notes: newRow.notes || '',
        status: newRow.status,
        payments: newRow.payments || [],
        createdAt: newRow.created_at
      };
      const idx = list.findIndex(d => d.id === mapped.id);
      if (idx >= 0) list[idx] = mapped;
      else list.unshift(mapped);
    } else if (eventType === 'DELETE') {
      const delId = oldRow ? oldRow.id : null;
      if (delId) list = list.filter(d => d.id !== delId);
    }

    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(list));
    this.refreshActiveViews();
  },

  handleSessionRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    let list = Storage.getDailySessions();

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const mapped = {
        id: newRow.id,
        tanggal: newRow.tanggal,
        jamBuka: newRow.jam_buka,
        jamTutup: newRow.jam_tutup,
        saldoAwal: parseFloat(newRow.saldo_awal || 0),
        saldoAkhir: parseFloat(newRow.saldo_akhir || 0),
        pengeluaran: parseFloat(newRow.pengeluaran || 0),
        pengeluaranList: newRow.pengeluaran_list || [],
        keuntungan: parseFloat(newRow.keuntungan || 0),
        catatan: newRow.catatan || ''
      };
      const idx = list.findIndex(s => s.id === mapped.id);
      if (idx >= 0) list[idx] = mapped;
      else list.unshift(mapped);
    } else if (eventType === 'DELETE') {
      const delId = oldRow ? oldRow.id : null;
      if (delId) list = list.filter(s => s.id !== delId);
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(list));
    this.refreshActiveViews();
  },

  handleActiveSessionRealtime(payload) {
    const { new: newRow } = payload;
    if (newRow && newRow.data) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(newRow.data));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
    if (typeof StoreSessions !== 'undefined') {
      StoreSessions.renderSessionState();
    }
  },

  refreshActiveViews() {
    if (typeof App === 'undefined') return;
    if (App.currentView === 'dashboard') App.refreshDashboard();
    else if (App.currentView === 'transactions' && typeof Transactions !== 'undefined') Transactions.renderTable();
    else if (App.currentView === 'debts' && typeof Debts !== 'undefined') { Debts.renderReceivablesTable(); Debts.renderDebtsTable(); }
    else if (App.currentView === 'storeSessions' && typeof StoreSessions !== 'undefined') { StoreSessions.renderSessionState(); StoreSessions.renderTableAndStats(); }
    else if (App.currentView === 'reports' && typeof Reports !== 'undefined') Reports.updateReport();

    // Re-render categories if relevant
    if (typeof App.renderCategoryChips === 'function') {
      App.renderCategoryChips('in');
      App.renderCategoryChips('out');
    }
    if (typeof Transactions !== 'undefined' && typeof Transactions.renderCategoryOptions === 'function') {
      Transactions.renderCategoryOptions();
    }
  },

  // ==========================================
  // PUSH PERUBAHAN DARI LOKAL KE SUPABASE
  // ==========================================
  async pushCategoryAdd(name, type) {
    if (!this.client) return;
    try {
      await this.client.from('categories').insert({ name, type });
      console.log('✅ [Supabase] Category added:', name, type);
    } catch(e) { console.error('[Supabase] pushCategoryAdd failed:', e); }
  },

  async pushCategoryDelete(name, type) {
    if (!this.client) return;
    try {
      await this.client.from('categories').delete().eq('name', name).eq('type', type);
      console.log('✅ [Supabase] Category deleted:', name, type);
    } catch(e) { console.error('[Supabase] pushCategoryDelete failed:', e); }
  },

  async pushTransaction(trx) {
    if (!this.client) return;
    try {
      const row = {
        id: trx.id,
        date: trx.date,
        type: trx.type,
        category: trx.category,
        amount: trx.amount,
        payment_method: trx.paymentMethod || 'Tunai',
        notes: trx.notes || '',
        created_at: trx.createdAt || new Date().toISOString()
      };
      await this.client.from('transactions').upsert(row);
    } catch(e) { console.error('[Supabase] pushTransaction failed:', e); }
  },

  async deleteTransaction(id) {
    if (!this.client) return;
    try {
      await this.client.from('transactions').delete().eq('id', id);
    } catch(e) { console.error('[Supabase] deleteTransaction failed:', e); }
  },

  async pushReceivable(rec) {
    if (!this.client) return;
    try {
      const row = {
        id: rec.id,
        debtor_name: rec.debtorName,
        phone: rec.phone || '',
        amount: rec.amount,
        paid_amount: rec.paidAmount || 0,
        due_date: rec.dueDate || null,
        notes: rec.notes || '',
        status: rec.status,
        payments: rec.payments || [],
        created_at: rec.createdAt || new Date().toISOString()
      };
      await this.client.from('receivables').upsert(row);
    } catch(e) { console.error('[Supabase] pushReceivable failed:', e); }
  },

  async deleteReceivable(id) {
    if (!this.client) return;
    try {
      await this.client.from('receivables').delete().eq('id', id);
    } catch(e) { console.error('[Supabase] deleteReceivable failed:', e); }
  },

  async pushDebt(debt) {
    if (!this.client) return;
    try {
      const row = {
        id: debt.id,
        creditor_name: debt.creditorName,
        phone: debt.phone || '',
        amount: debt.amount,
        paid_amount: debt.paidAmount || 0,
        due_date: debt.dueDate || null,
        notes: debt.notes || '',
        status: debt.status,
        payments: debt.payments || [],
        created_at: debt.createdAt || new Date().toISOString()
      };
      await this.client.from('debts').upsert(row);
    } catch(e) { console.error('[Supabase] pushDebt failed:', e); }
  },

  async deleteDebt(id) {
    if (!this.client) return;
    try {
      await this.client.from('debts').delete().eq('id', id);
    } catch(e) { console.error('[Supabase] deleteDebt failed:', e); }
  },

  async pushDailySession(session) {
    if (!this.client) return;
    try {
      const row = {
        id: session.id,
        tanggal: session.tanggal,
        jam_buka: session.jamBuka || '',
        jam_tutup: session.jamTutup || '',
        saldo_awal: session.saldoAwal || 0,
        saldo_akhir: session.saldoAkhir || 0,
        pengeluaran: session.pengeluaran || 0,
        pengeluaran_list: session.pengeluaranList || [],
        keuntungan: session.keuntungan || 0,
        catatan: session.catatan || ''
      };
      await this.client.from('daily_sessions').upsert(row);
    } catch(e) { console.error('[Supabase] pushDailySession failed:', e); }
  },

  async pushActiveSession(sessionData) {
    if (!this.client) return;
    try {
      if (sessionData) {
        await this.client.from('active_session').upsert({ id: 'current', data: sessionData });
      } else {
        await this.client.from('active_session').delete().eq('id', 'current');
      }
    } catch(e) { console.error('[Supabase] pushActiveSession failed:', e); }
  },

  async pushSettings(settings) {
    if (!this.client) return;
    try {
      await this.client.from('settings').upsert({ id: 'current', data: settings });
    } catch(e) { console.error('[Supabase] pushSettings failed:', e); }
  }
};
