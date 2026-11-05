/**
 * storeSessions.js - Modul Pembukuan Toko Harian (Buka / Tutup Toko, Saldo Kasir & Laba Bersih)
 * Penggabungan fitur "PEMBUKUAN TOKO" ke dalam BUKU ARcell
 */

const StoreSessions = {
  init() {
    this.bindEvents();
    this.renderSessionState();
    this.renderTableAndStats();
  },

  bindEvents() {
    // Form Buka Toko
    const formBuka = document.getElementById('form-buka-toko');
    if (formBuka) {
      formBuka.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBukaToko();
      });
    }

    // Form Tutup Toko
    const formTutup = document.getElementById('form-tutup-toko');
    if (formTutup) {
      formTutup.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTutupToko();
      });
    }

    // Tombol Batal Sesi Buka
    const btnBatal = document.getElementById('btn-batal-buka-sesi');
    if (btnBatal) {
      btnBatal.addEventListener('click', () => {
        if (confirm('Yakin ingin membatalkan sesi buka toko hari ini? Data pengeluaran sesi ini akan terhapus.')) {
          Storage.cancelActiveSession();
          App.showToast('Sesi buka toko dibatalkan.', 'info');
          this.renderSessionState();
          App.refreshDashboard();
        }
      });
    }

    // Tambah Pengeluaran Siang
    const btnTambahPengeluaran = document.getElementById('btn-tambah-pengeluaran-sesi');
    if (btnTambahPengeluaran) {
      btnTambahPengeluaran.addEventListener('click', () => this.handleTambahPengeluaran());
    }

    // Enter key submit pada input pengeluaran sesi
    const inputNominalPengeluaran = document.getElementById('input-nominal-pengeluaran-sesi');
    if (inputNominalPengeluaran) {
      inputNominalPengeluaran.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleTambahPengeluaran();
        }
      });
    }

    const inputNamaPengeluaran = document.getElementById('input-nama-pengeluaran-sesi');
    if (inputNamaPengeluaran) {
      inputNamaPengeluaran.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (inputNominalPengeluaran) inputNominalPengeluaran.focus();
        }
      });
    }

    // Input Saldo Akhir live preview
    const inputSaldoAkhir = document.getElementById('input-saldo-akhir-sesi');
    if (inputSaldoAkhir) {
      inputSaldoAkhir.addEventListener('input', () => this.updateLivePreview());
    }

    // Export Excel Riwayat Sesi
    const btnExportExcel = document.getElementById('btn-export-excel-sesi');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => this.exportExcel());
    }

    // Cetak Laporan Sesi
    const btnPrint = document.getElementById('btn-print-sesi');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => window.print());
    }

    // Hapus Semua Sesi
    const btnHapusSemua = document.getElementById('btn-hapus-semua-sesi');
    if (btnHapusSemua) {
      btnHapusSemua.addEventListener('click', () => {
        if (confirm('PERINGATAN: Yakin ingin menghapus seluruh riwayat pembukuan harian buka/tutup toko?')) {
          Storage.clearAllDailySessions();
          App.showToast('Semua riwayat pembukuan toko telah dihapus.', 'info');
          this.renderSessionState();
          this.renderTableAndStats();
        }
      });
    }
  },

  renderSessionState() {
    const activeSession = Storage.getActiveSession();
    const sectionBuka = document.getElementById('section-buka-toko-view');
    const sectionTutup = document.getElementById('section-tutup-toko-view');
    const dashStatusBadge = document.getElementById('dash-store-status-badge');
    const dashStatusText = document.getElementById('dash-store-status-text');

    // Update tanggal hari ini di form buka toko
    const inputTglBuka = document.getElementById('input-tanggal-buka-sesi');
    if (inputTglBuka && !inputTglBuka.value) {
      inputTglBuka.value = getFormattedDate(0);
    }

    if (activeSession) {
      // Kondisi TOKO SEDANG BUKA
      if (sectionBuka) sectionBuka.classList.add('hidden');
      if (sectionTutup) sectionTutup.classList.remove('hidden');

      const dispSaldoAwal = document.getElementById('disp-saldo-awal-sesi');
      const dispTgl = document.getElementById('disp-tanggal-sesi');
      const infoWaktu = document.getElementById('info-waktu-buka-sesi');

      if (dispSaldoAwal) dispSaldoAwal.textContent = App.formatCurrency(activeSession.saldoAwal);
      if (dispTgl) dispTgl.textContent = activeSession.tanggal;
      if (infoWaktu) infoWaktu.textContent = `(Mulai Pukul ${activeSession.jamBuka || '-'})`;

      if (dashStatusBadge) {
        dashStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
        dashStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Toko Sedang Buka';
      }
      if (dashStatusText) {
        dashStatusText.textContent = `Mulai Pukul ${activeSession.jamBuka} &bull; Modal Awal: ${App.formatCurrency(activeSession.saldoAwal)}`;
      }

      this.renderListPengeluaranSesi();
      this.updateLivePreview();
    } else {
      // Kondisi TOKO TUTUP (BELUM BUKA)
      if (sectionBuka) sectionBuka.classList.remove('hidden');
      if (sectionTutup) sectionTutup.classList.add('hidden');

      if (dashStatusBadge) {
        dashStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200';
        dashStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> Toko Belum Dibuka';
      }
      if (dashStatusText) {
        dashStatusText.textContent = 'Klik menu Buka/Tutup Toko untuk mengisi modal awal kasir hari ini.';
      }

      // Otomatis rekomendasi Saldo Awal dari Saldo Akhir sesi kemarin
      const sessions = Storage.getDailySessions();
      const infoKemarinEl = document.getElementById('info-saldo-kemarin-sesi');
      const inputSaldoAwal = document.getElementById('input-saldo-awal-sesi');

      if (sessions.length > 0) {
        const lastSession = sessions[sessions.length - 1];
        const saldoAkhirKemarin = lastSession.saldoAkhir || 0;
        if (inputSaldoAwal && !inputSaldoAwal.value) {
          inputSaldoAwal.value = saldoAkhirKemarin > 0 ? App.formatNumberOnly(saldoAkhirKemarin) : '';
        }
        if (infoKemarinEl) {
          infoKemarinEl.innerHTML = `
            <span class="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              Otomatis terisi dari Saldo Akhir sesi kemarin (${lastSession.tanggal}): ${App.formatCurrency(saldoAkhirKemarin)}
            </span>
          `;
        }
      } else {
        if (infoKemarinEl) {
          infoKemarinEl.innerHTML = `
            <span class="text-slate-400 text-[11px] flex items-center gap-1">
              <i class="fa-solid fa-circle-info"></i> Masukkan modal awal kasir. Sesi berikutnya akan terisi otomatis.
            </span>
          `;
        }
      }
    }
  },

  handleBukaToko() {
    const tanggal = document.getElementById('input-tanggal-buka-sesi').value || getFormattedDate(0);
    const rawSaldoAwal = document.getElementById('input-saldo-awal-sesi').value.replace(/[^0-9]/g, '');
    const saldoAwal = Number(rawSaldoAwal);

    if (isNaN(saldoAwal) || saldoAwal < 0) {
      App.showToast('Masukkan nominal modal awal kasir yang valid!', 'error');
      return;
    }

    const jamBuka = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    Storage.startSession({ tanggal, jamBuka, saldoAwal });

    App.showToast(`Toko resmi dibuka! Modal awal kasir: ${App.formatCurrency(saldoAwal)}`, 'success');
    this.renderSessionState();
    App.refreshDashboard();
  },

  togglePengeluaranForm(forceState) {
    const container = document.getElementById('form-pengeluaran-sesi-container');
    if (!container) return;
    const isCurrentlyHidden = container.classList.contains('hidden');
    const shouldShow = typeof forceState === 'boolean' ? forceState : isCurrentlyHidden;

    if (shouldShow) {
      container.classList.remove('hidden');
      const inputNama = document.getElementById('input-nama-pengeluaran-sesi');
      if (inputNama) inputNama.focus();
    } else {
      container.classList.add('hidden');
    }
  },

  handleTambahPengeluaran() {
    const activeSession = Storage.getActiveSession();
    if (!activeSession) return;

    const inputNama = document.getElementById('input-nama-pengeluaran-sesi');
    const inputNominal = document.getElementById('input-nominal-pengeluaran-sesi');

    const nama = inputNama.value.trim() || 'Pengeluaran Kas Operasional';
    const rawNominal = inputNominal.value.replace(/[^0-9]/g, '');
    const nominal = Number(rawNominal);

    if (!nominal || nominal <= 0) {
      App.showToast('Nominal pengeluaran harus lebih dari 0!', 'error');
      return;
    }

    Storage.addSessionExpense({ nama, nominal });
    inputNama.value = '';
    inputNominal.value = '';

    // Tutup kembali form input agar hanya tombol + Tambah yang tampil
    this.togglePengeluaranForm(false);

    App.showToast('Pengeluaran operasional berhasil dicatat!', 'success');
    this.renderListPengeluaranSesi();
    this.updateLivePreview();
  },

  hapusPengeluaran(index) {
    Storage.removeSessionExpense(index);
    this.renderListPengeluaranSesi();
    this.updateLivePreview();
    App.showToast('Item pengeluaran dihapus.', 'info');
  },

  renderListPengeluaranSesi() {
    const activeSession = Storage.getActiveSession();
    if (!activeSession) return;

    const container = document.getElementById('container-list-pengeluaran-sesi');
    const tbody = document.getElementById('tbody-pengeluaran-sesi');
    const dispTotal = document.getElementById('disp-total-pengeluaran-sesi');
    const items = activeSession.pengeluaranList || [];

    const total = items.reduce((s, i) => s + Number(i.nominal || 0), 0);
    if (dispTotal) dispTotal.textContent = App.formatCurrency(total);

    if (!tbody) return;
    tbody.innerHTML = '';

    if (items.length === 0) {
      if (container) container.classList.add('hidden');
      return;
    }

    if (container) container.classList.remove('hidden');

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-amber-100 hover:bg-amber-50/50 text-xs';
      tr.innerHTML = `
        <td class="py-2 px-3 text-slate-700 font-medium">${item.nama}</td>
        <td class="py-2 px-3 text-right font-bold text-amber-700">${App.formatCurrency(item.nominal)}</td>
        <td class="py-2 px-2 text-center">
          <button type="button" onclick="StoreSessions.hapusPengeluaran(${idx})" class="text-rose-500 hover:text-rose-700 p-1">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  updateLivePreview() {
    const activeSession = Storage.getActiveSession();
    if (!activeSession) return;

    const saldoAwal = Number(activeSession.saldoAwal || 0);
    const totalPengeluaran = (activeSession.pengeluaranList || []).reduce((s, i) => s + Number(i.nominal || 0), 0);
    const inputSaldoAkhir = document.getElementById('input-saldo-akhir-sesi');
    const rawSaldoAkhir = inputSaldoAkhir ? inputSaldoAkhir.value.replace(/[^0-9]/g, '') : '0';
    const saldoAkhir = Number(rawSaldoAkhir || 0);

    // Rumus: Keuntungan = (Saldo Akhir + Pengeluaran) - Saldo Awal
    const keuntungan = (saldoAkhir + totalPengeluaran) - saldoAwal;

    const prevAwal = document.getElementById('prev-saldo-awal-sesi');
    const prevPengeluaran = document.getElementById('prev-pengeluaran-sesi');
    const prevAkhir = document.getElementById('prev-saldo-akhir-sesi');
    const prevKeuntungan = document.getElementById('prev-keuntungan-sesi');

    if (prevAwal) prevAwal.textContent = App.formatCurrency(saldoAwal);
    if (prevPengeluaran) prevPengeluaran.textContent = App.formatCurrency(totalPengeluaran);
    if (prevAkhir) prevAkhir.textContent = App.formatCurrency(saldoAkhir);

    if (prevKeuntungan) {
      prevKeuntungan.textContent = (keuntungan >= 0 ? '+' : '') + App.formatCurrency(keuntungan);
      prevKeuntungan.className = `text-2xl font-black ${keuntungan >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    }
  },

  handleTutupToko() {
    const activeSession = Storage.getActiveSession();
    if (!activeSession) return;

    const rawSaldoAkhir = document.getElementById('input-saldo-akhir-sesi').value.replace(/[^0-9]/g, '');
    const saldoAkhir = Number(rawSaldoAkhir);
    const catatan = document.getElementById('input-catatan-tutup-sesi').value.trim();

    if (isNaN(saldoAkhir) || saldoAkhir < 0) {
      App.showToast('Masukkan fisik saldo akhir kasir di laci!', 'error');
      return;
    }

    const jamTutup = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const record = Storage.finishSession({ saldoAkhir, catatan, jamTutup });

    // Reset input fields
    document.getElementById('input-saldo-akhir-sesi').value = '';
    document.getElementById('input-catatan-tutup-sesi').value = '';

    App.showToast(`Toko resmi ditutup! Keuntungan Bersih: ${App.formatCurrency(record.keuntungan)}`, 'success');
    this.renderSessionState();
    this.renderTableAndStats();
    App.refreshDashboard();
  },

  renderTableAndStats() {
    const sessions = Storage.getDailySessions();
    const tbody = document.getElementById('tbody-riwayat-sesi');
    const emptyState = document.getElementById('empty-state-sesi');

    // Update 4 Stats Cards
    const totalKeuntungan = sessions.reduce((s, r) => s + Number(r.keuntungan || 0), 0);
    const totalPengeluaran = sessions.reduce((s, r) => s + Number(r.pengeluaran || 0), 0);
    const rataKeuntungan = sessions.length > 0 ? Math.round(totalKeuntungan / sessions.length) : 0;
    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    const statKeuntungan = document.getElementById('stat-total-keuntungan-sesi');
    const statPengeluaran = document.getElementById('stat-total-pengeluaran-sesi');
    const statRata = document.getElementById('stat-rata-keuntungan-sesi');
    const statHari = document.getElementById('stat-total-hari-sesi');
    const statTerakhir = document.getElementById('stat-keuntungan-terakhir-sesi');
    const statTglTerakhir = document.getElementById('stat-tgl-terakhir-sesi');

    if (statKeuntungan) statKeuntungan.textContent = App.formatCurrency(totalKeuntungan);
    if (statPengeluaran) statPengeluaran.textContent = App.formatCurrency(totalPengeluaran);
    if (statRata) statRata.textContent = App.formatCurrency(rataKeuntungan);
    if (statHari) statHari.textContent = `${sessions.length} Hari Kerja Tercatat`;
    if (statTerakhir) statTerakhir.textContent = lastSession ? App.formatCurrency(lastSession.keuntungan) : 'Rp 0';
    if (statTglTerakhir) statTglTerakhir.textContent = lastSession ? `Tanggal: ${lastSession.tanggal}` : '-';

    if (!tbody) return;
    tbody.innerHTML = '';

    if (sessions.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Tampilkan urutan terbaru di atas
    [...sessions].reverse().forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 text-xs sm:text-sm';

      const isUntung = item.keuntungan >= 0;
      const keuntunganBadge = `<span class="font-bold ${isUntung ? 'text-emerald-600' : 'text-rose-600'}">${isUntung ? '+' : ''}${App.formatCurrency(item.keuntungan)}</span>`;

      // Rincian tooltip pengeluaran
      let rincianText = '';
      if (item.pengeluaranList && item.pengeluaranList.length > 0) {
        rincianText = item.pengeluaranList.map(p => `${p.nama} (${App.formatCurrency(p.nominal)})`).join(', ');
      }

      tr.innerHTML = `
        <td class="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">${item.tanggal}</td>
        <td class="py-3 px-3.5 text-slate-500 whitespace-nowrap">${item.jamBuka || '-'} - ${item.jamTutup || '-'}</td>
        <td class="py-3 px-3.5 text-right font-medium text-slate-700 whitespace-nowrap">${App.formatCurrency(item.saldoAwal)}</td>
        <td class="py-3 px-3.5 text-right font-semibold text-amber-700 whitespace-nowrap" title="${rincianText}">${App.formatCurrency(item.pengeluaran)}</td>
        <td class="py-3 px-3.5 text-right font-medium text-slate-700 whitespace-nowrap">${App.formatCurrency(item.saldoAkhir)}</td>
        <td class="py-3 px-3.5 text-right whitespace-nowrap">${keuntunganBadge}</td>
        <td class="py-3 px-3.5 text-slate-500 max-w-xs truncate text-xs" title="${item.catatan || ''}">${item.catatan || '-'}</td>
        <td class="py-3 px-3.5 text-center whitespace-nowrap no-print">
          <button onclick="StoreSessions.hapusSesi('${item.id}')" title="Hapus Data Sesi" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  hapusSesi(id) {
    if (confirm('Yakin ingin menghapus catatan pembukuan sesi ini?')) {
      Storage.deleteDailySession(id);
      App.showToast('Catatan sesi pembukuan telah dihapus.', 'info');
      this.renderSessionState();
      this.renderTableAndStats();
    }
  },

  exportExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('Pustaka SheetJS belum siap!', 'error');
      return;
    }

    const sessions = Storage.getDailySessions();
    if (sessions.length === 0) {
      App.showToast('Belum ada data sesi untuk diekspor!', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = sessions.map(s => ({
      'Tanggal': s.tanggal,
      'Jam Buka': s.jamBuka || '-',
      'Jam Tutup': s.jamTutup || '-',
      'Saldo Awal (Modal) Rp': s.saldoAwal,
      'Pengeluaran Kas Rp': s.pengeluaran,
      'Saldo Akhir (Fisik) Rp': s.saldoAkhir,
      'Keuntungan Bersih Rp': s.keuntungan,
      'Keterangan': s.catatan || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pembukuan Kas Toko');

    const fileName = `Pembukuan_Kas_Toko_ARcell_${getFormattedDate(0)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    App.showToast(`Data pembukuan harian diekspor ke: ${fileName}`, 'success');
  }
};
