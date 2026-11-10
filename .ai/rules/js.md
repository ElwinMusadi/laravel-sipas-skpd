---
paths:
  - 'resources/js/**'
---

# Js

## Pola UI halaman wajib memakai komponen bersama
Halaman membungkus konten dengan <div> (bukan <main>), memakai PageHeader untuk h1/back/aksi, DataTable untuk daftar (tabel di layar lebar, kartu di ponsel; kolom numeric/mono, `status: true` untuk kolom badge status, `wideOnly: true` untuk kolom sekunder agar tabel muat di 1366px), FilterBar+useIndexFilters untuk filter berlabel, ListFooter untuk paginasi, DetailList/DetailRow untuk detail, StatusBadge/peta status bersama (bapStatusMeta, allocationStatusMeta, boxStatusMeta); tone info = primary oranye, warning = amber, success = hijau, danger = merah, sesuai warna lama yang dikenal pengguna, NomeratorInput untuk 7 digit, DatePicker (id+name) untuk tanggal, ConfirmActionDialog untuk aksi permanen. Breadcrumb detail memakai layout fungsi berisi nomor/nama record. Tombol batal berlabel "Kembali".

## Tata letak harus diuji di lebar konten sempit
Sidebar memakan sekitar 256px, sehingga di layar 1024px lebar konten hanya sekitar 700px dan di 1366px sekitar 1000px. Jangan memakai sticky kolom aksi atau grid yang memaksa judul berdampingan dengan banyak tombol. CardHeader adalah grid, jadi tombol di header kartu harus memakai CardAction, bukan `flex-row`. Elemen di dalam grid yang berisi tabel lebar perlu `min-w-0` agar tidak melebarkan kartu. Periksa di browser pada 1024px, 1366px, dan 375px sebelum rilis.
