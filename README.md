# Sistem ATS Papua Tengah

Aplikasi web pendataan, pemetaan, intervensi, dan pelaporan **Anak Tidak Sekolah (ATS)** untuk Papua Tengah. Versi ini dibuat sebagai aplikasi React + Supabase yang siap dijalankan lokal, deploy ke Vercel, atau dibuild sebagai file statis untuk shared hosting.

## Yang sudah diperbaiki di versi ini

- Dashboard dipoles lagi agar jarak antar-card lebih presisi dan semua insight tetap rapat tanpa area kosong berlebihan.
- Loading awal diganti menjadi indikator sederhana yang lebih bersih dan tidak ramai.

- Dashboard dibuat lebih rapat: peta, status intervensi, grafik tren, alasan putus sekolah, dan bar wilayah tidak lagi berjauhan.
- Peta tetap memakai Leaflet + OpenStreetMap, marker real dari data ATS, dan kontrol zoom ganda sudah dihapus.
- Detail notifikasi sekarang membuka modal detail, bisa ditandai dibaca atau diselesaikan.
- Jumlah notifikasi di sidebar dan topbar mengikuti data aktif yang belum dibaca.
- Login dibuat lebih bersih, tanpa teks teknis yang tidak perlu.
- Pengaturan didesain ulang agar terlihat seperti halaman operasional, bukan halaman teknis database.
- Modal detail, konfirmasi, logout, hapus, dan form dibuat lebih modern dan smooth.
- Setelah simpan perubahan data ATS, modal otomatis tertutup.
- Laporan mendukung pilihan periode: Mei 2024, Triwulan II, Tahun 2024, Semua Data, dan status kosong bila periode tidak punya data.
- Halaman pengguna, notifikasi, petugas, dan pengaturan dirapikan agar konsisten.
- Build dipecah manual chunk React, Map, dan Supabase agar lebih ringan saat deploy.

## Stack

- React + Vite + TypeScript
- CSS custom responsive
- Leaflet + OpenStreetMap untuk peta interaktif
- SVG chart custom untuk grafik ringan
- Supabase Auth + Database
- Local fallback jika `.env` belum diisi

## Fitur utama

- Login dengan Supabase Auth
- Dashboard ringkasan ATS
- KPI: Total ATS, Data Terverifikasi, Dalam Intervensi, Kembali Sekolah
- Peta sebaran ATS real map dengan marker, zoom in/out, dan detail data
- Filter wilayah dan pencarian global
- Grafik tren ATS, alasan putus sekolah, dan ATS per wilayah
- Pendataan ATS: tambah data, detail, update status, hapus dengan konfirmasi
- Intervensi: kanban status, detail data, dan majukan tahap intervensi
- Petugas lapangan: tambah petugas dan monitoring kunjungan/sinkronisasi
- Laporan: ringkasan, export CSV, dan print PDF dari browser
- Notifikasi: tandai baca dan selesaikan notifikasi
- Pengguna: tambah user aplikasi dan aktif/nonaktif dengan konfirmasi
- Pengaturan sistem dengan tampilan card modern
- Responsive desktop, tablet, dan mobile

## Instalasi lokal

```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Buka:

```txt
http://localhost:5173
```

## Setup Supabase dari kosong

1. Buat project Supabase.
2. Buka **SQL Editor**.
3. Jalankan file:

```txt
supabase/schema.sql
```

4. Setelah sukses, jalankan:

```txt
supabase/seed.sql
```

5. Buka **Authentication > Users**.
6. Buat akun admin secara manual.
7. Salin URL dan anon key dari **Project Settings > API**.
8. Buat file `.env` dari `.env.example`:

```bash
cp .env.example .env
```

9. Isi:

```env
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
```

10. Jalankan ulang:

```bash
npm run dev
```

Jika `.env` sudah benar, login memakai Supabase Auth dan data diambil dari tabel Supabase.

## Reset database lama

Kalau sebelumnya sudah pernah menjalankan versi lama dan seed gagal karena foreign key, jalankan:

```txt
supabase/reset.sql
```

Lalu jalankan ulang:

```txt
supabase/schema.sql
supabase/seed.sql
```

`seed.sql` sudah memakai `TRUNCATE ... CASCADE` agar aman terhadap relasi lama.

## Tabel database

- `ats_records`
- `field_officers`
- `field_tasks`
- `alerts`
- `app_users`

## Deploy ke Vercel

1. Push project ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan Environment Variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Build command:

```bash
npm run build
```

5. Output directory:

```txt
dist
```

## Deploy ke shared hosting

Karena project ini React + Vite, hasil build berupa file statis.

```bash
npm run build
```

Upload isi folder `dist/` ke `public_html` atau folder root hosting.

## Catatan produksi

- Policy RLS pada `schema.sql` masih longgar untuk tahap awal: semua user authenticated boleh CRUD.
- Untuk produksi, batasi akses berdasarkan role dan wilayah.
- Data NIK, foto, dan alamat detail termasuk data sensitif. Pastikan akses role benar sebelum dipakai publik.
- Peta memakai OpenStreetMap tile, jadi perangkat butuh internet untuk menampilkan layer peta.

## Struktur penting

```txt
src/App.tsx                 Komponen utama dan semua halaman
src/styles/global.css       Design system dan responsive layout
src/lib/dataProvider.ts     Supabase provider + local fallback
src/lib/analytics.ts        Perhitungan dashboard/grafik/filter
src/lib/dummyData.ts        Data fallback lokal
supabase/schema.sql         Struktur database
supabase/seed.sql           Data dummy Supabase
supabase/reset.sql          Reset tabel aplikasi ATS
public/assets/              Logo dan asset aplikasi
```


## Catatan Revisi v10

Versi ini fokus pada polishing UI/UX: dashboard lebih compact, modal lebih modern, notifikasi punya detail modal, pengaturan tidak menampilkan istilah teknis database, filter periode laporan sudah bekerja, chart dan peta lebih dekat, serta build sudah dipecah manual chunk agar lebih cepat dimuat.

### Urutan update ke workspace lama

1. Backup folder lama terlebih dahulu.
2. Extract isi ZIP ini.
3. Copy semua file ke workspace lama dan replace file lama.
4. Jalankan:

```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Jika database lama masih tersisa foreign key lama, jalankan `supabase/reset.sql`, lalu `supabase/schema.sql`, lalu `supabase/seed.sql`.


## v11 Compact Dashboard

Versi ini merapikan dashboard menjadi satu mosaic grid agar peta, status intervensi, tugas, notifikasi, mode lapangan, dan grafik tidak menyisakan ruang kosong besar. Semua fitur tetap dipertahankan dan data tetap mengikuti filter/search yang aktif.

Jika menimpa workspace lama, hapus `node_modules` dan `package-lock.json` lama terlebih dahulu bila npm masih mengarah ke registry internal.
