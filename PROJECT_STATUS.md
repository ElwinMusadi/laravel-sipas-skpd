# SIPAS-SKPD — STATUS PROYEK

**Pembaruan terakhir:** 3 September 2026
**Fase saat ini:** Phase 19 — Manual Testing Readiness & End-to-End Workflow Hardening
**Status:** PARTIAL — regresi otomatis siap; validasi browser manual belum dapat dinyatakan lulus.

## Rebranding — SIPAS-SKPD

Brand aplikasi berubah dari SIPAK menjadi `SIPAS-SKPD` dengan kepanjangan `Sistem Informasi Pengelolaan Administrasi SKPD` dan identitas `UPTD Pendapatan Daerah Wilayah Kota Kupang`.

Scope rebranding mencakup app name fallback, title browser/Inertia, logo/sidebar/header, landing/login/user-management copy, PDF/XLSX dan metadata export, serta heading status proyek. Istilah domain seperti `BAP SKPD`, `Box SKPD`, `SKPD Terpakai`, dan `Bukti SKPD` dipertahankan.

Tidak diubah: database `sipak`/`sipak_testing`, folder/repository `laravel-sipak`, Git remote, route, namespace/model, migration, audit historis, nomor dokumen BAP, blueprint historis, dan runtime capture pada `storage/**`. Perubahan infrastruktur tersebut memerlukan task deployment/repository terpisah.

## Seeder Laravel Cloud — Loket dan Superadmin

Disediakan seeder deployment khusus `LaravelCloudLoketAndSuperadminSeeder` yang **tidak** dipanggil oleh `DatabaseSeeder`, sehingga hanya berjalan saat dipanggil eksplisit pada Laravel Cloud.

Seeder idempotent:

- menyinkronkan enam master Loket berdasarkan `code`: `SAMSAT-KANTOR`, `SAMLING-01`, `SAMSAT-CORNER`, `MPP`, `SAMLING-02`, dan `SAMLING-03`;
- menyinkronkan akun `elwinmusadi16` berdasarkan username;
- menetapkan `Elwin Bessiesura, S.Kom`, NIP `199707162025061002`, email `elwinmusadi@gmail.com`, role `superadmin`, password deployment `password`, dan Loket `MPP`;
- me-resolve FK Loket dari kode `MPP`, bukan hard-code ID `4`; pada database baru dengan urutan data seed ini, `MPP` bernilai ID `4` sesuai kebutuhan.

Seeder tidak dijalankan selama development task ini. Test SQLite terisolasi memverifikasi enam Loket, akun Superadmin, password hash, relasi MPP, dan idempotensi dua kali pemanggilan.

## Refinement — Unified BAP Pemakaian + BAP Batal/Rusak

BAP Pemakaian dan detail Batal/Rusak kini memakai satu form BAP dan satu parent document identity. `bap_cancellations` tetap dipertahankan sebagai child record dari `baps`; tidak ada tabel historis yang dihapus atau data cancellation lama yang dimutasi.

### Workflow

- Form BAP memiliki `SKPD Batal/Rusak` dengan nilai awal `0`.
- Bila jumlah lebih dari `0`, form menampilkan jumlah row detail yang sama secara dinamis.
- Setiap detail memuat nomeratur tujuh digit dan alasan `Jaringan Error`, `Printer Error`, atau `Isi Sendiri`.
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

Bendahara Barang dapat mendaftarkan Box SKPD baru dengan range nomeratur yang tidak melanjutkan Box terakhir. Kedatangan Box tidak menjamin urutan nomeratur antar-Box, sehingga kontinuitas global antar-Box bukan lagi business rule.

Validasi yang tetap berlaku:

- nomeratur menggunakan tujuh digit dan minimum `0000001`;
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

Draft, update, submit, numerator berurutan, total derived, online tidak melebihi total, range allocation valid, dan satu BAP per Loket/hari tercakup oleh suite. Setiap BAP menyimpan nomor dokumen saat dibuat dengan format `PB/<KODE_LOKET>/<DD>/<MM>/<YYYY>` berdasarkan tanggal pembuatan: `MPP` untuk Mall Pelayanan Publik, `LOKET` untuk SAMSAT Kantor, dan nama Loket tanpa spasi dalam huruf kapital untuk Loket lain. Nomor dokumen dipakai sebagai referensi tampilan BAP, verifikasi, pembatalan, klarifikasi, receipt, Buku Kendali, laporan, dan kelak ekspor/print; primary key numerik tetap internal untuk relasi dan route. Setelah Verifikasi Tahap 1 dimulai (`under_verification`), halaman detail tidak lagi menyediakan aksi ubah draft, ajukan ulang, hapus, atau catat batal/rusak bagi Petugas Loket; direct HTTP untuk seluruh mutasi tersebut tetap ditolak. Range awal siap dipakai untuk uji manual: MPP `0582001`, SAMSAT Kantor `0584001`.

## BAP Batal/Rusak

Regression memvalidasi Batal/Rusak berada dalam range BAP, tidak duplikat, tidak mengurangi total pemakaian, dan tidak dapat dimutasi setelah BAP submitted.

## Verifikasi Tahap 1

Regression memvalidasi transition `submitted → under_verification → needs_clarification` atau `waiting_verification_phase_2`, termasuk lima checklist dan authorization Petugas Penetapan. Input angka checklist dari browser dinormalisasi menjadi integer sebelum dikirim, sehingga nomeratur fisik dengan leading zero dapat menyelesaikan verifikasi tanpa gagal validasi tipe.

## Verifikasi Tahap 2

Regression memvalidasi eligibility Tahap 2 dan transition `waiting_verification_phase_2 → under_verification_phase_2 → verified_phase_2`, atau `needs_clarification` bila ada discrepancy.

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

PASS — `php artisan test --compact`: 195 test, 1.750 assertion lulus.

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
- Menormalisasi input numerik checklist verifikasi menjadi integer sebelum request agar nomeratur fisik browser tidak gagal pada validasi backend.
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

- Range nomeratur antar-Box SKPD boleh tidak bersambung karena Box yang datang dapat memiliki urutan acak. Uniqueness dan larangan overlap tetap wajib.
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
