---
paths:
  - '{app,resources,tests}/**'
---

# Appresourcestests

## Use Nomerator in Indonesian copy
The approved Indonesian business term is `Nomerator`, not `Nomeratur`. Use `Nomerator/nomerator` in UI, validation messages, PDF/XLSX headings, tests, and documentation. Preserve technical identifiers such as `numerator_start`, database columns, relation names, and route parameters.

## Tanggal bisnis memakai WITA
APP timezone tetap UTC (timestamp tersimpan). Untuk keputusan bisnis seperti "hari ini", default tanggal pelayanan, BAP hari ini di dashboard, dan periode default laporan, pakai App\Support\BusinessDate (config app.business_timezone = Asia/Makassar), bukan now(). Test yang bergantung pada tanggal harus memakai travelTo.
