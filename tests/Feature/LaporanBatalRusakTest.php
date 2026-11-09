<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

beforeEach(function () {
    $this->withoutVite();
});

/**
 * @return array{bap: Bap, loket: Loket, loket_user: User}
 */
function laporanBatalRusakBap(
    int $numeratorStart,
    BapStatus $status = BapStatus::Completed,
    string $serviceDate = '2026-08-20',
    ?Loket $loket = null,
): array {
    $loket ??= Loket::factory()->create(['name' => 'Loket Batal Rusak '.$numeratorStart]);
    $loketUser = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $bap = Bap::factory()->create([
        'document_number' => 'PB/LOKET/'.$numeratorStart,
        'loket_id' => $loket->id,
        'service_date' => $serviceDate,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorStart + 9,
        'total_usage' => 10,
        'status' => $status,
        'created_by' => $loketUser->id,
    ]);

    return ['bap' => $bap, 'loket' => $loket, 'loket_user' => $loketUser];
}

/**
 * @param  array{bap: Bap, loket: Loket, loket_user: User}  $context
 */
function laporanBatalRusakCancellation(
    array $context,
    int $numerator,
    BapCancellationReason $reason = BapCancellationReason::NetworkError,
    ?string $description = null,
): BapCancellation {
    return BapCancellation::create([
        'bap_id' => $context['bap']->id,
        'numerator' => $numerator,
        'reason' => $reason,
        'description' => $description,
        'created_by' => $context['loket_user']->id,
    ]);
}

function laporanBatalRusakBendahara(): User
{
    return User::factory()->create(['role' => UserRole::BendaharaBarang]);
}

test('Laporan Batal/Rusak only counts completed BAPs and summarizes per reason and Loket', function () {
    $bendahara = laporanBatalRusakBendahara();
    $samsat = laporanBatalRusakBap(582_600, loket: Loket::factory()->create(['name' => 'A Kantor SAMSAT']));
    laporanBatalRusakCancellation($samsat, 582_601, BapCancellationReason::NetworkError);
    laporanBatalRusakCancellation($samsat, 582_602, BapCancellationReason::Custom, 'Kertas sobek saat dicetak.');
    laporanBatalRusakCancellation($samsat, 582_603, BapCancellationReason::Damaged);
    $mpp = laporanBatalRusakBap(582_700, loket: Loket::factory()->create(['name' => 'B MPP']));
    laporanBatalRusakCancellation($mpp, 582_701, BapCancellationReason::Cancelled);
    laporanBatalRusakCancellation(laporanBatalRusakBap(582_800, BapStatus::VerifiedPhase2), 582_801);
    laporanBatalRusakCancellation(laporanBatalRusakBap(582_900, BapStatus::Draft), 582_901);

    $this->actingAs($bendahara)
        ->get(route('laporan-batal-rusak.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan-batal-rusak/index')
            ->where('cancellations.total', 4)
            ->where('summary.total', 4)
            ->where('summary.reasons', [
                ['reason' => 'cancelled', 'label' => 'Batal', 'total' => 1],
                ['reason' => 'damaged', 'label' => 'Rusak', 'total' => 1],
                ['reason' => 'network_error', 'label' => 'Jaringan Error', 'total' => 1],
                ['reason' => 'printer_error', 'label' => 'Printer Error', 'total' => 0],
                ['reason' => 'custom', 'label' => 'Isi Sendiri', 'total' => 1],
            ])
            ->where('loket_recaps.0.loket', 'A Kantor SAMSAT')
            ->where('loket_recaps.0.total', 3)
            ->where('loket_recaps.0.reasons.custom', 1)
            ->where('loket_recaps.1.loket', 'B MPP')
            ->where('loket_recaps.1.total', 1)
            ->where('loket_recaps.1.reasons.cancelled', 1)
            ->has('loket_recaps', 2)
            ->etc(),
        );
});

test('Laporan Batal/Rusak detail rows trace each Nomerator to its BAP document', function () {
    $bendahara = laporanBatalRusakBendahara();
    $context = laporanBatalRusakBap(582_600, loket: Loket::factory()->create(['name' => 'Kantor SAMSAT']));
    laporanBatalRusakCancellation($context, 582_602, BapCancellationReason::Custom, 'Kertas sobek saat dicetak.');

    $this->actingAs($bendahara)
        ->get(route('laporan-batal-rusak.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('cancellations.data.0.bap_id', $context['bap']->id)
            ->where('cancellations.data.0.service_date', '2026-08-20')
            ->where('cancellations.data.0.document_number', 'PB/LOKET/582600')
            ->where('cancellations.data.0.loket', 'Kantor SAMSAT')
            ->where('cancellations.data.0.numerator', 582_602)
            ->where('cancellations.data.0.reason_label', 'Isi Sendiri')
            ->where('cancellations.data.0.description', 'Kertas sobek saat dicetak.')
            ->etc(),
        );
});

test('Laporan Batal/Rusak filters completed BAPs by month, year, and Loket using service date', function () {
    $bendahara = laporanBatalRusakBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    laporanBatalRusakCancellation(laporanBatalRusakBap(583_000, serviceDate: '2026-07-31', loket: $matchingLoket), 583_001);
    $firstMatch = laporanBatalRusakCancellation(laporanBatalRusakBap(583_100, serviceDate: '2026-08-01', loket: $matchingLoket), 583_101);
    $lastMatch = laporanBatalRusakCancellation(laporanBatalRusakBap(583_200, serviceDate: '2026-08-31', loket: $matchingLoket), 583_201);
    laporanBatalRusakCancellation(laporanBatalRusakBap(583_300, serviceDate: '2026-09-01', loket: $matchingLoket), 583_301);
    laporanBatalRusakCancellation(laporanBatalRusakBap(583_400, serviceDate: '2026-08-20'), 583_401);

    $this->actingAs($bendahara)
        ->get(route('laporan-batal-rusak.index', [
            'month' => 8,
            'year' => 2026,
            'loket' => $matchingLoket->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('cancellations.total', 2)
            ->where('cancellations.data.0.id', $lastMatch->id)
            ->where('cancellations.data.1.id', $firstMatch->id)
            ->where('filters', ['month' => 8, 'year' => 2026, 'loket' => $matchingLoket->id])
            ->where('summary.total', 2)
            ->has('loket_recaps', 1)
            ->where('loket_recaps.0.loket_id', $matchingLoket->id)
            ->etc(),
        );
});

test('Laporan Batal/Rusak defaults to the current month in WITA', function () {
    $this->travelTo('2026-11-30 17:00:00');

    $this->actingAs(laporanBatalRusakBendahara())
        ->get(route('laporan-batal-rusak.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.month', 12)
            ->where('filters.year', 2026)
            ->etc(),
        );
});

test('Laporan Batal/Rusak grants Bendahara Barang and Kepala UPTD read-only access', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get(route('laporan-batal-rusak.index', ['month' => 8, 'year' => 2026]))
        ->assertOk();
})->with([
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);

test('Laporan Batal/Rusak forbids unauthorized roles on the page and both exports', function (UserRole $role) {
    $actor = User::factory()->create(['role' => $role]);
    $filters = ['month' => 8, 'year' => 2026];

    $this->actingAs($actor)->get(route('laporan-batal-rusak.index', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-batal-rusak.pdf', $filters))->assertForbidden();
    $this->actingAs($actor)->get(route('laporan-batal-rusak.xlsx', $filters))->assertForbidden();
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);

test('Laporan Batal/Rusak PDF and Excel exports share the completed-BAP totals and keep seven-digit Nomerator as text', function () {
    $bendahara = laporanBatalRusakBendahara();
    $context = laporanBatalRusakBap(582_600, loket: Loket::factory()->create(['name' => 'Kantor SAMSAT']));
    laporanBatalRusakCancellation($context, 582_602, BapCancellationReason::PrinterError);
    laporanBatalRusakCancellation($context, 582_605, BapCancellationReason::Custom, 'Tinta habis.');
    laporanBatalRusakCancellation(laporanBatalRusakBap(582_800, BapStatus::VerifiedPhase2), 582_801);
    $filters = ['month' => 8, 'year' => 2026];

    $pdfResponse = $this->actingAs($bendahara)->get(route('laporan-batal-rusak.pdf', $filters));

    $pdfResponse
        ->assertOk()
        ->assertDownload('laporan-batal-rusak-skpd-agustus-2026.pdf')
        ->assertHeader('content-type', 'application/pdf');
    expect($pdfResponse->getContent())->toStartWith('%PDF');

    $excelResponse = $this->actingAs($bendahara)->get(route('laporan-batal-rusak.xlsx', $filters));

    $excelResponse
        ->assertOk()
        ->assertDownload('laporan-batal-rusak-skpd-agustus-2026.xlsx')
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = IOFactory::load($excelResponse->baseResponse->getFile()->getPathname());
    $detail = $spreadsheet->getSheetByName('Detail');
    expect($spreadsheet->getSheetNames())->toBe(['Ringkasan', 'Rekap Loket', 'Detail'])
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B7')->getValue())->toBe(2)
        ->and($spreadsheet->getSheetByName('Rekap Loket')?->getCell('A7')->getValue())->toBe('Kantor SAMSAT')
        ->and($spreadsheet->getSheetByName('Rekap Loket')?->getCell('G7')->getValue())->toBe(2)
        ->and($detail?->getHighestDataRow())->toBe(3)
        ->and($detail?->getCell('B2')->getValue())->toBe('PB/LOKET/582600')
        ->and($detail?->getCell('D2')->getValue())->toBe('0582602')
        ->and($detail?->getStyle('D2')->getNumberFormat()->getFormatCode())->toBe('@')
        ->and($detail?->getCell('E3')->getValue())->toBe('Isi Sendiri')
        ->and($detail?->getCell('F3')->getValue())->toBe('Tinta habis.');
    $spreadsheet->disconnectWorksheets();
});
