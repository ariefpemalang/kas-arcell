# ☁️ Petunjuk Sinkronisasi Database Cloud (ar-pro.my.id)

Aplikasi **BUKU ARcell** kini telah dilengkapi dengan sistem sinkronisasi database cloud dua arah (*two-way smart merge*). Dengan fitur ini, seluruh transaksi, kas masuk, kas keluar, pembukuan toko, piutang, dan hutang dapat tersinkronisasi otomatis antara:
1. **Aplikasi Mobile Android (APK)** di HP.
2. **Website Online** di `https://ar-pro.my.id`.
3. **Komputer Kasir / Laptop Toko**.

---

## 🚀 Langkah 1: Upload Folder `api` ke Hosting / Server `ar-pro.my.id`

Agar server `ar-pro.my.id` dapat menerima dan menyimpan database dari HP/PC, Anda cukup mengunggah folder **`api/`** atau file zip terbaru:

### Cara A: Upload File `buku-arcell-web.zip` (Paling Praktis)
1. Buka File Manager cPanel / Hosting / VPS domain `ar-pro.my.id`.
2. Masuk ke folder web root (biasanya `public_html` atau `/var/www/html`).
3. Upload file **`buku-arcell-web.zip`** yang ada di folder proyek ini.
4. Klik kanan file zip tersebut lalu pilih **Extract** (Ekstrak di tempat).
5. Selesai! File web dan backend `api/sync.php` sudah aktif di server Anda.

### Cara B: Upload Folder `api` Saja
Jika website sudah terpasang dan Anda hanya ingin menambahkan fitur sinkronisasi:
1. Upload folder **`api/`** dari proyek ini ke dalam folder root `ar-pro.my.id`.
2. Pastikan file `api/sync.php` dapat diakses di:
   `https://ar-pro.my.id/api/sync.php?action=ping`
   *(Jika berhasil, halaman akan menampilkan pesan `{"success":true,"message":"Koneksi ke server database ar-pro.my.id berhasil."}`)*

---

## 🔒 Keamanan & Perlindungan Data

- **CORS Aktif**: Memungkinkan APK Android di HP melakukan sinkronisasi dengan aman ke server.
- **Perlindungan File Data**: Folder `api/data/` dilindungi oleh file `.htaccess` dan script PHP `<?php exit; ?>`, sehingga database **tidak bisa diintip atau didownload sembarangan** oleh publik lewat browser.
- **Kunci Sinkronisasi (Sync Key)**: Menggunakan kunci token rahasia (default: `arcell-sync-2026`) untuk memastikan hanya aplikasi milik Anda yang dapat mengubah data di server.
- **Backup Otomatis**: Setiap kali terjadi sinkronisasi baru, server otomatis mencadangkan versi sebelumnya di folder `api/data/backups/`.

---

## 📱 Cara Menggunakan di HP Android & PC

1. **Sinkronisasi Otomatis**:
   - Setiap kali Anda menambah transaksi baru, mencatat piutang, bayar hutang, atau buka/tutup toko, data akan otomatis terkirim ke server dalam hitungan detik.
   - Saat aplikasi dibuka pertama kali, aplikasi akan otomatis mencocokkan data terbaru dari server.
2. **Sinkronisasi Manual**:
   - Klik tombol **`ar-pro.my.id ↻`** pada bagian atas layar (Header).
   - Atau masuk ke menu **Pengaturan Toko** > **Sinkronisasi Cloud** > klik **Sinkronkan Sekarang**.
3. **Bekerja Secara Offline**:
   - Jika HP sedang tidak ada kuota/koneksi internet, Anda tetap dapat melakukan transaksi seperti biasa karena data tersimpan aman di HP.
   - Begitu HP terhubung kembali ke internet, aplikasi akan otomatis menyinkronkan data yang tertunda ke server cloud.
