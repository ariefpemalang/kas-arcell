/**
 * reports.js - Analitik, Grafik Keuangan, Ekspor Excel & Laporan Cetak BUKU ARcell
 */

const Reports = {
  cashflowChart: null,
  categoryChart: null,
  period: 'month', // 'today', 'week', 'month', 'year', 'all'

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
    
    // Filter transactions
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

    this.renderCharts(filteredTrx);
    this.renderTopCategories(filteredTrx);
  },

  renderCharts(transactions) {
    if (typeof Chart === 'undefined') return;

    // 1. Group by date for Cash Flow Chart
    const dateMap = {};
    // Sort transactions chronologically
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

    // 2. Category Breakdown Chart (Doughnut)
    const catMap = {};
    transactions.filter(t => t.type === 'in').forEach(t => {
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
              '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'
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

  renderTopCategories(transactions) {
    const listElem = document.getElementById('top-categories-list');
    if (!listElem) return;

    const catMap = {};
    const inTrx = transactions.filter(t => t.type === 'in');
    const totalIn = inTrx.reduce((s, t) => s + Number(t.amount || 0), 0);

    inTrx.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
      listElem.innerHTML = '<p class="text-xs text-slate-400 italic">Belum ada data pemasukan pada periode ini.</p>';
      return;
    }

    let html = '';
    sortedCats.slice(0, 5).forEach(([cat, val]) => {
      const pct = totalIn > 0 ? Math.round((val / totalIn) * 100) : 0;
      html += `
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="font-medium text-slate-700">${cat}</span>
            <span class="font-bold text-slate-900">${App.formatCurrency(val)} (${pct}%)</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="bg-sky-500 h-2 rounded-full" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    });
    listElem.innerHTML = html;
  },

  // Export to Excel using SheetJS (XLSX)
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('Pustaka SheetJS belum dimuat!', 'error');
      return;
    }

    const settings = Storage.getSettings();
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

    // 2. Receivables Sheet (Piutang)
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

    // 3. Debts Sheet (Hutang Toko)
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
    App.showToast(`Data berhasil diekspor ke file Excel: ${fileName}`, 'success');
  }
};
