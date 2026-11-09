---
paths:
  - 'app/Actions/SkpdInventory/**'
---

# Skpd Inventory

## Range-ledger integrity and transaction lock
Registering boxes, creating or accepting allocations, creating BAP, recording cancellations, and submitting BAP must occur in a database transaction after locking skpd_inventory_locks id=1. Range overlaps and per-Loket sequential usage are application rules guarded by this lock; do not replace them with a mutable stock column.

## Pending allocation cancellation
Only the creator may cancel a pending allocation. Accepted allocations remain immutable in this phase; a future withdrawal workflow requires its own authorization, audit, and state-transition design.

## Draft BAP sequence preservation
BAP draft updates must acquire the shared inventory lock and preserve per-Loket numerator continuity. Once a later BAP exists, reject range changes to the earlier draft; usage segments remain the ledger source of truth and total usage stays derived.

## Loket aktif adalah precondition terkunci
Setiap mutasi allocation atau BAP baru harus berada dalam DB::transaction(..., attempts: 3), mengunci skpd_inventory_locks id 1 lalu row Loket, dan menolak Loket inactive. Jangan gunakan visibilitas UI atau validasi awal sebagai satu-satunya penjagaan lifecycle Loket.

## Koreksi draft BAP non-tail
UpdateBap pada draft yang sudah diikuti BAP Loket berikutnya menolak perubahan tanggal/range, tetapi menerima koreksi online_usage_count dan detail Batal/Rusak tanpa membangun ulang usage segment. Draft tail tetap boleh mengubah range.
