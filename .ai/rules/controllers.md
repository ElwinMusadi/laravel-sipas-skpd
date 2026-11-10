---
paths:
  - app/Http/Controllers/SkpdBukuKendaliController.php
  - app/Http/Controllers/SkpdLaporanPemakaianController.php
  - 'app/Http/Controllers/**'
---

# Controllers

## Buku Kendali remains a completed-BAP read model
Buku Kendali may read only BAP completed. Keep BAP, usage segment, allocation, cancellation, and verification immutable; do not introduce a duplicate ledger or aggregate by joining segments and cancellations, which would double count BAP totals.

## Read-only report exports
PDF and XLSX must reuse SkpdLaporanPemakaianQuery, remain limited to completed BAPs, and enforce view-laporan-pemakaian at their direct HTTP endpoints. Treat output as Laporan Sistem until an official document format is approved.

## Flag tombol `can` wajib memeriksa status record
Gate::before meloloskan Superadmin dari semua gate, termasuk syarat status di dalam gate. Karena itu setiap flag `can` yang dikirim ke halaman Inertia untuk menampilkan tombol aksi harus memeriksa status record secara eksplisit di controller (misalnya `$allocation->status === SkpdAllocationStatus::Pending && $actor->can(...)`). Pemeriksaan ini selaras dengan validasi status di Action, tanpa mengubah wewenang Superadmin. Test acuan: tests/Feature/SuperadminActionFlagsTest.php.
