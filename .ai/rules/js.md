---
paths:
  - 'resources/js/**'
---

# Js

## Pola UI halaman wajib memakai komponen bersama
Halaman membungkus konten dengan <div> (bukan <main>), memakai PageHeader untuk h1/back/aksi, DataTable untuk daftar (tabel di layar lebar, kartu di ponsel, kolom aksi sticky; numeric/mono), FilterBar+useIndexFilters untuk filter berlabel, ListFooter untuk paginasi, DetailList/DetailRow untuk detail, StatusBadge/peta status bersama (bapStatusMeta, allocationStatusMeta, boxStatusMeta) dengan token warna info/warning/success/destructive, NomeratorInput untuk 7 digit, DatePicker (id+name) untuk tanggal, ConfirmActionDialog untuk aksi permanen. Breadcrumb detail memakai layout fungsi berisi nomor/nama record. Tombol batal berlabel "Kembali".
