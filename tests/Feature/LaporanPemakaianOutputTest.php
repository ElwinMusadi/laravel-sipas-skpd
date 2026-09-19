<?php

use App\BapCancellationReason;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * @return array{bap: Bap, loket: Loket, loket_user: User, allocation: SkpdAllocation, segment: BapUsageSegment}
 */
function laporanPemakaianOutputBap(
    int $numeratorStart,
    int $totalUsage = 13,
    int $onlineUsageCount = 5,
    BapStatus $status = BapStatus::Completed,
    string $serviceDate = '2026-08-20',
    ?Loket $loket = null,
    ?User $receivedBy = null,
): array {
    $numeratorEnd = $numeratorStart + $totalUsage - 1;
    $loket ??= Loket::factory()->create([
        'name' => 'Loket Output '.$numeratorStart,
    ]);
    $loketUser = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-OUTPUT-'.$numeratorStart,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => $totalUsage,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $totalUsage,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $loketUser->id,
        'accepted_at' => now()->subDays(2),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => $serviceDate,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => $totalUsage,
        'online_usage_count' => $onlineUsageCount,
        'status' => $status,
        'created_by' => $loketUser->id,
        'submitted_at' => now()->subHours(2),
        'received_by' => $receivedBy?->id,
        'received_at' => $receivedBy === null ? null : now()->subMinute(),
        'receipt_notes' => $receivedBy === null ? null : 'Diterima lengkap secara administratif.',
    ]);
    $segment = BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $totalUsage,
    ]);

    return [
        'bap' => $bap,
        'loket' => $loket,
        'loket_user' => $loketUser,
        'allocation' => $allocation,
        'segment' => $segment,
    ];
}

function laporanPemakaianOutputBendahara(): User
{
    return User::factory()->create([
        'name' => 'Bendahara Barang Output Laporan Pemakaian',
        'role' => UserRole::BendaharaBarang,
    ]);
}

function laporanPemakaianOutputCancellation(array $context, int $numerator): BapCancellation
{
    return BapCancellation::create([
        'bap_id' => $context['bap']->id,
        'numerator' => $numerator,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Bukti fisik rusak.',
        'created_by' => $context['loket_user']->id,
    ]);
}

/**
 * @param  list<string>  $attributes
 * @return array<string, mixed>
 */
function laporanPemakaianOutputRawAttributes(Bap|BapUsageSegment|BapCancellation|BapVerification|BapClarificationRequest $model, array $attributes): array
{
    $model->refresh();

    return collect($attributes)
        ->mapWithKeys(fn (string $attribute): array => [
            $attribute => $model->getRawOriginal($attribute),
        ])
        ->all();
}

function laporanPemakaianOutputSpreadsheet(BinaryFileResponse $response): Spreadsheet
{
    return IOFactory::load($response->getFile()->getPathname());
}

test('PDF and Excel exports contain the same completed BAP totals and preserve seven-digit nomerator', function () {
    $bendahara = laporanPemakaianOutputBendahara();
    $loket = Loket::factory()->create(['name' => 'Loket Satu']);
    $first = laporanPemakaianOutputBap(582_608, 10, 3, loket: $loket, receivedBy: $bendahara);
    laporanPemakaianOutputCancellation($first, 582_610);
    laporanPemakaianOutputCancellation($first, 582_611);
    $second = laporanPemakaianOutputBap(582_700, 20, 5, serviceDate: '2026-08-21', loket: $loket, receivedBy: $bendahara);
    laporanPemakaianOutputCancellation($second, 582_705);
    laporanPemakaianOutputBap(582_800, 10, 4, BapStatus::VerifiedPhase2, receivedBy: $bendahara);

    $filters = ['month' => 8, 'year' => 2026];
    $pdfResponse = $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.pdf', $filters));

    $pdfResponse
        ->assertOk()
        ->assertDownload('laporan-pemakaian-skpd-agustus-2026.pdf')
        ->assertHeader('content-type', 'application/pdf');
    expect($pdfResponse->getContent())->toStartWith('%PDF');

    $excelResponse = $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.excel', $filters));

    $excelResponse
        ->assertOk()
        ->assertDownload('laporan-pemakaian-skpd-agustus-2026.xlsx');
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = laporanPemakaianOutputSpreadsheet($excelResponse->baseResponse);
    expect($spreadsheet->getSheetNames())->toBe(['Ringkasan', 'Rekap Loket', 'Detail BAP'])
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B7')->getValue())->toBe(2)
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B8')->getValue())->toBe(30)
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B9')->getValue())->toBe(8)
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B10')->getValue())->toBe(3)
        ->and($spreadsheet->getSheetByName('Rekap Loket')?->getCell('B6')->getValue())->toBe(2)
        ->and($spreadsheet->getSheetByName('Rekap Loket')?->getCell('C6')->getValue())->toBe(30)
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getCell('D3')->getValue())->toBe('0582608')
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getStyle('D3')->getNumberFormat()->getFormatCode())->toBe('@');
    $spreadsheet->disconnectWorksheets();
});

test('PDF and Excel apply the selected month, year, and Loket filters consistently', function () {
    $bendahara = laporanPemakaianOutputBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    laporanPemakaianOutputBap(583_000, serviceDate: '2026-07-31', receivedBy: $bendahara);
    $firstMatch = laporanPemakaianOutputBap(
        583_100,
        serviceDate: '2026-08-01',
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    $lastMatch = laporanPemakaianOutputBap(
        583_200,
        serviceDate: '2026-08-31',
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    laporanPemakaianOutputBap(583_300, serviceDate: '2026-09-01', receivedBy: $bendahara);
    laporanPemakaianOutputBap(583_400, serviceDate: '2026-08-20', receivedBy: $bendahara);

    $filters = [
        'month' => 8,
        'year' => 2026,
        'loket' => $matchingLoket->id,
    ];

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.pdf', $filters))
        ->assertOk()
        ->assertDownload('laporan-pemakaian-skpd-agustus-2026.pdf');

    $excelResponse = $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.excel', $filters));

    $excelResponse->assertOk();
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = laporanPemakaianOutputSpreadsheet($excelResponse->baseResponse);
    expect($spreadsheet->getSheetByName('Ringkasan')?->getCell('B4')->getValue())->toBe('Kantor SAMSAT')
        ->and($spreadsheet->getSheetByName('Ringkasan')?->getCell('B7')->getValue())->toBe(2)
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getCell('A2')->getValue())->toBe('#'.$lastMatch['bap']->id)
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getCell('A3')->getValue())->toBe('#'.$firstMatch['bap']->id)
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getHighestDataRow())->toBe(3);
    $spreadsheet->disconnectWorksheets();
});

test('PDF and Excel return an empty report without changing completed source records', function () {
    $bendahara = laporanPemakaianOutputBendahara();
    $context = laporanPemakaianOutputBap(585_000, receivedBy: $bendahara);
    $cancellation = laporanPemakaianOutputCancellation($context, 585_004);
    $verification = BapVerification::factory()
        ->completed(BapVerificationResult::Passed)
        ->create([
            'bap_id' => $context['bap']->id,
            'stage' => BapVerificationStage::Phase1,
        ]);
    $clarification = BapClarificationRequest::factory()
        ->forVerification($verification)
        ->create([
            'status' => BapClarificationStatus::Resolved,
            'opened_by' => $context['loket_user']->id,
            'opened_at' => now()->subDay(),
        ]);
    $bapSource = laporanPemakaianOutputRawAttributes($context['bap'], [
        'loket_id', 'service_date', 'numerator_start', 'numerator_end',
        'total_usage', 'online_usage_count', 'status', 'received_by',
        'received_at', 'receipt_notes',
    ]);
    $segmentSource = laporanPemakaianOutputRawAttributes($context['segment'], [
        'skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity',
    ]);
    $cancellationSource = laporanPemakaianOutputRawAttributes($cancellation, [
        'numerator', 'reason', 'description', 'created_by',
    ]);
    $verificationSource = laporanPemakaianOutputRawAttributes($verification, [
        'bap_id', 'verifier_id', 'stage', 'attempt', 'status', 'result',
        'notes', 'started_at', 'completed_at',
    ]);
    $clarificationSource = laporanPemakaianOutputRawAttributes($clarification, [
        'bap_id', 'bap_verification_id', 'requested_by', 'opened_by',
        'opened_at', 'status', 'notes',
    ]);
    $filters = ['month' => 9, 'year' => 2026];

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.pdf', $filters))
        ->assertOk()
        ->assertDownload('laporan-pemakaian-skpd-september-2026.pdf');
    $excelResponse = $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.excel', $filters));

    $excelResponse->assertOk();
    expect($excelResponse->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $spreadsheet = laporanPemakaianOutputSpreadsheet($excelResponse->baseResponse);
    expect($spreadsheet->getSheetByName('Ringkasan')?->getCell('B7')->getValue())->toBe(0)
        ->and($spreadsheet->getSheetByName('Detail BAP')?->getHighestDataRow())->toBe(1);
    $spreadsheet->disconnectWorksheets();

    expect(laporanPemakaianOutputRawAttributes($context['bap']->refresh(), array_keys($bapSource)))->toBe($bapSource)
        ->and(laporanPemakaianOutputRawAttributes($context['segment']->refresh(), array_keys($segmentSource)))->toBe($segmentSource)
        ->and(laporanPemakaianOutputRawAttributes($cancellation->refresh(), array_keys($cancellationSource)))->toBe($cancellationSource)
        ->and(laporanPemakaianOutputRawAttributes($verification->refresh(), array_keys($verificationSource)))->toBe($verificationSource)
        ->and(laporanPemakaianOutputRawAttributes($clarification->refresh(), array_keys($clarificationSource)))->toBe($clarificationSource);
});

test('direct PDF and Excel endpoints forbid roles outside the report gate', function (UserRole $role) {
    $bendahara = laporanPemakaianOutputBendahara();
    laporanPemakaianOutputBap(587_000, receivedBy: $bendahara);
    $actor = User::factory()->create(['role' => $role]);
    $filters = ['month' => 8, 'year' => 2026];

    $this->actingAs($actor)
        ->get(route('laporan-pemakaian.pdf', $filters))
        ->assertForbidden();
    $this->actingAs($actor)
        ->get(route('laporan-pemakaian.excel', $filters))
        ->assertForbidden();
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);
