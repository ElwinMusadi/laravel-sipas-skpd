<?php

use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

beforeEach(function () {
    $this->withoutVite();
});

/**
 * @param  array<string, mixed>  $attributes
 */
function laporanDistribusiAllocation(
    Loket $loket,
    int $numeratorStart,
    int $quantity,
    SkpdAllocationStatus $status,
    ?string $allocationDate = '2026-08-10',
    array $attributes = [],
): SkpdAllocation {
    $numeratorEnd = $numeratorStart + $quantity - 1;
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-DISTRIBUSI-'.$numeratorStart,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => $quantity,
    ]);
    $acceptor = $status->isHeldByLoket() || $status === SkpdAllocationStatus::Returned
        ? User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id])
        : null;

    return SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'allocation_date' => $allocationDate,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $quantity,
        'status' => $status,
        'accepted_by' => $acceptor?->id,
        'accepted_at' => $acceptor === null ? null : '2026-08-11 02:00:00',
        ...$attributes,
    ]);
}

function laporanDistribusiBendahara(): User
{
    return User::factory()->create(['role' => UserRole::BendaharaBarang]);
}

test('Laporan Distribusi summarizes allocations per status and Loket without counting cancelled or returned as distributed', function () {
    $bendahara = laporanDistribusiBendahara();
    $samsat = Loket::factory()->create(['name' => 'A Kantor SAMSAT']);
    $mpp = Loket::factory()->create(['name' => 'B MPP']);
    laporanDistribusiAllocation($samsat, 100_000, 100, SkpdAllocationStatus::Pending);
    laporanDistribusiAllocation($samsat, 100_100, 200, SkpdAllocationStatus::Accepted);
    laporanDistribusiAllocation($samsat, 100_300, 300, SkpdAllocationStatus::Completed);
    laporanDistribusiAllocation($samsat, 100_600, 50, SkpdAllocationStatus::Cancelled);
    laporanDistribusiAllocation($mpp, 200_000, 400, SkpdAllocationStatus::Returned);
    laporanDistribusiAllocation($mpp, 200_400, 150, SkpdAllocationStatus::Accepted);
    laporanDistribusiAllocation($samsat, 300_000, 999, SkpdAllocationStatus::Accepted, '2026-07-31');
    laporanDistribusiAllocation($mpp, 300_999, 999, SkpdAllocationStatus::Accepted, '2026-09-01');

    $this->actingAs($bendahara)
        ->get(route('laporan-distribusi.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan-distribusi/index')
            ->where('allocations.total', 6)
            ->where('summary.distributed_allocations', 4)
            ->where('summary.distributed_sets', 750)
            ->where('summary.received_sets', 650)
            ->where('summary.statuses', [
                ['status' => 'pending', 'label' => 'Menunggu handover', 'total_allocations' => 1, 'total_sets' => 100],
                ['status' => 'accepted', 'label' => 'Diterima', 'total_allocations' => 2, 'total_sets' => 350],
                ['status' => 'completed', 'label' => 'Selesai digunakan', 'total_allocations' => 1, 'total_sets' => 300],
                ['status' => 'cancelled', 'label' => 'Dibatalkan', 'total_allocations' => 1, 'total_sets' => 50],
                ['status' => 'returned', 'label' => 'Dikembalikan ke pusat', 'total_allocations' => 1, 'total_sets' => 400],
            ])
            ->where('loket_recaps', [
                [
                    'loket_id' => $samsat->id,
                    'loket' => 'A Kantor SAMSAT',
                    'distributed_allocations' => 3,
                    'distributed_sets' => 600,
                    'pending_sets' => 100,
                    'received_sets' => 500,
                    'cancelled_sets' => 50,
                    'returned_sets' => 0,
                ],
                [
                    'loket_id' => $mpp->id,
                    'loket' => 'B MPP',
                    'distributed_allocations' => 1,
                    'distributed_sets' => 150,
                    'pending_sets' => 0,
                    'received_sets' => 150,
                    'cancelled_sets' => 0,
                    'returned_sets' => 400,
                ],
            ])
            ->etc(),
        );
});

test('Laporan Distribusi detail rows show box, Nomerator range, status, creator, and acceptor', function () {
    $bendahara = laporanDistribusiBendahara();
    $loket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    $creator = User::factory()->create(['name' => 'Bendahara Pencatat', 'role' => UserRole::BendaharaBarang]);
    $acceptor = User::factory()->create(['name' => 'Petugas Penerima', 'role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);
    $allocation = laporanDistribusiAllocation($loket, 82_608, 100, SkpdAllocationStatus::Accepted, attributes: [
        'created_by' => $creator->id,
        'accepted_by' => $acceptor->id,
        'accepted_at' => '2026-08-11 02:00:00',
    ]);

    $this->actingAs($bendahara)
        ->get(route('laporan-distribusi.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('allocations.data.0', [
                'id' => $allocation->id,
                'allocation_date' => '2026-08-10',
                'box_number' => 'BOX-DISTRIBUSI-82608',
                'loket' => 'Kantor SAMSAT',
                'numerator_start' => 82_608,
                'numerator_end' => 82_707,
                'quantity' => 100,
                'status' => 'accepted',
                'status_label' => 'Diterima',
                'created_by' => 'Bendahara Pencatat',
                'accepted_by' => 'Petugas Penerima',
                'accepted_at' => '2026-08-11T02:00:00+00:00',
            ])
            ->etc(),
        );
});

test('Laporan Distribusi falls back to the WITA creation date when an allocation has no allocation date', function () {
    $bendahara = laporanDistribusiBendahara();
    $loket = Loket::factory()->create();
    $august = laporanDistribusiAllocation($loket, 400_000, 10, SkpdAllocationStatus::Pending, null, [
        'created_at' => '2026-07-31 16:30:00',
    ]);
    $september = laporanDistribusiAllocation($loket, 400_010, 10, SkpdAllocationStatus::Pending, null, [
        'created_at' => '2026-08-31 16:30:00',
    ]);

    $this->actingAs($bendahara)
        ->get(route('laporan-distribusi.index', ['month' => 8, 'year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('allocations.total', 1)
            ->where('allocations.data.0.id', $august->id)
            ->where('allocations.data.0.allocation_date', '2026-08-01')
            ->etc(),
        );
    $this->actingAs($bendahara)
        ->get(route('laporan-distribusi.index', ['month' => 9, 'year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('allocations.total', 1)
            ->where('allocations.data.0.id', $september->id)
            ->where('allocations.data.0.allocation_date', '2026-09-01')
            ->etc(),
        );
});

test('Laporan Distribusi filters allocations by month, year, and Loket', function () {
    $bendahara = laporanDistribusiBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    laporanDistribusiAllocation($matchingLoket, 500_000, 10, SkpdAllocationStatus::Pending, '2026-07-31');
    $firstMatch = laporanDistribusiAllocation($matchingLoket, 500_010, 10, SkpdAllocationStatus::Pending, '2026-08-01');
    $lastMatch = laporanDistribusiAllocation($matchingLoket, 500_020, 20, SkpdAllocationStatus::Accepted, '2026-08-31');
    laporanDistribusiAllocation($matchingLoket, 500_040, 10, SkpdAllocationStatus::Pending, '2026-09-01');
    laporanDistribusiAllocation(Loket::factory()->create(), 500_050, 10, SkpdAllocationStatus::Pending, '2026-08-20');

    $this->actingAs($bendahara)
        ->get(route('laporan-distribusi.index', [
            'month' => 8,
            'year' => 2026,
            'loket' => $matchingLoket->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('allocations.total', 2)
            ->where('allocations.data.0.id', $lastMatch->id)
            ->where('allocations.data.1.id', $firstMatch->id)
            ->where('filters', ['month' => 8, 'year' => 2026, 'loket' => $matchingLoket->id])
            ->where('summary.distributed_sets', 30)
            ->has('loket_recaps', 1)
            ->where('loket_recaps.0.loket_id', $matchingLoket->id)
            ->etc(),
        );
});

test('Laporan Distribusi defaults to the current month in WITA', function () {
    $this->travelTo('2026-11-30 17:00:00');

    $this->actingAs(laporanDistribusiBendahara())
        ->get(route('laporan-distribusi.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.month', 12)
            ->where('filters.year', 2026)
            ->etc(),
        );
});

test('Laporan Distribusi grants Bendahara Barang and Kepala UPTD read-only access', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get(route('laporan-distribusi.index', ['month' => 8, 'year' => 2026]))
        ->assertOk();
})->with([
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);

test('Laporan Distribusi forbids unauthorized roles on the page and both exports', function (UserRole $role) {
    $actor = User::factory()->create(['role' => $role]);
    $filters = ['month' => 8, 'year' => 2026];

    $this->actingAs($actor)->get(route('laporan-distribusi.index', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-distribusi.pdf', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-distribusi.xlsx', $filters))->assertForbidden();
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);

test('Laporan Distribusi PDF and Excel exports share the summary and keep seven-digit Nomerator as text', function () {
    $bendahara = laporanDistribusiBendahara();
    $loket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    laporanDistribusiAllocation($loket, 82_608, 100, SkpdAllocationStatus::Accepted);
    laporanDistribusiAllocation($loket, 82_708, 50, SkpdAllocationStatus::Cancelled, '2026-08-09');
    $filters = ['month' => 8, 'year' => 2026];

    $pdfResponse = $this->actingAs($bendahara)->get(route('laporan-distribusi.pdf', $filters));

    $pdfResponse
        ->assertOk()
        ->assertHeader('content-disposition', 'inline; filename=laporan-distribusi-skpd-agustus-2026.pdf')
        ->assertHeader('content-type', 'application/pdf');
    expect($pdfResponse->getContent())->toStartWith('%PDF');

    $excelResponse = $this->actingAs($bendahara)->get(route('laporan-distribusi.xlsx', $filters));

    $excelResponse
        ->assertOk()
        ->assertDownload('laporan-distribusi-skpd-agustus-2026.xlsx')
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = IOFactory::load($excelResponse->baseResponse->getFile()->getPathname());
    $detail = $spreadsheet->getSheetByName('Detail');
    expect($spreadsheet->getSheetNames())->toBe(['Ringkasan', 'Rekap Loket', 'Detail'])
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B7')->getValue())->toBe(1)
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('C7')->getValue())->toBe(100)
        ->and($spreadsheet->getSheetByName('Rekap Loket')?->getCell('F7')->getValue())->toBe(50)
        ->and($detail?->getHighestDataRow())->toBe(3)
        ->and($detail?->getCell('D2')->getValue())->toBe('0082608')
        ->and($detail?->getCell('E2')->getValue())->toBe('0082707')
        ->and($detail?->getStyle('D2')->getNumberFormat()->getFormatCode())->toBe('@')
        ->and($detail?->getCell('G2')->getValue())->toBe('Diterima')
        ->and($detail?->getCell('G3')->getValue())->toBe('Dibatalkan');
    $spreadsheet->disconnectWorksheets();
});
