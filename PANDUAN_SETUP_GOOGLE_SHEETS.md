# Panduan Setup Backend Google Sheets & Google Apps Script (GAS)
## SIM-INVENTORY - Seat Assy Mac Edition

Aplikasi ini sekarang sudah mendukung penuh **Google Sheets sebagai Database** dan **Google Apps Script (GAS) sebagai API Backend** menggantikan Supabase.

File backend Apps Script sudah disiapkan di file: **`Code.gs`**.

---

### Langkah 1: Buat Google Spreadsheet Baru
1. Buka browser dan kunjungi [Google Sheets](https://sheets.new).
2. Beri nama spreadsheet Anda, misalnya: **`DB_SIM_INVENTORY`**.

---

### Langkah 2: Buka Apps Script & Tempel Kode
1. Di Google Sheets tersebut, klik menu di bagian atas: **Ekstensi (Extensions)** > **Apps Script**.
2. Akan terbuka tab baru editor Google Apps Script dengan file default `Code.gs`.
3. Hapus semua teks bawaan di editor tersebut.
4. Buka file **`Code.gs`** yang ada di folder proyek Anda, salin (**Copy**) seluruh isinya, lalu tempel (**Paste**) ke editor Apps Script.
5. Klik ikon **Simpan** (ikon disket) atau tekan `Ctrl + S`.

---

### Langkah 3: Inisialisasi Database Otomatis (Opsional tapi Disarankan)
1. Di bagian atas editor Apps Script, perhatikan dropdown fungsi di sebelah tombol **Jalankan (Run)**.
2. Pilih fungsi: **`setupDatabase`**.
3. Klik tombol **Jalankan (Run)**.
4. Google akan meminta izin otorisasi pertama kali:
   - Klik **Tinjau Izin (Review permissions)**.
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Lanjutan (Advanced)** > klik **Buka Untitled project (tidak aman)**.
   - Klik **Izinkan (Allow)**.
5. Setelah eksekusi selesai, kembali ke tab Google Spreadsheet Anda.
   Semua tab tabel berikut akan otomatis dibuat lengkap dengan header tebal dan data awal:
   * `Master_Barang`
   * `Master_Customer`
   * `List_Order`
   * `Transaksi_Masuk`
   * `Transaksi_Keluar`
   * `Users`

---

### Langkah 4: Deploy Script Sebagai Web App
1. Di editor Apps Script, klik tombol biru **Deploy (Terapkan)** di pojok kanan atas > pilih **Deploy baru (New deployment)**.
2. Klik ikon gerigi (roda gigi) di sebelah *Select type*, lalu pilih **Aplikasi Web (Web app)**.
3. Atur pengaturannya seperti berikut:
   * **Deskripsi**: `SIM-INVENTORY API`
   * **Jalankan sebagai (Execute as)**: **`Saya (Me - email_anda@gmail.com)`**
   * **Yang memiliki akses (Who has access)**: **`Siapa saja (Anyone)`**  *(⚠️ PENTING: Wajib pilih "Anyone" agar browser operator bisa mengakses API tanpa error otorisasi/CORS)*
4. Klik tombol **Deploy (Terapkan)**.
5. Salin teks pada kolom **URL Aplikasi Web (Web App URL)**.
   *(Bentuk URL-nya berakhiran `/exec`, contoh: `https://script.google.com/macros/s/AKfycbx.../exec`)*.

---

### Langkah 5: Sambungkan ke Frontend
1. Buka file **`script.js`** di folder proyek ini.
2. Pada baris ke-138, cari baris berikut:
   ```javascript
   const GAS_WEBAPP_URL = "PASTE_URL_WEB_APP_ANDA_DISINI";
   ```
3. Ganti `"PASTE_URL_WEB_APP_ANDA_DISINI"` dengan URL Web App yang Anda salin tadi.
   Contoh:
   ```javascript
   const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxAbc123.../exec";
   ```
4. Simpan file `script.js`.

---

### Langkah 6: Buka Aplikasi & Selesai!
Buka file **`index.html`** di browser (bisa langsung klik 2x atau via Live Server).

#### Akun Default untuk Masuk Sistem:
* **Username**: `admin`
* **Password**: `admin`
* **Role**: `Admin`

*(Atau gunakan akun darurat SuperAdmin: username `superadmin`, password `admin123`)*

---

### Catatan Tambahan:
* **Jika Mengedit Kode Apps Script di masa mendatang**:
  Setiap kali Anda mengubah kode di `Code.gs` pada editor Apps Script, lakukan deploy versi baru:
  Klik **Deploy** > **Kelola deployment** > Klik ikon pensil (Edit) > Pada dropdown versi pilih **Versi baru (New version)** > Klik **Deploy**.
* **Kecepatan & Quota**:
  Sistem polling otomatis di latar belakang telah disesuaikan menjadi interval 15 detik untuk menghemat kuota eksekusi Google Apps Script sekaligus menjaga performa tetap responsif.
