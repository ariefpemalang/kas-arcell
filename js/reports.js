/**
 * reports.js - Analitik, Grafik Keuangan, Laporan Kategori, Ekspor Excel & Laporan Cetak BUKU ARcell
 */

const Reports = {
  cashflowChart: null,
  categoryChart: null,
  period: 'month', // 'today', 'week', 'month', 'year', 'all'
  categoryFilterType: 'all', // 'all', 'in', 'out'
  chartCategoryType: 'in', // 'in', 'out'
  selectedCategory: 'all',
  categorySearchQuery: '',
  activeDrilldownKey: null,

  init() {
    this.bindEvents();
    this.updateReport();
  },

  bindEvents() {
    const periodSelect = document.getElementById('report-period-select');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.period = e.target.value;
        this.updateReport();
      });
    }

    const exportBtn = document.getElementById('btn-export-excel');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportToExcel());
    }

    const printBtn = document.getElementById('btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  },

  getPeriodLabel() {
    switch (this.period) {
      case 'today': return 'Hari Ini';
      case 'week': return '7 Hari Terakhir';
      case 'month': return 'Bulan Ini';
      case 'year': return 'Tahun Ini';
      case 'all': return 'Semua Waktu';
      default: return 'Bulan Ini';
    }
  },

  getDateRange() {
    const now = new Date();
    let startDate = '';
    let endDate = getFormattedDate(0);

    if (this.period === 'today') {
      startDate = getFormattedDate(0);
    } else if (this.period === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split('T')[0];
    } else if (this.period === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${y}-${m}-01`;
    } else if (this.period === 'year') {
      startDate = `${now.getFullYear()}-01-01`;
    } else {
      startDate = '2000-01-01';
    }

    return { startDate, endDate };
  },

  updateReport() {
    const { startDate, endDate } = this.getDateRange();
    const allTrx = Storage.getTransactions();
    
    // Filter transactions by period
    const filteredTrx = allTrx.filter(t => t.date >= startDate && t.date <= endDate);

    const totalIncome = filteredTrx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = filteredTrx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);
    const netProfit = totalIncome - totalExpense;

    // Update summary cards on reports page
    const repInc = document.getElementById('rep-total-income');
    const repExp = document.getElementById('rep-total-expense');
    const repNet = document.getElementById('rep-net-profit');
    const repTrxCount = document.getElementById('rep-trx-count');

    if (repInc) repInc.textContent = App.formatCurrency(totalIncome);
    if (repExp) repExp.textContent = App.formatCurrency(totalExpense);
    if (repNet) {
      repNet.textContent = (netProfit >= 0 ? '+' : '') + App.formatCurrency(netProfit);
      repNet.className = `text-2xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    if (repTrxCount) repTrxCount.textContent = `${filteredTrx.length} Transaksi`;

    // Update Period Badge on Category Report
    const badge = document.getElementById('rep-cat-period-badge');
    if (badge) badge.textContent = this.getPeriodLabel();

    // Render components
    this.renderCharts(filteredTrx);
    this.renderTopCategories(filteredTrx);
    this.renderCategoryReport(filteredTrx);
  },

  renderCharts(transactions) {
    if (typeof Chart === 'undefined') return;

    // 1. Group by date for Cash Flow Chart
    const dateMap = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(t => {
      if (!dateMap[t.date]) {
        dateMap[t.date] = { income: 0, expense: 0 };
      }
      if (t.type === 'in') {
        dateMap[t.date].income += Number(t.amount || 0);
      } else {
        dateMap[t.date].expense += Number(t.amount || 0);
      }
    });

    const dates = Object.keys(dateMap);
    const inData = dates.map(d => dateMap[d].income);
    const outData = dates.map(d => dateMap[d].expense);

    const cashCtx = document.getElementById('cashflow-chart')?.getContext('2d');
    if (cashCtx) {
      if (this.cashflowChart) this.cashflowChart.destroy();

      this.cashflowChart = new Chart(cashCtx, {
        type: 'bar',
        data: {
          labels: dates.map(d => {
            const parts = d.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
          }),
          datasets: [
            {
              label: 'Pemasukan',
              data: inData,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderRadius: 6
            },
            {
              label: 'Pengeluaran',
              data: outData,
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Plus Jakarta Sans', weight: '600' }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${App.formatCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            y: {
              ticks: {
                callback: (val) => 'Rp ' + (val >= 1000000 ? (val / 1000000) + ' Jt' : (val >= 1000 ? (val / 1000) + ' Rb' : val))
              },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. Category Breakdown Chart (Doughnut) - Support Pemasukan & Pengeluaran
    const catMap = {};
    const chartType = this.chartCategoryType || 'in';
    transactions.filter(t => t.type === chartType).forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);

    const catCtx = document.getElementById('category-chart')?.getContext('2d');
    if (catCtx) {
      if (this.categoryChart) this.categoryChart.destroy();

      this.categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catData,
            backgroundColor: [
              '#0284c7', '#0d9488', '#10b981', '#f59e0b',
              '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6',
              '#ef4444', '#64748b', '#a855f7', '#06b6d4'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 10,
                font: { family: 'Plus Jakarta Sans', size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${App.formatCurrency(ctx.raw)}`
              }
            }
          }
        }
      });
    }
  },

  setChartCategoryType(type) {
    this.chartCategoryType = type;
    const btnIn = document.getElementById('btn-chart-cat-in');
    const btnOut = document.getElementById('btn-chart-cat-out');
    const title = document.getElementById('category-chart-title');

    if (type === 'in') {
      if (btnIn) btnIn.className = 'px-2 py-1 rounded-md bg-white text-slate-800 shadow-2xs font-bold transition';
      if (btnOut) btnOut.className = 'px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 transition';
      if (title) title.textContent = 'Komposisi Pemasukan Terbesar';
    } else {
      if (btnIn) btnIn.className = 'px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 transition';
      if (btnOut) btnOut.className = 'px-2 py-1 rounded-md bg-white text-slate-800 shadow-2xs font-bold transition';
      if (title) title.textContent = 'Komposisi Pengeluaran Terbesar';
    }

    const { startDate, endDate } = this.getDateRange();
    const filteredTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
    this.renderCharts(filteredTrx);
    this.renderTopCategories(filteredTrx);
  },

  renderTopCategories(transactions) {
    const listElem = document.getElementById('top-categories-list');
    if (!listElem) return;

    const catMap = {};
    const chartType = this.chartCategoryType || 'in';
    const targetTrx = transactions.filter(t => t.type === chartType);
    const totalAmount = targetTrx.reduce((s, t) => s + Number(t.amount || 0), 0);

    targetTrx.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
      listElem.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada data ${chartType === 'in' ? 'pemasukan' : 'pengeluaran'} pada periode ini.</p>`;
      return;
    }

    const barColor = chartType === 'in' ? 'bg-sky-500' : 'bg-rose-500';

    let html = '';
    sortedCats.slice(0, 5).forEach(([cat, val]) => {
      const pct = totalAmount > 0 ? Math.round((val / totalAmount) * 100) : 0;
      html += `
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="font-medium text-slate-700">${cat}</span>
            <span class="font-bold text-slate-900">${App.formatCurrency(val)} (${pct}%)</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    });
    listElem.innerHTML = html;
  },

  // ========================================================
  // MODUL LAPORAN REKAPITULASI KATEGORI
  // ========================================================
  renderCategoryReport(transactions) {
    const tbody = document.getElementById('tbody-category-report');
    const tfoot = document.getElementById('tfoot-category-report');
    const selectEl = document.getElementById('report-category-select');
    if (!tbody) return;

    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);

    // Kumpulkan data per kategori: key: `${t.type}:::${t.category}`
    const catMap = {};
    transactions.forEach(t => {
      const key = `${t.type}:::${t.category}`;
      if (!catMap[key]) {
        catMap[key] = {
          key,
          name: t.category,
          type: t.type,
          count: 0,
          total: 0,
          transactions: []
        };
      }
      catMap[key].count += 1;
      catMap[key].total += Number(t.amount || 0);
      catMap[key].transactions.push(t);
    });

    let catList = Object.values(catMap);

    // Populate Category Dropdown Filter options
    if (selectEl) {
      const currentVal = this.selectedCategory || 'all';
      const uniqueNames = Array.from(new Set(catList.map(c => c.name))).sort();
      let optHtml = '<option value="all">Semua Kategori</option>';
      uniqueNames.forEach(n => {
        optHtml += `<option value="${n}" ${currentVal === n ? 'selected' : ''}>${n}</option>`;
      });
      selectEl.innerHTML = optHtml;
    }

    // Mini Indicators calculation
    const statActiveCats = document.getElementById('rep-cat-active-count');
    const statTopIn = document.getElementById('rep-cat-top-in');
    const statTopOut = document.getElementById('rep-cat-top-out');

    const topInCat = Object.values(catMap).filter(c => c.type === 'in').sort((a,b) => b.total - a.total)[0];
    const topOutCat = Object.values(catMap).filter(c => c.type === 'out').sort((a,b) => b.total - a.total)[0];

    if (statActiveCats) statActiveCats.textContent = `${catList.length} Kategori`;
    if (statTopIn) statTopIn.textContent = topInCat ? `${topInCat.name} (${App.formatCurrency(topInCat.total)})` : '-';
    if (statTopOut) statTopOut.textContent = topOutCat ? `${topOutCat.name} (${App.formatCurrency(topOutCat.total)})` : '-';

    // Apply Filter Type (all / in / out)
    if (this.categoryFilterType !== 'all') {
      catList = catList.filter(c => c.type === this.categoryFilterType);
    }

    // Apply Dropdown Filter (selectedCategory)
    if (this.selectedCategory && this.selectedCategory !== 'all') {
      catList = catList.filter(c => c.name === this.selectedCategory);
    }

    // Apply Search Query
    if (this.categorySearchQuery) {
      const q = this.categorySearchQuery.toLowerCase();
      catList = catList.filter(c => c.name.toLowerCase().includes(q));
    }

    // Sort by Total Nominal descending
    catList.sort((a, b) => b.total - a.total);

    // Render rows
    tbody.innerHTML = '';
    if (catList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 text-center text-slate-400 italic">
            <i class="fa-solid fa-folder-open text-2xl mb-2 block text-slate-300"></i>
            Tidak ada transaksi pada kategori ini untuk periode ${this.getPeriodLabel().toLowerCase()}.
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    let grandCount = 0;
    let grandTotal = 0;

    catList.forEach((item, idx) => {
      grandCount += item.count;
      grandTotal += item.total;
      const baseTotal = item.type === 'in' ? totalIn : totalOut;
      const pct = baseTotal > 0 ? ((item.total / baseTotal) * 100).toFixed(1) : 0;
      const avg = item.count > 0 ? Math.round(item.total / item.count) : 0;
      const isIn = item.type === 'in';
      const badgeType = isIn
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-arrow-down text-[10px]"></i> Pemasukan</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><i class="fa-solid fa-arrow-up text-[10px]"></i> Pengeluaran</span>';

      const barColor = isIn ? 'bg-emerald-500' : 'bg-rose-500';
      const numColor = isIn ? 'text-emerald-700' : 'text-rose-700';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/80 transition text-slate-700 border-b border-slate-100 cursor-pointer';
      tr.onclick = (e) => {
        if (!e.target.closest('button')) {
          this.toggleCategoryDrilldown(item);
        }
      };

      tr.innerHTML = `
        <td class="py-3 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4 font-bold text-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${barColor}"></span>
            <span>${item.name}</span>
          </div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">${badgeType}</td>
        <td class="py-3 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">${item.count}x</td>
        <td class="py-3 px-4 text-right font-medium text-slate-600 whitespace-nowrap">${App.formatCurrency(avg)}</td>
        <td class="py-3 px-4 text-right font-black ${numColor} whitespace-nowrap">${App.formatCurrency(item.total)}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, pct)}%"></div>
            </div>
            <span class="text-[11px] font-bold text-slate-500 w-12 text-right">${pct}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center no-print">
          <button type="button" onclick="Reports.toggleCategoryDrilldown('${item.key}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition active:scale-95 flex items-center gap-1 mx-auto" title="Lihat Rincian Transaksi">
            <i class="fa-solid fa-list-ul text-[10px]"></i> Rincian
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="text-slate-800">
          <td colspan="3" class="py-3 px-4 uppercase text-[11px] tracking-wider">Total Rekapitulasi</td>
          <td class="py-3 px-4 text-center font-bold">${grandCount}x Transaksi</td>
          <td class="py-3 px-4 text-right text-slate-500">-</td>
          <td class="py-3 px-4 text-right font-black text-indigo-900">${App.formatCurrency(grandTotal)}</td>
          <td colspan="2" class="py-3 px-4 text-slate-500 text-xs">Porsi dihitung per jenis kas</td>
        </tr>
      `;
    }

    // Refresh drilldown if previously open
    if (this.activeDrilldownKey) {
      this.toggleCategoryDrilldown(this.activeDrilldownKey, true);
    }
  },

  setCategoryTypeFilter(type) {
    this.categoryFilterType = type;
    ['all', 'in', 'out'].forEach(t => {
      const btn = document.getElementById(`btn-cat-filter-${t}`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-3 py-1.5 rounded-lg transition cat-type-btn bg-white text-slate-800 font-bold shadow-xs';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg transition cat-type-btn text-slate-600 hover:text-slate-900 font-semibold';
        }
      }
    });
    const { startDate, endDate } = this.getDateRange();
    const filteredTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
    this.renderCategoryReport(filteredTrx);
  },

  setSelectedCategory(cat) {
    this.selectedCategory = cat;
    const { startDate, endDate } = this.getDateRange();
    const filteredTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
    this.renderCategoryReport(filteredTrx);
  },

  setCategorySearch(query) {
    this.categorySearchQuery = query.trim();
    const { startDate, endDate } = this.getDateRange();
    const filteredTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
    this.renderCategoryReport(filteredTrx);
  },

  toggleCategoryDrilldown(keyOrItem, keepOpen = false) {
    const panel = document.getElementById('category-drilldown-panel');
    if (!panel) return;

    let item = typeof keyOrItem === 'object' ? keyOrItem : null;
    const key = typeof keyOrItem === 'string' ? keyOrItem : (item ? item.key : null);

    if (!item && key) {
      const [type, name] = key.split(':::');
      const { startDate, endDate } = this.getDateRange();
      const allTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
      const matches = allTrx.filter(t => t.type === type && t.category === name);
      item = {
        key,
        name,
        type,
        count: matches.length,
        total: matches.reduce((s, t) => s + Number(t.amount || 0), 0),
        transactions: matches
      };
    }

    if (!item) return;

    if (!keepOpen && this.activeDrilldownKey === item.key && !panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
      this.activeDrilldownKey = null;
      return;
    }

    this.activeDrilldownKey = item.key;

    const titleEl = document.getElementById('drilldown-title');
    const badgeEl = document.getElementById('drilldown-badge');
    const totalEl = document.getElementById('drilldown-total');
    const tbody = document.getElementById('tbody-category-drilldown');

    if (titleEl) titleEl.textContent = `Rincian Transaksi: ${item.name} (${item.type === 'in' ? 'Pemasukan' : 'Pengeluaran'})`;
    if (badgeEl) badgeEl.textContent = `${item.count} Transaksi`;
    if (totalEl) totalEl.textContent = `Total: ${App.formatCurrency(item.total)}`;

    if (tbody) {
      tbody.innerHTML = '';
      const sortedTrx = [...item.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
      if (sortedTrx.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-400 italic">Tidak ada transaksi.</td></tr>';
      } else {
        sortedTrx.forEach(trx => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50/80 text-slate-700';
          tr.innerHTML = `
            <td class="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">${trx.date}</td>
            <td class="py-2.5 px-3 text-slate-600">${trx.notes || '-'}</td>
            <td class="py-2.5 px-3 text-center whitespace-nowrap font-semibold text-slate-500">${trx.paymentMethod || 'Tunai'}</td>
            <td class="py-2.5 px-3 text-right font-bold ${item.type === 'in' ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap">${App.formatCurrency(trx.amount)}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    panel.classList.remove('hidden');
    if (!keepOpen) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  closeDrilldown() {
    const panel = document.getElementById('category-drilldown-panel');
    if (panel) panel.classList.add('hidden');
    this.activeDrilldownKey = null;
  },

  // ========================================================
  // EXPORT KE EXCEL DENGAN SHEET REKAP KATEGORI
  // ========================================================
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('Pustaka SheetJS belum dimuat!', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Transactions Sheet
    const transactions = Storage.getTransactions().map(t => ({
      'ID Transaksi': t.id,
      'Tanggal': t.date,
      'Jenis': t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
      'Kategori': t.category,
      'Jumlah (Rp)': t.amount,
      'Metode Bayar': t.paymentMethod || 'Tunai',
      'Catatan': t.notes || ''
    }));
    const wsTrx = XLSX.utils.json_to_sheet(transactions);
    XLSX.utils.book_append_sheet(wb, wsTrx, 'Kas Masuk-Keluar');

    // 2. Category Summary Sheet (Rekap Kategori Periode Ini)
    const { startDate, endDate } = this.getDateRange();
    const filteredTrx = Storage.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
    const catMap = {};
    const totalIn = filteredTrx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalOut = filteredTrx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);

    filteredTrx.forEach(t => {
      const key = `${t.type}:::${t.category}`;
      if (!catMap[key]) {
        catMap[key] = { name: t.category, type: t.type, count: 0, total: 0 };
      }
      catMap[key].count += 1;
      catMap[key].total += Number(t.amount || 0);
    });

    const categorySummary = Object.values(catMap).sort((a, b) => b.total - a.total).map(c => {
      const baseTotal = c.type === 'in' ? totalIn : totalOut;
      const pct = baseTotal > 0 ? ((c.total / baseTotal) * 100).toFixed(1) + '%' : '0%';
      return {
        'Nama Kategori': c.name,
        'Jenis Kas': c.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
        'Jumlah Transaksi': c.count,
        'Total Nominal (Rp)': c.total,
        'Rata-rata / Transaksi (Rp)': c.count > 0 ? Math.round(c.total / c.count) : 0,
        'Kontribusi (%)': pct
      };
    });
    const wsCats = XLSX.utils.json_to_sheet(categorySummary);
    XLSX.utils.book_append_sheet(wb, wsCats, 'Rekap Kategori');

    // 3. Receivables Sheet (Piutang)
    const receivables = Storage.getReceivables().map(r => ({
      'ID': r.id,
      'Nama Pelanggan': r.debtorName,
      'No. WhatsApp': r.phone || '-',
      'Total Piutang (Rp)': r.amount,
      'Sudah Dibayar (Rp)': r.paidAmount || 0,
      'Sisa Piutang (Rp)': Math.max(0, Number(r.amount) - Number(r.paidAmount || 0)),
      'Jatuh Tempo': r.dueDate || '-',
      'Status': r.status === 'paid' ? 'Lunas' : (r.paidAmount > 0 ? 'Sebagian' : 'Belum Lunas'),
      'Keterangan': r.notes || ''
    }));
    const wsRec = XLSX.utils.json_to_sheet(receivables);
    XLSX.utils.book_append_sheet(wb, wsRec, 'Piutang Pelanggan');

    // 4. Debts Sheet (Hutang Toko)
    const debts = Storage.getDebts().map(d => ({
      'ID': d.id,
      'Kreditur / Supplier': d.creditorName,
      'Kontak': d.phone || '-',
      'Total Hutang (Rp)': d.amount,
      'Sudah Dibayar (Rp)': d.paidAmount || 0,
      'Sisa Hutang (Rp)': Math.max(0, Number(d.amount) - Number(d.paidAmount || 0)),
      'Jatuh Tempo': d.dueDate || '-',
      'Status': d.status === 'paid' ? 'Lunas' : (d.paidAmount > 0 ? 'Sebagian' : 'Belum Lunas'),
      'Keterangan': d.notes || ''
    }));
    const wsDebts = XLSX.utils.json_to_sheet(debts);
    XLSX.utils.book_append_sheet(wb, wsDebts, 'Hutang Toko');

    // Generate filename
    const dateStr = getFormattedDate(0);
    const fileName = `KAS_ARcell_Laporan_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
    App.showToast(`Data laporan & kategori berhasil diekspor: ${fileName}`, 'success');
  }
};
