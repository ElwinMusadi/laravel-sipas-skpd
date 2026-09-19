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
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @return array{bap: Bap, loket: Loket, loket_user: User, allocation: SkpdAllocation, segment: BapUsageSegment}
 */
function laporanPemakaianBap(
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
        'name' => 'Loket Laporan '.$numeratorStart,
    ]);
    $loketUser = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-LAPORAN-'.$numeratorStart,
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

function laporanPemakaianBendahara(): User
{
    return User::factory()->create([
        'name' => 'Bendahara Barang Laporan Pemakaian',
        'role' => UserRole::BendaharaBarang,
    ]);
}

function laporanPemakaianCancellation(array $context, int $numerator): BapCancellation
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
function laporanPemakaianRawAttributes(Bap|BapUsageSegment|BapCancellation|BapVerification|BapClarificationRequest $model, array $attributes): array
{
    $model->refresh();

    return collect($attributes)
        ->mapWithKeys(fn (string $attribute): array => [
            $attribute => $model->getRawOriginal($attribute),
        ])
        ->all();
}

test('Laporan Pemakaian only includes completed BAPs and prevents aggregate double counting', function () {
    $bendahara = laporanPemakaianBendahara();
    $first = laporanPemakaianBap(582_608, 10, 3, receivedBy: $bendahara);
    $first['segment']->update([
        'numerator_end' => 582_612,
        'quantity' => 5,
    ]);
    $secondBox = SkpdBox::factory()->create([
        'box_number' => 'BOX-LAPORAN-582613',
        'numerator_start' => 582_613,
        'numerator_end' => 582_617,
        'total_sets' => 5,
    ]);
    $secondAllocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $secondBox->id,
        'loket_id' => $first['loket']->id,
        'numerator_start' => 582_613,
        'numerator_end' => 582_617,
        'quantity' => 5,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $first['loket_user']->id,
        'accepted_at' => now()->subDays(2),
    ]);
    BapUsageSegment::create([
        'bap_id' => $first['bap']->id,
        'skpd_allocation_id' => $secondAllocation->id,
        'numerator_start' => 582_613,
        'numerator_end' => 582_617,
        'quantity' => 5,
    ]);
    laporanPemakaianCancellation($first, 582_610);
    laporanPemakaianCancellation($first, 582_615);

    $second = laporanPemakaianBap(582_700, 20, 5, receivedBy: $bendahara);
    laporanPemakaianCancellation($second, 582_705);
    laporanPemakaianBap(582_800, 10, 4, BapStatus::VerifiedPhase2, receivedBy: $bendahara);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan-pemakaian/index')
            ->where('baps.total', 2)
            ->where('summary.total_baps', 2)
            ->where('summary.total_usage', 30)
            ->where('summary.total_online', 8)
            ->where('summary.total_cancellations', 3)
            ->where('loket_recaps.0.total_usage', 10)
            ->where('loket_recaps.0.total_cancellations', 2)
            ->etc(),
        );
});

test('Laporan Pemakaian filters completed BAPs by month, year, and Loket using service date', function () {
    $bendahara = laporanPemakaianBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    laporanPemakaianBap(583_000, serviceDate: '2026-07-31', receivedBy: $bendahara);
    $firstMatch = laporanPemakaianBap(
        583_100,
        serviceDate: '2026-08-01',
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    $lastMatch = laporanPemakaianBap(
        583_200,
        serviceDate: '2026-08-31',
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    laporanPemakaianBap(583_300, serviceDate: '2026-09-01', receivedBy: $bendahara);
    laporanPemakaianBap(583_400, serviceDate: '2026-08-20', receivedBy: $bendahara);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', [
            'month' => 8,
            'year' => 2026,
            'loket' => $matchingLoket->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.total', 2)
            ->where('baps.data.0.id', $lastMatch['bap']->id)
            ->where('baps.data.1.id', $firstMatch['bap']->id)
            ->where('filters.month', 8)
            ->where('filters.year', 2026)
            ->where('filters.loket', $matchingLoket->id)
            ->where('loket_recaps.0.loket_id', $matchingLoket->id)
            ->where('summary.total_baps', 2)
            ->etc(),
        );
});

test('Laporan Pemakaian returns a zero summary for an empty period', function () {
    $bendahara = laporanPemakaianBendahara();
    laporanPemakaianBap(584_000, serviceDate: '2026-08-20', receivedBy: $bendahara);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', ['month' => 9, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.total', 0)
            ->where('summary.total_baps', 0)
            ->where('summary.total_usage', 0)
            ->where('summary.total_online', 0)
            ->where('summary.total_cancellations', 0)
            ->where('loket_recaps', [])
            ->etc(),
        );
});

test('Laporan Pemakaian exposes BAP traceability with seven-digit nomerator and stays consistent with Buku Kendali', function () {
    $bendahara = laporanPemakaianBendahara();
    $first = laporanPemakaianBap(582_608, 10, 3, receivedBy: $bendahara);
    laporanPemakaianCancellation($first, 582_610);
    laporanPemakaianBap(582_700, 20, 5, receivedBy: $bendahara);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.data.1.id', $first['bap']->id)
            ->where('baps.data.1.numerator_start', 582_608)
            ->where('baps.data.1.numerator_end', 582_617)
            ->where('summary.total_baps', 2)
            ->where('summary.total_usage', 30)
            ->where('summary.total_online', 8)
            ->where('summary.total_cancellations', 1)
            ->etc(),
        );
    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index', [
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-31',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.total_baps', 2)
            ->where('summary.total_usage', 30)
            ->where('summary.total_online', 8)
            ->where('summary.total_cancellations', 1)
            ->etc(),
        );
    $this->actingAs($bendahara)
        ->get(route('baps.show', $first['bap']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.id', $first['bap']->id)
            ->where('bap.numerator_start', 582_608)
            ->where('bap.numerator_end', 582_617)
            ->etc(),
        );
});

test('Laporan Pemakaian leaves its completed source records unchanged', function () {
    $bendahara = laporanPemakaianBendahara();
    $context = laporanPemakaianBap(585_000, receivedBy: $bendahara);
    $cancellation = laporanPemakaianCancellation($context, 585_004);
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
    $bapSource = laporanPemakaianRawAttributes($context['bap'], [
        'loket_id', 'service_date', 'numerator_start', 'numerator_end',
        'total_usage', 'online_usage_count', 'status', 'received_by',
        'received_at', 'receipt_notes',
    ]);
    $segmentSource = laporanPemakaianRawAttributes($context['segment'], [
        'skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity',
    ]);
    $cancellationSource = laporanPemakaianRawAttributes($cancellation, [
        'numerator', 'reason', 'description', 'created_by',
    ]);
    $verificationSource = laporanPemakaianRawAttributes($verification, [
        'bap_id', 'verifier_id', 'stage', 'attempt', 'status', 'result',
        'notes', 'started_at', 'completed_at',
    ]);
    $clarificationSource = laporanPemakaianRawAttributes($clarification, [
        'bap_id', 'bap_verification_id', 'requested_by', 'opened_by',
        'opened_at', 'status', 'notes',
    ]);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertOk();

    expect(laporanPemakaianRawAttributes($context['bap']->refresh(), array_keys($bapSource)))->toBe($bapSource)
        ->and(laporanPemakaianRawAttributes($context['segment']->refresh(), array_keys($segmentSource)))->toBe($segmentSource)
        ->and(laporanPemakaianRawAttributes($cancellation->refresh(), array_keys($cancellationSource)))->toBe($cancellationSource)
        ->and(laporanPemakaianRawAttributes($verification->refresh(), array_keys($verificationSource)))->toBe($verificationSource)
        ->and(laporanPemakaianRawAttributes($clarification->refresh(), array_keys($clarificationSource)))->toBe($clarificationSource);
});

test('Laporan Pemakaian grants Bendahara Barang and Kepala UPTD read-only access', function () {
    $bendahara = laporanPemakaianBendahara();
    laporanPemakaianBap(586_000, receivedBy: $bendahara);
    $kepalaUptd = User::factory()->create(['role' => UserRole::KepalaUptd]);

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertOk();
    $this->actingAs($kepalaUptd)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertOk();
});

test('Laporan Pemakaian forbids unauthorized roles through direct HTTP requests', function (UserRole $role) {
    $bendahara = laporanPemakaianBendahara();
    laporanPemakaianBap(587_000, receivedBy: $bendahara);
    $actor = User::factory()->create(['role' => $role]);

    $this->actingAs($actor)
        ->get(route('laporan-pemakaian.index', ['month' => 8, 'year' => 2026]))
        ->assertForbidden();
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);
