# 📱 BUKU ARcell - Aplikasi Pembukuan Kas, Kasir Toko Harian, Hutang & Piutang

Aplikasi manajemen keuangan dan operasional terpadu khusus konter pulsa, paket data, aksesoris, servis HP, dan kasir toko **"BUKU ARcell"**. Menggabungkan sistem kas konter dan pembukuan toko harian dalam 1 aplikasi yang cepat, modern, responsif, dan bekerja secara offline.

---

## 🚀 Cara Membuka / Menggunakan Aplikasi

### 1. 📱 Install di HP Android (APK)
- **Download Langsung**: Unduh file APK terbaru di menu **[Releases](https://github.com/ariefpemalang/BUKU-ARcell/releases)** atau tab **[Actions Artifacts](https://github.com/ariefpemalang/BUKU-ARcell/actions)** pada repositori ini.
- **Install di HP**: Buka file `BUKU-ARcell.apk` di HP Android dan pilih *Install*.
- **Build Otomatis (CI/CD)**: Setiap ada update kode yang di-push ke branch `main`, GitHub Actions akan otomatis membuat file APK baru yang siap di-download.

### 2. 💻 Menggunakan di Komputer / Laptop
1. **Klik dua kali file `start.bat`**, ATAU
2. **Buka file `index.html`** langsung menggunakan browser (Google Chrome, Microsoft Edge, dll).

---

## ✨ Fitur-Fitur Terpadu:

### 1. 🏪 Pembukuan Kasir Harian (Buka / Tutup Toko)
- **Buka Toko di Pagi Hari**:
  - Masukkan modal awal pecahan uang kasir / kembalian di laci.
  - **Otomatis Saldo Buka Toko**: Saldo Awal otomatis terisi dari Saldo Akhir saat tutup toko kemarin!
- **Selama Toko Buka**:
  - Indikator status live *"Toko Sedang Buka"*.
  - Catat pengeluaran tunai laci kasir di siang hari (beli galon, bensin, plastik, makan siang, dll).
- **Tutup Toko di Malam Hari**:
  - Masukkan fisik uang kas yang tersisa di laci saat toko tutup (Saldo Akhir).
  - **Hitung Keuntungan Bersih Otomatis**:
    $$\text{Keuntungan Bersih} = (\text{Saldo Akhir} + \text{Pengeluaran Kas}) - \text{Saldo Awal}$$
  - Live preview laba bersih saat mengetik nominal Saldo Akhir.
- **Statistik & Riwayat Sesi Harian**:
  - Akumulasi total laba bersih, rata-rata laba harian, pengeluaran kas, dan laba sesi terakhir.
  - Ekspor riwayat sesi ke **Excel (.xlsx)** & Cetak/PDF.

### 2. 📊 Dashboard & Monitoring Real-Time
- **Banner Status Sesi Toko**: Menampilkan langsung di beranda apakah toko sedang buka atau tutup beserta jam operasional dan modal kasir.
- **Saldo Kas Bersih Real-Time**: Posisi total uang kas toko saat ini.
- **Pemasukan & Pengeluaran Hari Ini**: Memantau perputaran uang harian.
- **Total Piutang & Hutang**: Uang konter yang masih di pelanggan dan kewajiban tagihan ke supplier.

### 3. 💵 Manajemen Kas Masuk & Kas Keluar
- Pencatatan kas masuk & keluar dengan kategori khusus konter.
- Filter lengkap (periode tanggal, kategori, jenis kas, dan live search).
- Cetak Struk / Nota Bukti Kasir (Print thermal receipt 58mm/80mm / PDF).

### 4. 📖 Buku Hutang & Piutang (Otomatis Potong Kas)
- **Piutang Pelanggan (Menghutangi Orang)**:
  - Tampilan ringkas (Nomor WhatsApp & Jatuh Tempo disembunyikan agar cepat saat input).
  - **Otomatis Potong Saldo Kas**: Saat mencatat piutang baru, saldo kas toko otomatis berkurang (*Kas Keluar: Pemberian Piutang*).
  - **Pelunasan Mengembalikan Kas**: Saat pelanggan membayar hutang, uang otomatis masuk kembali ke saldo kas toko (*Kas Masuk*).
  - **Otomatis Sembunyikan Pelanggan yang Sudah Lunas**: Pelanggan yang sudah melunasi hutangnya otomatis disembunyikan dari daftar piutang aktif agar tabel selalu rapi.
- **Hutang Toko**:
  - Catat tagihan tempo pengambilan perdana, saldo server agen pulsa, atau sparepart.
  - Catat cicilan pembayaran hutang yang terintegrasi ke kas keluar.

### 5. 📈 Laporan, Grafik & Analitik
- Grafik visual Arus Kas harian/bulanan (Chart.js).
- Diagram komposisi kategori pemasukan terbesar konter.
- Ekspor seluruh laporan ke Excel (.xlsx) dengan 1-klik.

---

© 2026 BUKU ARcell - Solusi Pembukuan Konter & Toko Terpadu.
