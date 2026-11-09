---
paths:
  - app/Support/BapSkpdDocumentData.php
---

# Support

## Pejabat PDF BAP dari riwayat bertanggal
Penandatangan PDF BAP tidak lagi di config/bap-document.php. Ambil dari tabel document_officials lewat DocumentOfficial::effectiveOn(service_date): per peran (first_party, second_party, head, third_party) entri dengan effective_from terbaru yang <= tanggal pelayanan. Pergantian pejabat = tambah entri baru (Superadmin, menu Pejabat Penandatangan); edit hanya untuk koreksi salah tulis dan selalu diaudit.
