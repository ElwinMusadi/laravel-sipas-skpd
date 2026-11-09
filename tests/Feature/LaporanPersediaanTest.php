<?php

use App\BapStatus;
use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * 02:00 UTC on 10 November 2026 is 10:00 WITA, so November is the running month.
 */
beforeEach(function () {
    $this->withoutVite();
    $this->travelTo('2026-11-10 02:00:00');
});

function laporanPersediaanBox(string $boxNumber, int $numeratorStart, int $totalSets, string $receivedAt): SkpdBox
{
    return SkpdBox::factory()->create([
        'box_number' => $boxNumber,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorStart + $totalSets - 1,
        'total_sets' => $totalSets,
        'received_at' => $receivedAt,
    ]);
}

function laporanPersediaanAllocation(
    SkpdBox $box,
    Loket $loket,
    int $numeratorStart,
    int $quantity,
    SkpdAllocationStatus $status,
    string $createdAt,
    ?string $acceptedAt = null,
): SkpdAllocation {
    return SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'allocation_date' => substr($createdAt, 0, 10),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorStart + $quantity - 1,
        'quantity' => $quantity,
        'status' => $status,
        'accepted_by' => $acceptedAt === null ? null : User::factory()->create([
            'role' => UserRole::PetugasLoket,
            'loket_id' => $loket->id,
        ])->id,
        'accepted_at' => $acceptedAt,
        'created_at' => $createdAt,
    ]);
}

function laporanPersediaanUsage(
    SkpdAllocation $allocation,
    int $numeratorStart,
    int $quantity,
    string $serviceDate,
    BapStatus $status = BapStatus::Completed,
): BapUsageSegment {
    $numeratorEnd = $numeratorStart + $quantity - 1;
    $bap = Bap::factory()->create([
        'loket_id' => $allocation->loket_id,
        'service_date' => $serviceDate,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => $quantity,
        'status' => $status,
    ]);

    return BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $quantity,
    ]);
}

/**
 * Box A (1000 sets, Aug) and Box B (500 sets, Oct) exist by the end of October;
 * Box C (300 sets) only arrives in November.
 *
 * @return array{samsat: Loket, mpp: Loket}
 */
function laporanPersediaanLedger(): array
{
    $samsat = Loket::factory()->create(['name' => 'A Kantor SAMSAT']);
    $mpp = Loket::factory()->create(['name' => 'B MPP']);
    $boxA = laporanPersediaanBox('BOX-A', 100_000, 1_000, '2026-08-01 01:00:00');
    $boxB = laporanPersediaanBox('BOX-B', 200_000, 500, '2026-10-05 01:00:00');
    laporanPersediaanBox('BOX-C', 300_000, 300, '2026-11-05 01:00:00');

    $samsatA = laporanPersediaanAllocation($boxA, $samsat, 100_000, 400, SkpdAllocationStatus::Accepted, '2026-08-02 01:00:00', '2026-08-03 01:00:00');
    $mppA = laporanPersediaanAllocation($boxA, $mpp, 100_400, 300, SkpdAllocationStatus::Completed, '2026-09-09 01:00:00', '2026-09-10 01:00:00');
    laporanPersediaanAllocation($boxA, $samsat, 100_700, 100, SkpdAllocationStatus::Pending, '2026-10-20 01:00:00');
    laporanPersediaanAllocation($boxA, $mpp, 100_800, 100, SkpdAllocationStatus::Returned, '2026-08-04 01:00:00', '2026-08-05 01:00:00');
    $samsatB = laporanPersediaanAllocation($boxB, $samsat, 200_000, 200, SkpdAllocationStatus::Accepted, '2026-10-30 01:00:00', '2026-10-31 16:30:00');
    laporanPersediaanAllocation($boxB, $mpp, 200_200, 50, SkpdAllocationStatus::Cancelled, '2026-10-10 01:00:00');

    laporanPersediaanUsage($samsatA, 100_000, 150, '2026-10-15');
    laporanPersediaanUsage($samsatA, 100_150, 10, '2026-10-16', BapStatus::Draft);
    laporanPersediaanUsage($mppA, 100_400, 300, '2026-09-20', BapStatus::Submitted);
    laporanPersediaanUsage($samsatB, 200_000, 20, '2026-11-03');

    return ['samsat' => $samsat, 'mpp' => $mpp];
}

function laporanPersediaanBendahara(): User
{
    return User::factory()->create(['role' => UserRole::BendaharaBarang]);
}

test('Laporan Persediaan rebuilds the end-of-month stock per Box and per Loket', function () {
    $ledger = laporanPersediaanLedger();

    $this->actingAs(laporanPersediaanBendahara())
        ->get(route('laporan-persediaan.index', ['month' => 10, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan-persediaan/index')
            ->where('position.label', '31 Oktober 2026')
            ->where('position.is_end_of_month', true)
            ->where('summary', [
                'total_boxes' => 2,
                'total_sets' => 1_500,
                'allocated_quantity' => 700,
                'pending_quantity' => 300,
                'used_quantity' => 450,
                'central_remaining' => 500,
                'loket_remaining' => 250,
            ])
            ->where('boxes.total', 2)
            ->where('boxes.data.0.box_number', 'BOX-A')
            ->where('boxes.data.0.allocated_quantity', 700)
            ->where('boxes.data.0.pending_quantity', 100)
            ->where('boxes.data.0.used_quantity', 450)
            ->where('boxes.data.0.central_remaining', 200)
            ->where('boxes.data.0.loket_remaining', 250)
            ->where('boxes.data.1.box_number', 'BOX-B')
            ->where('boxes.data.1.allocated_quantity', 0)
            ->where('boxes.data.1.pending_quantity', 200)
            ->where('boxes.data.1.central_remaining', 300)
            ->where('loket_recaps', [
                [
                    'loket_id' => $ledger['samsat']->id,
                    'loket' => 'A Kantor SAMSAT',
                    'received_quantity' => 400,
                    'pending_quantity' => 300,
                    'used_quantity' => 150,
                    'remaining_quantity' => 250,
                ],
                [
                    'loket_id' => $ledger['mpp']->id,
                    'loket' => 'B MPP',
                    'received_quantity' => 300,
                    'pending_quantity' => 0,
                    'used_quantity' => 300,
                    'remaining_quantity' => 0,
                ],
            ])
            ->etc(),
        );
});

test('Laporan Persediaan uses the current WITA time as the position of the running month', function () {
    laporanPersediaanLedger();

    $this->actingAs(laporanPersediaanBendahara())
        ->get(route('laporan-persediaan.index', ['month' => 11, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('position.label', '10 November 2026, 10:00 WITA')
            ->where('position.is_end_of_month', false)
            ->where('summary.total_boxes', 3)
            ->where('summary.total_sets', 1_800)
            ->where('summary.allocated_quantity', 900)
            ->where('summary.pending_quantity', 100)
            ->where('summary.used_quantity', 470)
            ->where('boxes.data.1.box_number', 'BOX-B')
            ->where('boxes.data.1.allocated_quantity', 200)
            ->where('boxes.data.1.pending_quantity', 0)
            ->where('boxes.data.1.loket_remaining', 180)
            ->etc(),
        );
});

test('Laporan Persediaan limits Boxes and figures to the selected Loket', function () {
    $ledger = laporanPersediaanLedger();

    $this->actingAs(laporanPersediaanBendahara())
        ->get(route('laporan-persediaan.index', [
            'month' => 10,
            'year' => 2026,
            'loket' => $ledger['mpp']->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters', ['month' => 10, 'year' => 2026, 'loket' => $ledger['mpp']->id])
            ->where('boxes.total', 1)
            ->where('boxes.data.0.box_number', 'BOX-A')
            ->where('boxes.data.0.allocated_quantity', 300)
            ->where('boxes.data.0.pending_quantity', 0)
            ->where('boxes.data.0.used_quantity', 300)
            ->where('boxes.data.0.central_remaining', 700)
            ->has('loket_recaps', 1)
            ->where('loket_recaps.0.loket_id', $ledger['mpp']->id)
            ->etc(),
        );
});

test('Laporan Persediaan defaults to the current month in WITA', function () {
    $this->travelTo('2026-11-30 17:00:00');

    $this->actingAs(laporanPersediaanBendahara())
        ->get(route('laporan-persediaan.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.month', 12)
            ->where('filters.year', 2026)
            ->etc(),
        );
});

test('Laporan Persediaan grants Bendahara Barang and Kepala UPTD read-only access', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get(route('laporan-persediaan.index', ['month' => 10, 'year' => 2026]))
        ->assertOk();
})->with([
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);

test('Laporan Persediaan forbids unauthorized roles on the page and both exports', function (UserRole $role) {
    $actor = User::factory()->create(['role' => $role]);
    $filters = ['month' => 10, 'year' => 2026];

    $this->actingAs($actor)->get(route('laporan-persediaan.index', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-persediaan.pdf', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-persediaan.xlsx', $filters))->assertForbidden();
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);

test('Laporan Persediaan PDF and Excel exports share the position and keep seven-digit Nomerator as text', function () {
    $bendahara = laporanPersediaanBendahara();
    laporanPersediaanLedger();
    $filters = ['month' => 10, 'year' => 2026];

    $pdfResponse = $this->actingAs($bendahara)->get(route('laporan-persediaan.pdf', $filters));

    $pdfResponse
        ->assertOk()
        ->assertDownload('laporan-persediaan-skpd-oktober-2026.pdf')
        ->assertHeader('content-type', 'application/pdf');
    expect($pdfResponse->getContent())->toStartWith('%PDF');

    $excelResponse = $this->actingAs($bendahara)->get(route('laporan-persediaan.xlsx', $filters));

    $excelResponse
        ->assertOk()
        ->assertDownload('laporan-persediaan-skpd-oktober-2026.xlsx')
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = IOFactory::load($excelResponse->baseResponse->getFile()->getPathname());
    $ringkasan = $spreadsheet->getSheetByName('Ringkasan');
    $boxes = $spreadsheet->getSheetByName('Per Box');
    expect($spreadsheet->getSheetNames())->toBe(['Ringkasan', 'Per Box', 'Per Loket'])
        ->and($ringkasan?->getCell('B5')->getValue())->toBe('31 Oktober 2026')
        ->and($ringkasan?->getCell('B8')->getValue())->toBe(1_500)
        ->and($ringkasan?->getCell('B12')->getValue())->toBe(500)
        ->and($boxes?->getHighestDataRow())->toBe(3)
        ->and($boxes?->getCell('B2')->getValue())->toBe('0100000')
        ->and($boxes?->getCell('C2')->getValue())->toBe('0100999')
        ->and($boxes?->getStyle('B2')->getNumberFormat()->getFormatCode())->toBe('@')
        ->and($boxes?->getCell('H2')->getValue())->toBe(200)
        ->and($spreadsheet->getSheetByName('Per Loket')?->getCell('E7')->getValue())->toBe(250);
    $spreadsheet->disconnectWorksheets();
});
