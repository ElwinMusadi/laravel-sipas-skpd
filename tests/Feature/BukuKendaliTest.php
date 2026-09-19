<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapUsageSegment;
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
function bukuKendaliBap(
    int $numeratorStart,
    BapStatus $status = BapStatus::Completed,
    ?string $serviceDate = null,
    ?Loket $loket = null,
    ?User $receivedBy = null,
    int $onlineUsageCount = 5,
): array {
    $numeratorEnd = $numeratorStart + 12;
    $loket ??= Loket::factory()->create([
        'name' => 'Loket Buku Kendali '.$numeratorStart,
    ]);
    $loketUser = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-BUKU-KENDALI-'.$numeratorStart,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => 13,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => 13,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $loketUser->id,
        'accepted_at' => now()->subDays(2),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => $serviceDate ?? now()->toDateString(),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => 13,
        'online_usage_count' => $onlineUsageCount,
        'status' => $status,
        'created_by' => $loketUser->id,
        'submitted_at' => now()->subHours(2),
        'received_by' => $receivedBy?->id,
        'received_at' => $receivedBy === null ? null : now()->subMinute(),
    ]);
    $segment = BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => 13,
    ]);

    return [
        'bap' => $bap,
        'loket' => $loket,
        'loket_user' => $loketUser,
        'allocation' => $allocation,
        'segment' => $segment,
    ];
}

function bukuKendaliBendahara(): User
{
    return User::factory()->create([
        'name' => 'Bendahara Barang Buku Kendali',
        'role' => UserRole::BendaharaBarang,
    ]);
}

function bukuKendaliCancellation(array $context, int $numerator): BapCancellation
{
    return BapCancellation::create([
        'bap_id' => $context['bap']->id,
        'numerator' => $numerator,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Dokumen fisik rusak.',
        'created_by' => $context['loket_user']->id,
    ]);
}

/**
 * @param  list<string>  $attributes
 * @return array<string, mixed>
 */
function bukuKendaliRawAttributes(Bap|BapUsageSegment|BapCancellation $model, array $attributes): array
{
    $model->refresh();

    return collect($attributes)
        ->mapWithKeys(fn (string $attribute): array => [
            $attribute => $model->getRawOriginal($attribute),
        ])
        ->all();
}

test('Buku Kendali only lists completed BAPs and derives its summary from the completed data set', function () {
    $bendahara = bukuKendaliBendahara();
    $completed = bukuKendaliBap(582_608, receivedBy: $bendahara);
    bukuKendaliCancellation($completed, 582_612);
    $otherCompleted = bukuKendaliBap(582_700, receivedBy: $bendahara, onlineUsageCount: 4);
    $notCompleted = bukuKendaliBap(582_800, BapStatus::VerifiedPhase2);

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('buku-kendali/index')
            ->where('baps.total', 2)
            ->where('summary.total_baps', 2)
            ->where('summary.total_usage', 26)
            ->where('summary.total_online', 9)
            ->where('summary.total_cancellations', 1)
            ->where('baps.data.0.numerator_start', $otherCompleted['bap']->numerator_start)
            ->where('baps.data.1.numerator_start', $completed['bap']->numerator_start)
            ->missing('baps.data.2')
            ->etc(),
        );

    expect($notCompleted['bap']->id)->not->toBe($completed['bap']->id);
});

test('Buku Kendali filters completed BAPs by service-date range and Loket', function () {
    $bendahara = bukuKendaliBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    $matching = bukuKendaliBap(
        583_000,
        serviceDate: now()->subDays(2)->toDateString(),
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    $outsidePeriod = bukuKendaliBap(
        583_100,
        serviceDate: now()->subMonth()->toDateString(),
        receivedBy: $bendahara,
    );
    $otherLoket = bukuKendaliBap(
        583_200,
        serviceDate: now()->subDays(2)->toDateString(),
        receivedBy: $bendahara,
    );

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index', [
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->subDays(2)->toDateString(),
            'loket' => $matchingLoket->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.total', 1)
            ->where('baps.data.0.id', $matching['bap']->id)
            ->where('filters.loket', $matchingLoket->id)
            ->where('summary.total_baps', 1)
            ->etc(),
        );

    expect($outsidePeriod['bap']->id)->not->toBe($matching['bap']->id)
        ->and($otherLoket['bap']->id)->not->toBe($matching['bap']->id);
});

test('Buku Kendali searches completed BAPs by number, Loket, and seven-digit nomerator', function () {
    $bendahara = bukuKendaliBendahara();
    $matchingLoket = Loket::factory()->create(['name' => 'Kantor SAMSAT']);
    $matching = bukuKendaliBap(
        582_608,
        loket: $matchingLoket,
        receivedBy: $bendahara,
    );
    bukuKendaliBap(582_700, receivedBy: $bendahara);

    foreach ([
        '#'.$matching['bap']->id,
        'Kantor SAMSAT',
        '0582608',
    ] as $search) {
        $this->actingAs($bendahara)
            ->get(route('buku-kendali.index', ['search' => $search]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('baps.total', 1)
                ->where('baps.data.0.id', $matching['bap']->id)
                ->where('filters.search', $search)
                ->etc(),
            );
    }
});

test('Buku Kendali paginates completed BAPs on the server', function () {
    $bendahara = bukuKendaliBendahara();
    $first = null;

    foreach (range(0, 15) as $index) {
        $context = bukuKendaliBap(584_000 + ($index * 20), receivedBy: $bendahara);
        $first ??= $context;
    }

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.current_page', 2)
            ->where('baps.total', 16)
            ->where('baps.data.0.id', $first['bap']->id)
            ->missing('baps.data.1')
            ->etc(),
        );
});

test('Buku Kendali does not double count BAP usage when one BAP has multiple segments and cancellations', function () {
    $bendahara = bukuKendaliBendahara();
    $context = bukuKendaliBap(585_000, receivedBy: $bendahara);
    $context['segment']->update([
        'numerator_end' => 585_006,
        'quantity' => 7,
    ]);
    $secondBox = SkpdBox::factory()->create([
        'box_number' => 'BOX-BUKU-KENDALI-585007',
        'numerator_start' => 585_007,
        'numerator_end' => 585_012,
        'total_sets' => 6,
    ]);
    $secondAllocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $secondBox->id,
        'loket_id' => $context['loket']->id,
        'numerator_start' => 585_007,
        'numerator_end' => 585_012,
        'quantity' => 6,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $context['loket_user']->id,
        'accepted_at' => now()->subDays(2),
    ]);
    BapUsageSegment::create([
        'bap_id' => $context['bap']->id,
        'skpd_allocation_id' => $secondAllocation->id,
        'numerator_start' => 585_007,
        'numerator_end' => 585_012,
        'quantity' => 6,
    ]);
    bukuKendaliCancellation($context, 585_004);
    bukuKendaliCancellation($context, 585_010);

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.total_baps', 1)
            ->where('summary.total_usage', 13)
            ->where('summary.total_online', 5)
            ->where('summary.total_cancellations', 2)
            ->where('baps.data.0.cancellation_count', 2)
            ->etc(),
        );
});

test('Buku Kendali remains read-only and links Bendahara Barang to the existing BAP detail', function () {
    $bendahara = bukuKendaliBendahara();
    $context = bukuKendaliBap(586_000, receivedBy: $bendahara);
    $cancellation = bukuKendaliCancellation($context, 586_004);
    $bapSource = bukuKendaliRawAttributes($context['bap'], [
        'loket_id',
        'service_date',
        'numerator_start',
        'numerator_end',
        'total_usage',
        'online_usage_count',
        'status',
        'received_by',
        'received_at',
    ]);
    $segmentSource = bukuKendaliRawAttributes($context['segment'], [
        'skpd_allocation_id',
        'numerator_start',
        'numerator_end',
        'quantity',
    ]);
    $cancellationSource = bukuKendaliRawAttributes($cancellation, [
        'numerator',
        'reason',
        'description',
        'created_by',
    ]);

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('baps.data.0.id', $context['bap']->id)
            ->etc(),
        );
    $this->actingAs($bendahara)
        ->get(route('baps.show', $context['bap']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.id', $context['bap']->id)
            ->etc(),
        );

    expect(bukuKendaliRawAttributes($context['bap']->refresh(), array_keys($bapSource)))->toBe($bapSource)
        ->and(bukuKendaliRawAttributes($context['segment']->refresh(), array_keys($segmentSource)))->toBe($segmentSource)
        ->and(bukuKendaliRawAttributes($cancellation->refresh(), array_keys($cancellationSource)))->toBe($cancellationSource);
    $this->assertDatabaseCount('audit_logs', 0);
});

test('roles other than Bendahara Barang cannot access Buku Kendali through direct HTTP requests', function (
    UserRole $role,
) {
    $context = bukuKendaliBap(587_000);
    $actor = User::factory()->create(['role' => $role]);

    $this->actingAs($actor)
        ->get(route('buku-kendali.index'))
        ->assertForbidden();

    expect($context['bap']->refresh()->status)->toBe(BapStatus::Completed);
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);
