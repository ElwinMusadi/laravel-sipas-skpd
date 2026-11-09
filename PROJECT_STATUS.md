# SIPAS-SKPD — STATUS PROYEK

**Pembaruan terakhir:** 10 November 2026
**Fase saat ini:** Phase 19 — Manual Testing Readiness & End-to-End Workflow Hardening
**Status:** PARTIAL — regresi otomatis siap; validasi browser manual belum dapat dinyatakan lulus.

## Audit dan Perbaikan UI/UX Menyeluruh (10 November 2026)

Audit statis seluruh halaman dan audit visual di browser (ponsel 390px dan desktop 1366px) menghasilkan fondasi UI bersama yang kini dipakai semua menu:

- **Komponen bersama** (`resources/js/components/app/`): `PageHeader` (h1, tombol kembali, aksi), `DataTable` (tabel di layar lebar, kartu di ponsel, kolom aksi menempel di kanan), `FilterBar`/`FilterSearch`/`FilterSelect`/`FilterField` + hook `useIndexFilters` (filter berlabel, Reset dengan jumlah filter aktif), `ListFooter` (paginasi berbahasa Indonesia), `DetailList`/`DetailRow`, `StatusBadge` dengan peta status bersama (BAP, alokasi, Box, aktif/tidak aktif), `NomeratorInput`, dan `DatePicker` yang mendukung `id`/`name`/batas tanggal. Token warna baru `--info` dan `--warning` (terang/gelap); dialog panjang kini bisa di-scroll.
- **Perbaikan utama:**
  - dashboard tidak lagi salah menampilkan "Tahap 1 lulus" untuk BAP yang sudah selesai, dan kini punya aksi cepat sesuai peran;
  - semua daftar tampil sebagai kartu di ponsel, dan kolom aksi tidak lagi tersembunyi di desktop;
  - nomor BAP menjadi kolom utama dan bisa dicari;
  - breadcrumb menyebut record yang benar;
  - label status, tombol "Kembali", Pengaturan, dan teks lain berbahasa Indonesia;
  - "Cetak PDF" laporan membuka PDF lengkap, tidak lagi mencetak 15 baris di layar;
  - form BAP membatasi jumlah Batal/Rusak sesuai total dan memberi peringatan lebih awal;
  - form verifikasi menampilkan progres checklist, pilihan hasil berupa radio, dan selisih bertanda;
  - riwayat klarifikasi tampil sebelum form tanggapan;
  - "Buat alokasi" dari Box langsung memilih Box tersebut;
  - menu "Riwayat Batal/Rusak" ditambahkan;
  - header ponsel lebih ringkas.
- **Backend pendukung:**
  - pencarian BAP dan Riwayat Batal/Rusak berdasarkan nomor dokumen;
  - dashboard mengirim status BAP asli;
  - `?box=` pada form alokasi;
  - PDF laporan dibuka inline;
  - label "Menunggu Tinjauan".

Verifikasi: SQLite dan MySQL masing-masing 350 test / 3.288 assertion PASS, PHPStan 0 error, TypeScript dan lint PASS, build PASS. Pemeriksaan otomatis di browser pada 24 halaman: tidak ada geser horizontal di ponsel, satu landmark `main`, setiap halaman memiliki `h1`, dan input berlabel.

## Aturan Lapangan, Pejabat PDF, Laporan Tambahan, dan P2 (10 November 2026)

Keputusan bisnis: Box boleh dibagi ke beberapa Loket; sisa alokasi yang sudah diterima dapat dikembalikan ke pusat; draft BAP dapat dikerjakan semua Petugas Loket pada Loket yang sama; Approval Kasie dan Pengesahan Kepala UPTD **ditunda**.

- **Box ke beberapa Loket.** Aturan "satu Box satu Loket" dihapus dari `CreateSkpdAllocation`/`UpdateSkpdAllocation`; range alokasi tetap tidak boleh tumpang tindih.
- **Draft untuk semua petugas Loket.** Gate `update-bap`/`delete-bap` dan `User::canManageDraftBap` tidak lagi mensyaratkan pembuat draft; audit tetap mencatat pelaku.
- **Kembalikan sisa ke pusat.** `ReturnSkpdAllocationRemainder` (Bendahara Barang, alasan wajib, lock inventaris, audit `skpd_allocation.remainder_returned`) menarik Nomerator setelah pemakaian terakhir (termasuk draft). Alokasi terpakai sebagian dipersempit ke range terpakai dan menjadi `completed`; alokasi yang belum terpakai menjadi status baru `returned` ("Dikembalikan ke pusat", migration CHECK MySQL `add_returned_status_to_skpd_allocations`).
- **Pejabat penandatangan.** Tabel `document_officials` (migration `create_document_officials_table`, berisi empat pejabat awal berlaku 1 Januari 2026) dikelola Superadmin di menu Administrasi → Pejabat Penandatangan. PDF BAP memakai pejabat yang berlaku pada tanggal pelayanan; data pejabat dihapus dari `config/bap-document.php`.
- **Laporan Batal/Rusak, Distribusi, Persediaan.** Masing-masing punya halaman, PDF, dan XLSX dengan filter bulan/tahun/Loket dan otorisasi `view-laporan-pemakaian`. Batal/Rusak hanya dari BAP `completed`; Distribusi berdasarkan tanggal alokasi; Persediaan adalah posisi per akhir bulan (alokasi yang pernah dikembalikan direkonstruksi dengan kuantitas saat ini).
- **P2.** Dashboard Persediaan dan form alokasi memakai agregasi SQL (tidak lagi memuat semua segment); form alokasi hanya menawarkan Loket aktif; `CreateBap` hanya mengunci BAP terakhir Loket; `lockInventory()` dipindah ke trait `App\Concerns\LocksSkpdInventory`; `actor()` dipindah ke base `Controller`; endpoint Batal/Rusak standalone yang sudah tanpa route, request, gate, dan halamannya dihapus.

Verifikasi: SQLite dan MySQL masing-masing 344 test / 3.193 assertion PASS, PHPStan 0 error, TypeScript PASS, build PASS. Uji browser belum dijalankan karena database lokal belum di-migrate.

## Perbaikan UX Operator (10 November 2026)

- "Terima handover" dan "Hapus alokasi pending" kini memakai dialog konfirmasi (`ConfirmActionDialog`) yang menampilkan Box, Loket, range, dan jumlah, serta error dari server.
- Draft BAP yang berisi detail Batal/Rusak dapat dihapus (tetap hanya draft paling akhir Loket dan tanpa riwayat verifikasi/klarifikasi); detail Batal/Rusak ikut terhapus dan tercatat pada audit `bap.deleted`.
- Filter status daftar BAP memakai label badge yang sama dan kini memuat status "Selesai Administratif".
- Tombol "Mulai Verifikasi", "Tandai telah dibuka", dan "Buka" klarifikasi terkunci selama request berjalan sehingga tidak bisa terklik ganda.
- Teks era pengembangan ("Phase 09", "belum diimplementasikan", "read-only", "ledger domain") dan label Inggris ("Usage segment", "Allocation", "Quantity", "Attempt", "Expected/Actual") diganti bahasa operasional.
- Menu sidebar tetap tersorot di halaman detail/create, tanpa salah menyorot Verifikasi Tahap 1 saat berada di Tahap 2. Breadcrumb Verifikasi Tahap 2 mengarah ke antrean Tahap 2.

## Integritas Data P1 + Revisi BAP Ganda per Hari (10 November 2026)

Bagian ini menggantikan aturan lama "satu BAP per Loket per hari" dan "nomor dokumen dari tanggal pembuatan" yang masih disebut pada bagian-bagian historis di bawah.

1. **Dua BAP dalam satu tanggal pelayanan.** Unique `(loket_id, service_date)` dihapus (migration `relax_bap_service_date_uniqueness`). Loket boleh membuat BAP berikutnya pada tanggal yang sama hanya jika BAP sebelumnya berakhir tepat di Nomerator akhir sebuah alokasi, misalnya Box lama habis lalu dilanjutkan dengan Box baru yang Nomeratornya berbeda. Selama alokasi lama masih bersisa, BAP kedua ditolak.
2. **Nomor dokumen dari tanggal pelayanan.** Format `PB/<KODE_LOKET>/<DD>/<MM>/<YYYY>` kini memakai tanggal pelayanan. BAP kedua pada tanggal yang sama mendapat akhiran `-2` (berikutnya `-3`, dst.). `baps.document_number` dibuat unik (migration `add_unique_index_to_bap_document_numbers`); nomor lama yang kebetulan ganda diberi akhiran urutan dengan audit `bap.document_number_deduplicated`. Nomor lama berbasis tanggal pembuatan tidak diubah. Draft tail yang dipindah tanggalnya mendapat nomor baru.
3. **Tanggal di PDF BAP** ("Pada hari ini …") memakai tanggal pelayanan, bukan tanggal BAP dibuat.
4. **Tanggal bisnis WITA.** `App\Support\BusinessDate` (config `app.business_timezone`, default `Asia/Makassar`) dipakai untuk validasi tanggal pelayanan maksimum hari ini, default tanggal form BAP, "BAP Hari Ini" di dashboard, default periode Buku Kendali dan Laporan, serta waktu "Dibuat" pada PDF laporan. `APP_TIMEZONE` tetap UTC agar timestamp lama tidak bergeser.
5. **Hapus draft hanya untuk BAP terakhir Loket** sehingga tidak ada lubang Nomerator permanen.
6. **Label dan angka.** Pemakaian normal = total − Batal/Rusak (SKPD online termasuk pemakaian normal), konsisten di form dan detail. Halaman Administrasi BAP memakai label alasan dari server; filter riwayat Batal/Rusak memuat semua alasan.
7. **Keamanan akun.** Middleware `auth.session` aktif: sesi lain otomatis keluar setelah password direset admin atau diganti sendiri (sesi yang sedang dipakai tetap masuk). Superadmin tidak dapat menonaktifkan atau mengubah peran akunnya sendiri, sehingga selalu ada minimal satu Superadmin aktif. Aturan password minimal 8 karakter tidak diubah.

Verifikasi: SQLite dan MySQL masing-masing 297 test / 2.625 assertion PASS, PHPStan 0 error, TypeScript PASS, build PASS. Uji browser belum dijalankan.

## Hardening P0 — Audit Produksi (9 November 2026)

Empat temuan P0 dari audit aplikasi produksi diperbaiki:

1. **Seeder Superadmin create-only.** `LaravelCloudLoketAndSuperadminSeeder` tidak lagi menimpa password, status aktif, maupun Loket yang sudah ada. Password awal akun baru dibangkitkan acak dan ditampilkan sekali. Password produksi yang pernah di-seed dengan nilai `password` tetap harus diganti manual.
2. **Koreksi BAP lewat klarifikasi.** Review klarifikasi memiliki outcome ketiga `returned_for_correction` (Kembalikan untuk koreksi): tiket ditutup, BAP kembali menjadi draft (`submitted_at` dikosongkan), Loket mengoreksi lalu mengajukan ulang, dan verifikasi selalu dimulai lagi dari Tahap 1 dengan attempt berikutnya. Draft yang sudah diikuti BAP Loket berikutnya mengunci tanggal dan range; hanya jumlah online dan Batal/Rusak yang dapat dikoreksi. Halaman detail dan edit BAP menampilkan catatan koreksi verifier.
3. **Ambil alih verifikasi.** Rekan dengan peran verifier tahap yang sama (atau Superadmin) dapat mengambil alih attempt yang sedang berjalan melalui `POST bap-verifications/{bap}/take-over` dan `bap-verifications-phase-2/{bap}/take-over`; audit `bap_verification.phase_N_taken_over`.
4. **Umpan balik UI.** Toast flash kini tampil (`FlashToaster` memanggil `useFlashToast`). Komponen `FormErrorSummary` menampilkan error aturan bisnis non-field (`bap`, `status`, `allocation`, `clarification`, `checklist`, dll.) pada dialog/halaman BAP, Box, Loket, alokasi, verifikasi, klarifikasi, dan administrasi; baris Batal/Rusak menampilkan error per nomerator/alasan/keterangan.

Perbaikan terkait: relasi `clarificationRequest()` pada `BapClarificationResolution` dan `BapClarificationResponse` kini memakai FK `bap_clarification_request_id` yang benar.

Verifikasi: SQLite 281 test / 2.503 assertion PASS, PHPStan 0 error, TypeScript PASS, build PASS. Suite MySQL dan uji browser belum dijalankan.

## Terminologi — Nomerator

Terminologi bisnis Indonesia dikoreksi secara menyeluruh dari `Nomeratur/nomeratur` menjadi `Nomerator/nomerator` pada UI, navigasi, validasi, toast, audit label, PDF/XLSX, test copy, dan dokumentasi. Helper frontend berubah dari `formatNomeratur` menjadi `formatNomerator` serta `onlyNomeraturDigits` menjadi `onlyNomeratorDigits`.

Identifier teknis berbahasa Inggris tetap dipertahankan untuk kompatibilitas: kolom/database `numerator_start`, `numerator_end`, parameter route, relasi, payload API, dan nama property model tidak diubah. Tidak ada migration atau mutasi data.

## Cetak BAP SKPD — PDF Resmi

Setiap BAP yang dapat dilihat oleh user kini dapat dicetak sebagai dokumen PDF resmi melalui tombol `Cetak BAP SKPD` pada halaman detail BAP. PDF dibuka inline pada tab baru sehingga user dapat langsung mencetak atau mengunduh.

### Implementasi

- Route: `GET /baps/{bap}/pdf` dengan nama `baps.pdf` dan Gate `view-bap`.
- Controller: `SkpdBapController@pdf` menggunakan DomPDF, A4 portrait, response inline (`Content-Disposition: inline`).
- Konfigurasi pejabat: `config/bap-document.php` menyimpan identitas instansi dan empat pejabat sesuai DOCX blueprint. Data pejabat bersifat static/configurable, bukan dari database user.
- Formatter tanggal formal: `app/Support/IndonesianFormalDate.php` menghasilkan hari/tanggal/bulan/tahun dalam kata-kata Bahasa Indonesia yang deterministik.
- Data mapper: `app/Support/BapSkpdDocumentData.php` memetakan BAP dan child cancellation ke view model PDF.
- Template: `resources/views/pdf/bap-skpd.blade.php` mengikuti struktur DOCX blueprint: kop surat, nomor dokumen, tanggal formal, identitas Pihak Pertama/Kedua, rincian pemakaian SKPD, detail Batal/Rusak conditional, penutup, dan blok empat tanda tangan.
- Tanggal dokumen: `baps.created_at` dikonversi ke WITA (`Asia/Makassar`) sebelum diformat.
- Cancellation: section `Nomerator dan Keterangan` hanya ditampilkan bila terdapat child cancellation; jumlah row mengikuti data aplikasi tanpa batas lima.
- Frontend: tombol `Cetak BAP SKPD` menggunakan native anchor `target="_blank"` dengan Wayfinder route `pdf.url(bap.id)`, tersedia pada semua status BAP.

### Authorization

Gate `view-bap` digunakan; tidak ada permission baru. Seluruh role yang dapat melihat BAP dapat mencetaknya, termasuk Petugas Loket (hanya Loket sendiri), Superadmin, Bendahara Barang, Petugas Penetapan/Verifikasi, Kasie Penetapan/Verifikasi, dan Kepala UPTD. Guest diarahkan ke login.

### Testing

- Unit test `IndonesianFormalDateTest`: format tanggal formal dan terbilang angka Bahasa Indonesia.
- Feature test `BapSkpdPdfTest`:
  - response 200, `Content-Type: application/pdf`, `Content-Disposition: inline`;
  - content PDF dimulai `%PDF`;
  - document number, tanggal formal WITA, nomerator tujuh digit;
  - cancellation count 0 menyembunyikan detail;
  - cancellation count > 0 menampilkan nomor dan keterangan;
  - semua delapan role dengan `view-bap` menerima PDF;
  - Petugas Loket cross-Loket ditolak 403;
  - guest diarahkan login;
  - streaming PDF tidak memutasi data BAP.
- Regresi penuh: 220 test, 1.831 assertion — PASS.

### Limitation

- Kesamaan visual "persis" dengan DOCX memerlukan pemeriksaan manual PDF vs tampilan asli DOCX; ekstraksi teks DOCX tidak membawa semua informasi layout Word (font, lebar tabel, spasi vertikal).
- Data pejabat static; bila pejabat berubah, update `config/bap-document.php`.
- Timezone global aplikasi masih UTC; hanya PDF BAP yang memakai `Asia/Makassar`.

## Rebranding — SIPAS-SKPD

Brand aplikasi berubah dari SIPAK menjadi `SIPAS-SKPD` dengan kepanjangan `Sistem Informasi Pengelolaan Administrasi SKPD` dan identitas `UPTD Pendapatan Daerah Wilayah Kota Kupang`.

Scope rebranding mencakup app name fallback, title browser/Inertia, logo/sidebar/header, landing/login/user-management copy, PDF/XLSX dan metadata export, serta heading status proyek. Istilah domain seperti `BAP SKPD`, `Box SKPD`, `SKPD Terpakai`, dan `Bukti SKPD` dipertahankan.

Tidak diubah: database `sipak`/`sipak_testing`, folder/repository `laravel-sipak`, Git remote, route, namespace/model, migration, audit historis, nomor dokumen BAP, blueprint historis, dan runtime capture pada `storage/**`. Perubahan infrastruktur tersebut memerlukan task deployment/repository terpisah.

## Seeder Laravel Cloud — Loket dan Superadmin

Disediakan seeder deployment khusus `LaravelCloudLoketAndSuperadminSeeder` yang **tidak** dipanggil oleh `DatabaseSeeder`, sehingga hanya berjalan saat dipanggil eksplisit pada Laravel Cloud.

Seeder idempotent dan **create-only** (sejak hardening P0, 9 November 2026):

- membuat master Loket yang belum ada berdasarkan `code`: `SAMSAT-KANTOR`, `SAMLING-01`, `SAMSAT-CORNER`, `MPP`, `SAMLING-02`, dan `SAMLING-03`; Loket yang sudah ada (termasuk yang diganti nama atau dinonaktifkan) tidak diubah;
- membuat akun `elwinmusadi16` hanya bila username belum ada, dengan `Elwin Bessiesura, S.Kom`, NIP `199707162025061002`, email `elwinmusadi@gmail.com`, role `superadmin`, dan Loket `MPP`;
- password awal Superadmin dibangkitkan acak (24 karakter) dan ditampilkan sekali pada output command; tidak ada lagi password tetap `password`;
- akun yang sudah ada tidak pernah diubah: password, status aktif, role, dan assignment Loket tetap seperti di produksi;
- me-resolve FK Loket dari kode `MPP`, bukan hard-code ID `4`.

Test SQLite terisolasi memverifikasi enam Loket, akun Superadmin, password acak yang ditampilkan sekali, relasi MPP, serta rerun yang tidak mengubah password, status akun, maupun Loket yang telah diedit.

## Refinement — Unified BAP Pemakaian + BAP Batal/Rusak

BAP Pemakaian dan detail Batal/Rusak kini memakai satu form BAP dan satu parent document identity. `bap_cancellations` tetap dipertahankan sebagai child record dari `baps`; tidak ada tabel historis yang dihapus atau data cancellation lama yang dimutasi.

### Workflow

- Form BAP memiliki `SKPD Batal/Rusak` dengan nilai awal `0`.
- Bila jumlah lebih dari `0`, form menampilkan jumlah row detail yang sama secara dinamis.
- Setiap detail memuat nomerator tujuh digit dan alasan `Jaringan Error`, `Printer Error`, atau `Isi Sendiri`.
- `Isi Sendiri` wajib mengisi `description` existing.
- `total_usage` tetap derived dari range; Online dan Batal/Rusak tidak mengurangi total.
- Review form menunjukkan Total, Online, Batal/Rusak, dan Pemakaian normal (`total - online - batal/rusak`).
- Create dan update draft menyimpan atau menyinkronkan BAP, usage segment, cancellation, dan audit dalam satu transaction inventory lock.
- Update draft mendukung transisi `0→1`, `1→2`, dan `2→1`; row yang hilang dari payload dihapus dengan audit `bap_cancellation.removed`.
- Draft update ditolak bila detail cancellation final berada di luar range BAP. Submitted dan completed tetap immutable.

### Data dan Route

- Migration `2026_09_03_120508_extend_bap_cancellations_reason_for_unified_bap` memperluas MySQL CHECK `reason` secara additive: nilai lama `cancelled`/`damaged` tetap valid, sementara value baru adalah `network_error`, `printer_error`, dan `custom`.
- Route Batal/Rusak standalone kini read-only: hanya index dan detail historis. Route create/store nested maupun top-level dihapus.
- Menu sidebar `BAP Batal/Rusak` dihapus. BAP SKPD adalah workflow write utama.
- Wayfinder diregenerasi setelah perubahan route.

### Downstream

- Verification Tahap 1/2 tetap menghitung checklist Batal/Rusak dari child `bap_cancellations` dan menampilkan reason label dari enum bersama.
- Receipt, Buku Kendali, Laporan, PDF, dan XLSX tetap memakai aggregate child cancellation yang sama sehingga tidak melakukan double count.
- Historical cancellation tetap dapat dibaca dengan label lama (`Batal`/`Rusak`) atau label alasan baru secara konsisten.

### Testing

- SQLite: `php artisan test --compact` PASS — 195 test, 1.750 assertion.
- MySQL: `php artisan test --configuration=phpunit.mysql.xml --compact` PASS — 194 test, 1.737 assertion.
- PHPStan: PASS — 0 error.
- TypeScript: PASS.
- Build + Wayfinder: PASS.
- `git diff --check`: PASS.
- Browser automation/print visual tetap tidak tersedia.

## Refinement — Registrasi Range Box Tidak Bersambung

Bendahara Barang dapat mendaftarkan Box SKPD baru dengan range nomerator yang tidak melanjutkan Box terakhir. Kedatangan Box tidak menjamin urutan nomerator antar-Box, sehingga kontinuitas global antar-Box bukan lagi business rule.

Validasi yang tetap berlaku:

- nomerator menggunakan tujuh digit dan minimum `0000001`;
- akhir range lebih besar dari awal range;
- nomor Box harus unik;
- range setiap Box tidak boleh overlap dengan Box lain;
- total set tetap dihitung dari panjang range;
- registrasi tetap melalui `RegisterSkpdBox`, transaction lock, dan audit domain.

Perubahan tidak memerlukan migration atau mutasi data existing. Regression ditambahkan pada Action domain dan endpoint HTTP untuk membuktikan range non-contiguous diterima, sementara test overlap tetap dipertahankan.

## Fase Saat Ini

Phase 19 menyiapkan data development dan bukti regresi untuk workflow yang telah ada pada Phase 00–18. Tidak ada modul bisnis, role, impersonation, global operational context, atau perubahan database engine baru.

## Status Phase 19

**PARTIAL.** Precondition inventaris untuk BAP MPP dan SAMSAT Kantor sudah tersedia secara sah pada MySQL development. Namun, tidak ada automation browser pada environment ini dan tidak tersedia akun development Kepala UPTD, sehingga uji browser end-to-end seluruh role, mobile, light/dark, dan print belum dapat diklaim PASS.

## Tujuan

- Menyediakan fixture workflow development yang idempoten dan ledger-consistent.
- Memastikan akun development Phase 17 tetap dapat dipakai dengan username dan password yang telah didokumentasikan.
- Memvalidasi kontrak authorization, workflow, laporan, output, dan regresi pada SQLite serta MySQL.
- Mencatat batas browser dan keputusan bisnis yang belum tersedia tanpa menebak aturan baru.

## Database

- Default aplikasi: `mysql`.
- `php artisan migrate:status` menunjukkan 23 migration berstatus `Ran`, termasuk `allocation_date`, nomor dokumen BAP, dan extension reason Unified BAP.
- Schema domain tersedia: `users`, `lokets`, `skpd_boxes`, `skpd_allocations`, `baps`, `bap_usage_segments`, `bap_cancellations`, tabel verifikasi/klarifikasi, dan `audit_logs`.
- Penerimaan administratif tersimpan pada kolom `received_by`, `received_at`, dan `receipt_notes` di `baps`; tidak ada tabel receipt terpisah.
- SQLite tetap dipakai oleh `phpunit.xml`; MySQL suite memakai `phpunit.mysql.xml` dan database `sipak_testing` terpisah.

## Development Seed

`DevelopmentWorkflowSeeder` hanya berjalan pada environment `local` atau `testing` dan memakai Action domain `RegisterSkpdBox`, `CreateSkpdAllocation`, serta `AcceptSkpdAllocation`. Seeder tidak menulis langsung ke ledger.

Fixture MySQL development yang telah diterapkan dan diuji ulang:

| Box                     | Range             | Loket         | Status     | Dibuat oleh | Diterima oleh |
| ----------------------- | ----------------- | ------------- | ---------- | ----------- | ------------- |
| `DEV-MPP-001`           | `0582001–0584000` | MPP           | `accepted` | Yunus       | Elwin         |
| `DEV-SAMSAT-KANTOR-001` | `0584001–0586000` | SAMSAT-KANTOR | `accepted` | Yunus       | Simson        |

Kedua Box berurutan, tidak overlap, masing-masing memiliki tepat satu alokasi ke satu Loket, dan belum memiliki usage segment. Penerimaan MPP memakai kemampuan Superadmin yang sudah ada pada Action (`canOperateAtLoket`) tanpa assignment permanen Elwin ke MPP.

`DevelopmentUserSeeder` kini hanya membuat user/Loket yang belum ada. Rerun tidak mengubah credential, role, assignment, nama, maupun status master data yang sudah ada.

Untuk menyiapkan ulang fixture pada database development yang telah memiliki akun dan Loket, jalankan:

```powershell
php artisan db:seed --class=DevelopmentWorkflowSeeder --no-interaction
```

Jangan menjalankan seed global pada database development yang telah dikurasi sebelum status master Loket direkonsiliasi.

## User Testing

Hash password pada MySQL development telah diverifikasi untuk tujuh akun berikut; semuanya cocok dengan password development `password`.

| Role               | Username         | Status                               |
| ------------------ | ---------------- | ------------------------------------ |
| Superadmin         | `elwinmusadi16`  | Credential verified; browser BLOCKED |
| Bendahara Barang   | `yunus.asamani`  | Credential verified; browser BLOCKED |
| Petugas Loket      | `simson.sae`     | Credential verified; browser BLOCKED |
| Petugas Penetapan  | `lily.toelle`    | Credential verified; browser BLOCKED |
| Petugas Verifikasi | `jevon.wilahuky` | Credential verified; browser BLOCKED |
| Kasie Penetapan    | `nena.maing`     | Credential verified; browser BLOCKED |
| Kasie Verifikasi   | `jonny.alfreth`  | Credential verified; browser BLOCKED |

Login username/password dan penolakan email sebagai credential tercakup oleh feature test. Tidak ada pengujian browser interaktif atau 2FA pada Phase 19.

## Superadmin

PASS pada fixture dan regression HTTP: Elwin tetap `superadmin`, `loket_id = null`, dapat membuat konteks BAP MPP melalui Loket aktif, dan audit fixture mencatat Elwin sebagai penerima alokasi MPP. Validasi browser create BAP MPP masih BLOCKED.

## Bendahara Barang

PASS pada regression HTTP untuk Box, alokasi, receipt, Buku Kendali, Laporan Pemakaian, PDF, dan XLSX. Validasi browser masih BLOCKED.

## Petugas Loket

PASS pada regression HTTP: Simson tetap terikat `SAMSAT-KANTOR`; fixture alokasinya accepted. Test mencakup assignment server-side dan penolakan tampering `loket_id`. Validasi browser read-only Loket masih BLOCKED.

## Petugas Penetapan

PASS pada regression HTTP untuk Tahap 1, discrepancy, klarifikasi, dan re-verification. Validasi browser checklist masih BLOCKED.

## Petugas Verifikasi

PASS pada regression HTTP untuk Tahap 2, eligibility, discrepancy, klarifikasi, dan re-verification. Validasi browser checklist masih BLOCKED.

## Kasie Penetapan

Role dan akses baca BAP tervalidasi oleh matrix authorization. Approval Tahap 1 masih navigation placeholder `planned`; tidak ada route atau modul approval yang diimplementasikan, sehingga bukan defect Phase 19.

## Kasie Verifikasi

Role dan akses baca BAP tervalidasi oleh matrix authorization. Approval Tahap 2 masih navigation placeholder `planned`; tidak ada route atau modul approval yang diimplementasikan, sehingga bukan defect Phase 19.

## Master Loket

Regression HTTP memvalidasi create, detail, filter/search, active/inactive, audit, perlindungan Loket dengan user aktif, dan histori. Loket inactive ditolak untuk mutasi BAP/alokasi baru oleh Action terkunci; histori BAP tetap dapat dibaca sesuai authorization.

## Box SKPD

Registration, range tujuh digit, range antar-Box yang boleh tidak bersambung, perlindungan overlap, metadata, status ledger-derived, dan larangan delete jika ada histori telah dicakup oleh feature test. Urutan tanpa loncatan hanya berlaku pada pemakaian BAP per Loket, bukan pada kedatangan Box pusat.

## Distribusi / Alokasi

Workflow pending → accept, range di dalam Box, satu Box satu Loket, overlap, handover, cancellation pending, dan audit tervalidasi oleh test. Fixture MPP dan SAMSAT Kantor telah berstatus `accepted`; alokasi accepted tetap immutable.

## BAP Pemakaian

Draft, update, submit, Nomerator berurutan, total derived, online tidak melebihi total, range allocation valid, dan satu BAP per Loket/hari tercakup oleh suite. Sumber penentuan Nomerator awal dipakai bersama oleh form create, `CreateBap`, dan `UpdateBap`: alokasi yang sudah diterima diprioritaskan menurut tanggal alokasi, waktu penerimaan, lalu ID; alokasi lama wajib dihabiskan sebelum berpindah. Jika range alokasi berikutnya tidak berurutan secara numerik, BAP pertama dimulai dari `numerator_start` alokasi tersebut, sedangkan BAP selanjutnya meneruskan akhir BAP sebelumnya selama masih berada pada alokasi yang sama. Setiap BAP menyimpan nomor dokumen saat dibuat dengan format `PB/<KODE_LOKET>/<DD>/<MM>/<YYYY>` berdasarkan tanggal pembuatan: `MPP` untuk Mall Pelayanan Publik, `LOKET` untuk SAMSAT Kantor, dan nama Loket tanpa spasi dalam huruf kapital untuk Loket lain. Nomor dokumen dipakai sebagai referensi tampilan BAP, verifikasi, pembatalan, klarifikasi, receipt, Buku Kendali, laporan, dan kelak ekspor/print; primary key numerik tetap internal untuk relasi dan route. Setelah Verifikasi Tahap 1 dimulai (`under_verification`), halaman detail tidak lagi menyediakan aksi ubah draft, ajukan ulang, hapus, atau catat batal/rusak bagi Petugas Loket; direct HTTP untuk seluruh mutasi tersebut tetap ditolak. Range awal siap dipakai untuk uji manual: MPP `0582001`, SAMSAT Kantor `0584001`.

Superadmin memiliki aksi Hard Delete terpisah untuk membersihkan BAP training yang telah `completed`. Aksi hanya tersedia pada BAP tail setiap Loket, mewajibkan konfirmasi nomor dokumen dan alasan, mengunci ledger inventaris, menghapus seluruh child verifikasi/klarifikasi/cancellation/usage secara eksplisit dalam satu transaction, merekonsiliasi status allocation, serta mempertahankan audit lama dan menambah event `bap.hard_deleted`. Box, allocation, Loket, user, generator nomor dokumen, FK, dan workflow BAP normal tidak diubah.

## BAP Batal/Rusak

Regression memvalidasi Batal/Rusak berada dalam range BAP, tidak duplikat, tidak mengurangi total pemakaian, dan tidak dapat dimutasi setelah BAP submitted.

## Verifikasi Tahap 1

Regression memvalidasi transition `submitted → under_verification → needs_clarification` atau `waiting_verification_phase_2`, termasuk lima checklist dan authorization Petugas Penetapan. Input angka checklist dari browser dinormalisasi menjadi integer sebelum dikirim, sehingga nomerator fisik dengan leading zero dapat menyelesaikan verifikasi tanpa gagal validasi tipe. Jika ditemukan selisih, Catatan verifier per temuan menjadi satu-satunya catatan dan tetap wajib; Catatan umum tidak ditampilkan maupun disimpan. Jika verifikasi lulus, Catatan umum tetap opsional dan menerima nilai kosong atau `NULL`.

## Verifikasi Tahap 2

Regression memvalidasi eligibility Tahap 2 dan transition `waiting_verification_phase_2 → under_verification_phase_2 → verified_phase_2`, atau `needs_clarification` bila ada discrepancy. Aturan catatan sama dengan Tahap 1: selisih hanya memakai Catatan verifier per temuan, sedangkan Catatan umum hanya tersedia secara opsional untuk hasil lulus.

## Klarifikasi

Regression memvalidasi ticket yang terikat ke verification attempt, response/resolution round, access Loket/stage, dan sumber BAP yang immutable.

## Re-verifikasi

Regression memvalidasi resolution mengantre attempt baru pada source stage. Attempt lama dan discrepancy tidak ditimpa.

## Receipt

Regression memvalidasi Bendahara Barang melakukan `verified_phase_2 → completed` dengan lock, recheck prerequisite, metadata server-side, dan audit tanpa mutasi BAP/usage/cancellation/verifikasi/klarifikasi.

## Buku Kendali

Regression memvalidasi read model hanya menampilkan `completed`, filter/search/pagination/summary, dan cancellation dihitung melalui query terpisah agar tidak double count.

## Laporan

Regression memvalidasi Laporan Pemakaian hanya dari BAP `completed`, filter bulan/tahun/Loket, summary, rekap Loket, detail, pagination, dan direct HTTP authorization.

## PDF

PASS pada feature test: endpoint berotorisasi menghasilkan PDF dengan content `%PDF`, filter konsisten, dan sumber completed-BAP tetap read-only. Pemeriksaan visual A4 landscape, logo, dan layout cetak masih BLOCKED karena browser/PDF viewer interaktif tidak tersedia.

## XLSX

PASS pada feature test: workbook berisi `Ringkasan`, `Rekap Loket`, dan `Detail BAP`; filter konsisten; nomor `0582608` disimpan sebagai teks (`@`) sehingga leading zero tidak hilang.

## Print

Sumber aplikasi menyediakan tombol `window.print()` dengan filter aktif dan marker print document. Hasil dialog print serta layout fisik belum diperiksa dalam browser, sehingga status **BLOCKED**.

## User Management

Regression HTTP memvalidasi list/filter/search, create, detail, edit, reset password, active/deactivate, NIP 18 digit, username lowercase, assignment Loket, role enum, serta password tidak muncul di audit maupun detail response.

## Authorization Matrix

Matrix berikut berasal dari Gate/route aktual dan feature test `AuthorizationMatrixTest`; `S` = Superadmin via `Gate::before`, `V` = baca, `M` = mutasi sesuai state/model, `—` = ditolak. Visibility sidebar memakai permission yang sama hanya untuk item `available`; placeholder `planned` tidak dirender sebagai menu aktif.

| Modul implemented                                               | Superadmin | Bendahara | Petugas Loket                    | Penetapan   | Verifikasi  | Kasie Penetapan | Kasie Verifikasi | Kepala UPTD |
| --------------------------------------------------------------- | ---------- | --------- | -------------------------------- | ----------- | ----------- | --------------- | ---------------- | ----------- |
| Dashboard                                                       | V          | V         | V                                | V           | V           | V               | V                | V           |
| BAP dan Batal/Rusak                                             | S          | V         | V/M Loket sendiri                | V           | V           | V               | V                | V           |
| Persediaan/Alokasi                                              | S          | V/M       | V Loket sendiri; M accept tujuan | —           | —           | —               | —                | —           |
| Box pusat                                                       | S          | V/M       | —                                | —           | —           | —               | —                | —           |
| Verifikasi Tahap 1                                              | S          | —         | —                                | V/M         | —           | —               | —                | —           |
| Verifikasi Tahap 2                                              | S          | —         | —                                | —           | V/M         | —               | —                | —           |
| Klarifikasi                                                     | S          | —         | V/M Loket sendiri                | V/M Tahap 1 | V/M Tahap 2 | —               | —                | —           |
| Receipt administratif                                           | S          | V/M       | —                                | —           | —           | —               | —                | —           |
| Buku Kendali                                                    | S          | V         | —                                | —           | —           | —               | —                | —           |
| Laporan, PDF, XLSX, print                                       | S          | V         | —                                | —           | —           | —               | —                | V           |
| Pengguna dan Master Loket                                       | S          | —         | —                                | —           | —           | —               | —                | —           |
| Approval Tahap 1/2; laporan Batal/Rusak, Distribusi, Persediaan | planned    | planned   | planned                          | planned     | planned     | planned         | planned          | planned     |

Mutation tetap melalui direct HTTP Gate/FormRequest/Action; permission Inertia tidak dianggap sebagai otorisasi.

## Mobile

**BLOCKED.** Source telah diaudit secara statis: Buku Kendali dan Laporan memiliki mobile cards di bawah breakpoint `lg`, grid responsive, dan tabel desktop terpisah. Tidak ada interaksi viewport desktop/tablet/mobile yang dijalankan pada browser.

## Light/Dark

**BLOCKED.** Source memakai semantic token dan `dark:` state pada komponen utama, tetapi contrast, dialog, dropdown, table, badge, sidebar, dan active menu belum diperiksa pada browser.

## Audit

Fixture menambah audit domain melalui Action: dua `skpd_box.registered`, dua `skpd_allocation.created`, dan dua `skpd_allocation.accepted`. Regression mencakup actor, entity, event, serta kerahasiaan password pada user-management audit.

## Database MySQL

PASS — koneksi default `mysql`, semua migration `Ran`, fixture workflow berhasil diterapkan dan rerun tidak membuat Box/alokasi tambahan.

## Testing

### Manual Browser

BLOCKED — tidak ada tool automation/interaksi browser pada environment agent. Browser log historis tidak dipakai sebagai bukti manual test.

### MySQL

PASS — `php artisan test --configuration=phpunit.mysql.xml --compact`: 194 test, 1.737 assertion lulus.

### SQLite

PASS — `php artisan test --compact`: 220 test, 1.831 assertion lulus.

### TypeScript

PASS — `npm run types:check` lulus saat dijalankan berurutan dengan heap Node 4 GB.

### Build

PASS — `npm run build` lulus; 3.316 modul ditransform dan Wayfinder actions/routes/form variants diregenerasi.

### PHPStan

PASS — `vendor/bin/phpstan analyse`: 0 error.

### Pint

PASS — `vendor/bin/pint --dirty --format agent` dijalankan untuk file PHP Phase 19.

### git diff --check

PASS — tidak ada whitespace error pada diff Phase 19.

### npm run check

PRE-EXISTING — gagal pada 21 file format yang berada di luar diff Unified BAP. File Unified BAP yang disentuh telah diformat secara scoped; tidak menjalankan `vp check --fix` agar tidak memformat massal file di luar scope.

## Findings

### P0

Tidak ada.

### P1

Tidak ada akun development Kepala UPTD, sedangkan role tersebut memiliki akses Laporan Pemakaian dan diminta untuk diuji pada browser. Kredensial/identitas tidak boleh dibuat sendiri.

### P2

Database development saat audit berisi enam Loket aktif (`SAMSAT-KANTOR`, `SAMLING-01`, `SAMSAT-CORNER`, `MPP`, `SAMLING-02`, `SAMLING-03`), berbeda dari handoff Phase 18 yang menyebut empat Loket. Tidak ada data dihapus atau diganti nama karena hubungan bisnis SAMLING dengan kebutuhan Loket development belum diputuskan.

### P3

Tidak ada temuan kosmetik yang dapat diklaim dari browser.

## Fixes Implemented

- Menambahkan `DevelopmentWorkflowSeeder` idempoten untuk prerequisite MPP dan SAMSAT Kantor melalui Action inventaris dan audit resmi.
- Menambahkan fixture MySQL development; rerun diverifikasi tanpa duplikasi.
- Mengubah `DevelopmentUserSeeder` agar tidak menimpa credential, role, assignment, atau data Loket existing.
- Menambahkan regression test untuk fixture dan preservation data existing.
- Menambahkan regression test matrix permission implementasi delapan role.
- Mengunci aksi detail BAP Petugas Loket setelah Verifikasi Tahap 1 dimulai dan menambahkan regression untuk visibilitas aksi serta penolakan mutasi direct HTTP.
- Menormalisasi input numerik checklist verifikasi menjadi integer sebelum request agar nomerator fisik browser tidak gagal pada validasi backend.
- Menambahkan nomor dokumen BAP permanen berformat `PB/<KODE_LOKET>/<DD>/<MM>/<YYYY>`, melakukan backfill BAP existing, dan mengganti referensi `#ID` pada seluruh lifecycle BAP.
- Menyatukan input BAP Pemakaian dan BAP Batal/Rusak dalam satu form draft BAP dengan child cancellation atomic, count/detail invariant, alasan baru, dan audit create/update/remove.
- Mengubah BAP Batal/Rusak standalone menjadi riwayat read-only serta meregenerasi Wayfinder setelah route mutation dihapus.

## Known Issues

- Validasi browser manual, responsif, light/dark, dialog, dropdown, print, dan PDF visual belum tersedia pada environment ini.
- `npm run check` melaporkan 21 isu format pre-existing di luar diff Unified BAP.
- Pint global `--test` masih menandai `app/Providers/AppServiceProvider.php` dan format legacy `routes/web.php`; file PHP Unified BAP telah diformat scoped.
- Browser automation dan browser print/PDF visual belum tersedia untuk membuktikan dynamic cancellation row pada perangkat nyata.

## Technical Debt

- Sediakan browser automation atau sesi browser yang dapat dikendalikan untuk menyelesaikan checklist visual/mobile/print secara nyata.
- Rekonsiliasi master Loket development sebelum menggunakan `DatabaseSeeder` global pada database yang telah dikurasi.
- Hapus controller/page orphan legacy cancellation setelah compatibility bundle lama tidak lagi diperlukan; route write sudah tidak tersedia.

## Open Questions

- Apakah `SAMLING-01`, `SAMLING-02`, dan `SAMLING-03` adalah pengganti atau tambahan bagi Loket yang disebut dalam handoff Phase 18? Tidak ada relabel/delete dilakukan.
- Timezone operasional dan cut-off hari pelayanan masih belum ditetapkan; aplikasi tetap memakai konfigurasi waktu saat ini.

## Keputusan Teknis

- Fixture transaksi development dipisahkan dari production seed dan dibuat melalui Action domain dengan lock, validation, dan audit yang sama seperti workflow resmi.
- Fixture MPP diterima oleh Elwin melalui kemampuan Superadmin yang sudah ada; tidak ada role switch, impersonation, atau assignment Elwin → MPP.
- Seeder workflow dijalankan standalone pada database development yang ada untuk menghindari perubahan master data terkurasi.

## Keputusan Bisnis

- Range nomerator antar-Box SKPD boleh tidak bersambung karena Box yang datang dapat memiliki urutan acak. Uniqueness dan larangan overlap tetap wajib.
- **Business Decision Required:** sediakan identitas, username, dan credential akun development Kepala UPTD bila pengujian browser Laporan oleh role tersebut harus diselesaikan.

## Batasan

Phase 19 tidak menambah approval Kasie, laporan placeholder, global context, role baru, role mutation, impersonation, SQLite switch, mutable stock, attachment, signature, QR, atau business rule baru.

## Manual Testing Instructions

1. Pastikan MySQL local aktif dan buka [halaman login](http://localhost:8000/login).
2. Bila fixture belum ada, jalankan `php artisan db:seed --class=DevelopmentWorkflowSeeder --no-interaction`.
3. Login sebagai `elwinmusadi16` / `password`, buka BAP SKPD, pilih MPP, lalu uji range kecil `0582001–0582013` dengan online tidak lebih dari 13. Pastikan detail menyimpan Elwin sebagai aktor dan MPP sebagai Loket.
4. Login sebagai `simson.sae` / `password`, buka BAP SKPD, dan pastikan Loket SAMSAT Kantor read-only. Uji range `0584001–0584013`; coba tamper `loket_id` ke Loket lain melalui request bila DevTools tersedia dan pastikan ditolak.
5. Tambahkan Batal/Rusak pada BAP draft, submit, lalu lanjutkan dengan `lily.toelle` untuk Tahap 1 dan `jevon.wilahuky` untuk Tahap 2. Jalankan satu skenario lulus dan satu skenario klarifikasi/re-verification.
6. Login sebagai `yunus.asamani` untuk receipt, Buku Kendali, dan Laporan Pemakaian. Uji filter, pagination, PDF, XLSX, serta print dengan data completed.
7. Login sebagai Elwin untuk Master Loket, Box, Alokasi, Pengguna, dan audit; gunakan data test baru yang tidak berbenturan dengan fixture.
8. Ulangi halaman utama pada desktop, tablet, dan mobile; lalu light/dark. Catat screenshot, URL, akun, data, hasil, dan severity setiap defect.
9. Jangan menguji Laporan sebagai Kepala UPTD sampai akun development resminya tersedia.

## Handoff ke Phase 20

Tidak ada Phase 20 yang dimulai otomatis. Untuk menutup Phase 19 sepenuhnya diperlukan browser validation nyata dan keputusan bisnis mengenai akun Kepala UPTD; rekonsiliasi master Loket development direkomendasikan sebelum seed global berikutnya.
