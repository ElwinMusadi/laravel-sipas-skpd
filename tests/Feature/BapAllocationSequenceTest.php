<?php

use App\Actions\SkpdInventory\BapAllocationSequence;
use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\UpdateBap;
use App\BapStatus;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function seqPetugas(Loket $loket, ?string $name = null): User
{
    return User::factory()->create([
        'name' => $name ?? 'Petugas Loket SAMLING',
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
}

function seqAllocation(
    User $petugas,
    Loket $loket,
    int $numeratorStart,
    int $numeratorEnd,
    ?string $allocationDate = null,
    ?CarbonInterface $acceptedAt = null,
    SkpdAllocationStatus $status = SkpdAllocationStatus::Accepted,
    bool $withAcceptedBy = true,
): SkpdAllocation {
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-SEQ-'.fake()->unique()->bothify('####??'),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => $numeratorEnd - $numeratorStart + 1,
    ]);

    return SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $numeratorEnd - $numeratorStart + 1,
        'status' => $status,
        'allocation_date' => $allocationDate ? CarbonImmutable::parse($allocationDate) : today(),
        'accepted_by' => $withAcceptedBy ? $petugas->id : null,
        'accepted_at' => $status === SkpdAllocationStatus::Accepted ? ($acceptedAt ?? now()) : null,
    ]);
}

/**
 * @return array{service_date: string, numerator_start: string, numerator_end: string, online_usage_count: int, cancellation_count: int}
 */
function seqPayload(
    int $numeratorStart,
    int $numeratorEnd,
    int $onlineUsageCount = 0,
    ?string $serviceDate = null,
    int $cancellationCount = 0,
): array {
    return [
        'service_date' => $serviceDate ?? now()->toDateString(),
        'numerator_start' => str_pad((string) $numeratorStart, 7, '0', STR_PAD_LEFT),
        'numerator_end' => str_pad((string) $numeratorEnd, 7, '0', STR_PAD_LEFT),
        'online_usage_count' => $onlineUsageCount,
        'cancellation_count' => $cancellationCount,
    ];
}

test('1 SAMLING old allocation 0042001-0044000 fully consumed by previous BAP transitions expected numerator to new accepted allocation 0134001-0136000 and segments new allocation', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create([
        'code' => 'SAMLING-01',
        'name' => 'SAMLING 01',
    ]);
    $petugas = seqPetugas($loket);

    $oldAllocation = seqAllocation(
        $petugas,
        $loket,
        42_001,
        44_000,
        allocationDate: '2026-09-01',
        acceptedAt: CarbonImmutable::parse('2026-09-01 08:00:00'),
    );

    // Consume old allocation fully on service date 2026-09-01
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(
            numeratorStart: 42_001,
            numeratorEnd: 44_000,
            onlineUsageCount: 1_000,
            serviceDate: '2026-09-01',
        ))
        ->assertRedirect();

    expect($oldAllocation->fresh()->status)->toBe(SkpdAllocationStatus::Completed)
        ->and($oldAllocation->fresh()->remainingQuantity())->toBe(0);

    $newAllocation = seqAllocation(
        $petugas,
        $loket,
        134_001,
        136_000,
        allocationDate: '2026-09-02',
        acceptedAt: CarbonImmutable::parse('2026-09-02 08:00:00'),
    );

    // GET create on next day suggests expected_numerator_start = 134001
    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 134_001)
            ->where('allocations', fn ($allocations) => collect($allocations)->firstWhere('id', $newAllocation->id)['remaining_quantity'] === 2_000
                && collect($allocations)->firstWhere('id', $oldAllocation->id)['remaining_quantity'] === 0)
            ->etc()
        );

    // POST starting at 134001 succeeds and segments the new allocation
    $response = $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(
            numeratorStart: 134_001,
            numeratorEnd: 134_500,
            onlineUsageCount: 200,
            serviceDate: '2026-09-02',
        ));
    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $newBap = Bap::query()->where('numerator_start', 134_001)->sole();
    expect($newBap->numerator_start)->toBe(134_001)
        ->and($newBap->numerator_end)->toBe(134_500)
        ->and($newBap->total_usage)->toBe(500)
        ->and($newBap->status)->toBe(BapStatus::Draft);

    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $newBap->id,
        'skpd_allocation_id' => $newAllocation->id,
        'numerator_start' => 134_001,
        'numerator_end' => 134_500,
        'quantity' => 500,
    ]);
});

test('2 after first BAP of new allocation is partially saved subsequent BAP on next service date expects and accepts previous end plus one', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create([
        'code' => 'SAMLING-01',
        'name' => 'SAMLING 01',
    ]);
    $petugas = seqPetugas($loket);

    seqAllocation($petugas, $loket, 42_001, 44_000, allocationDate: '2026-09-01');
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_001, 44_000, 1_000, '2026-09-01'))
        ->assertRedirect();

    $newAllocation = seqAllocation($petugas, $loket, 134_001, 136_000, allocationDate: '2026-09-02');

    // First BAP of new allocation: 134001 - 134500 on 2026-09-02
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 200, '2026-09-02'))
        ->assertRedirect();

    // GET create on next service date: expected_numerator_start is previous end + 1 (134501)
    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 134_501)
            ->etc()
        );

    // POST with expected start succeeds
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(134_501, 135_000, 150, '2026-09-03'))
        ->assertRedirect();

    $secondBap = Bap::query()->where('numerator_start', 134_501)->sole();
    expect($secondBap->numerator_start)->toBe(134_501)
        ->and($secondBap->numerator_end)->toBe(135_000)
        ->and($secondBap->total_usage)->toBe(500);

    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $secondBap->id,
        'skpd_allocation_id' => $newAllocation->id,
        'numerator_start' => 134_501,
        'numerator_end' => 135_000,
        'quantity' => 500,
    ]);
});

test('3 when prior old allocation still has remaining items GET and POST must continue first unused old allocation and reject starting new allocation', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'SAMLING 01']);
    $petugas = seqPetugas($loket);

    $oldAllocation = seqAllocation($petugas, $loket, 42_001, 44_000, allocationDate: '2026-09-01');

    // Partial usage on 2026-09-01: 42001 - 42500 (leaves 42501 - 44000 unused, 1500 items)
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_001, 42_500, 100, '2026-09-01'))
        ->assertRedirect();

    $newAllocation = seqAllocation($petugas, $loket, 134_001, 136_000, allocationDate: '2026-09-02');

    // GET create on 2026-09-02 must suggest first unused from old allocation (42501), not 134001
    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 42_501)
            ->etc()
        );

    // POST attempting to jump to new allocation 134001 is rejected
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    $this->assertDatabaseMissing('baps', [
        'numerator_start' => 134_001,
    ]);

    // POST with expected start 42501 succeeds
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_501, 43_000, 100, '2026-09-02'))
        ->assertRedirect();

    $validBap = Bap::query()->where('numerator_start', 42_501)->sole();
    expect($validBap->numerator_start)->toBe(42_501)
        ->and($validBap->numerator_end)->toBe(43_000);

    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $validBap->id,
        'skpd_allocation_id' => $oldAllocation->id,
        'numerator_start' => 42_501,
        'numerator_end' => 43_000,
        'quantity' => 500,
    ]);
});

test('4 new allocation pending, missing accepted metadata, or cancelled is ignored leaving expected start null when old is exhausted', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'SAMLING 01']);
    $petugas = seqPetugas($loket);

    // Fully consume old allocation on 2026-09-01
    seqAllocation($petugas, $loket, 42_001, 44_000, allocationDate: '2026-09-01');
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_001, 44_000, 1_000, '2026-09-01'))
        ->assertRedirect();

    // 4a. Pending allocation (accepted_by = null, accepted_at = null)
    $newAllocation = seqAllocation(
        $petugas,
        $loket,
        134_001,
        136_000,
        allocationDate: '2026-09-02',
        status: SkpdAllocationStatus::Pending,
        withAcceptedBy: false,
    );

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', null)
            ->etc()
        );

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    // 4b. Cancelled allocation
    $newAllocation->update([
        'status' => SkpdAllocationStatus::Cancelled,
        'accepted_by' => null,
        'accepted_at' => null,
    ]);

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', null)
            ->etc()
        );

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    // 4c. Accepted status but missing accepted_by metadata
    $newAllocation->update([
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => null,
        'accepted_at' => now(),
    ]);

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', null)
            ->etc()
        );

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    // 4d. Accepted status but missing accepted_at metadata
    $newAllocation->update([
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => null,
    ]);

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', null)
            ->etc()
        );

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(134_001, 134_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);
});

test('5 invalid ranges including overlap, non-contiguous crossing, outside allocation, and wrong start are rejected', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'SAMLING 01']);
    $petugas = seqPetugas($loket);

    seqAllocation($petugas, $loket, 42_001, 44_000, allocationDate: '2026-09-01');
    // Partially consume 42001 - 43500 on 2026-09-01, leaving 43501 - 44000 (500 items)
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_001, 43_500, 500, '2026-09-01'))
        ->assertRedirect();

    seqAllocation($petugas, $loket, 134_001, 136_000, allocationDate: '2026-09-02');

    // 5a. Overlap with existing used range (42001 - 42500)
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(42_001, 42_500, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    $sequence = app(BapAllocationSequence::class);
    $allocations = $sequence->receivedAllocations($loket->id);
    expect($sequence->segmentsForRange($allocations, 42_001, 42_500))->toBe([]);

    // 5b. Gap / non-contiguous crossing between old and new allocation in single BAP (43501 - 134100)
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(43_501, 134_100, 100, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_end']);

    expect($sequence->segmentsForRange($allocations, 43_501, 134_100))->toBe([]);

    // 5c. Range completely outside any allocation
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(9_900_001, 9_900_100, 0, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    // 5d. Wrong start leaving unused sequence gap (43600 instead of 43501)
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(43_600, 43_700, 50, '2026-09-02'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);
});

test('6 tail draft update can resize within same allocation but cannot jump to new allocation and non-tail draft update is rejected', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'SAMLING 01']);
    $petugas = seqPetugas($loket);

    seqAllocation($petugas, $loket, 42_001, 44_000, allocationDate: '2026-09-01');
    seqAllocation($petugas, $loket, 134_001, 136_000, allocationDate: '2026-09-02');

    // Create Draft 1 on 2026-09-01
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_001, 42_500, 100, '2026-09-01'))
        ->assertRedirect();

    $draft1 = Bap::query()->sole();

    // 6a. Tail draft excludes its own usage and can expand within same allocation
    $this->actingAs($petugas)
        ->put(route('baps.update', $draft1), seqPayload(42_001, 42_800, 150, '2026-09-01'))
        ->assertRedirect(route('baps.show', $draft1));

    $draft1->refresh();
    expect($draft1->numerator_end)->toBe(42_800)
        ->and($draft1->total_usage)->toBe(800)
        ->and($draft1->online_usage_count)->toBe(150);

    // Tail draft can also shrink within same allocation
    $this->actingAs($petugas)
        ->put(route('baps.update', $draft1), seqPayload(42_001, 42_300, 50, '2026-09-01'))
        ->assertRedirect(route('baps.show', $draft1));

    $draft1->refresh();
    expect($draft1->numerator_end)->toBe(42_300)
        ->and($draft1->total_usage)->toBe(300);

    // 6b. Cannot jump to new allocation while old allocation has remaining items
    $this->actingAs($petugas)
        ->from(route('baps.show', $draft1))
        ->put(route('baps.update', $draft1), seqPayload(134_001, 134_500, 50, '2026-09-01'))
        ->assertRedirect(route('baps.show', $draft1))
        ->assertSessionHasErrors(['numerator_start']);

    // 6c. Non-tail draft update is rejected by chronology rules
    // Create Draft 2 on 2026-09-02
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(42_301, 42_600, 50, '2026-09-02'))
        ->assertRedirect();

    // Draft 1 is no longer tail draft, attempting update is rejected
    $this->actingAs($petugas)
        ->from(route('baps.show', $draft1))
        ->put(route('baps.update', $draft1), seqPayload(42_001, 42_200, 50, '2026-09-01'))
        ->assertRedirect(route('baps.show', $draft1))
        ->assertSessionHasErrors(['numerator_start']);
});

test('7 allocation priority strictly follows allocation_date, accepted_at, and id rather than numeric start', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'Loket Prioritas']);
    $petugas = seqPetugas($loket);

    // Allocation A: earlier allocation_date, but numerically HIGHER range (500_001 - 502_000)
    $allocationA = seqAllocation(
        $petugas,
        $loket,
        500_001,
        502_000,
        allocationDate: '2026-08-01',
        acceptedAt: CarbonImmutable::parse('2026-08-01 10:00:00'),
    );

    // Allocation B: later allocation_date, but numerically LOWER range (100_001 - 102_000)
    $allocationB = seqAllocation(
        $petugas,
        $loket,
        100_001,
        102_000,
        allocationDate: '2026-08-05',
        acceptedAt: CarbonImmutable::parse('2026-08-05 10:00:00'),
    );

    // Form expects Allocation A (500_001), NOT Allocation B (100_001)
    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 500_001)
            ->etc()
        );

    // Attempting to use numerically lower Allocation B while Allocation A is unexhausted is rejected
    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), seqPayload(100_001, 100_500, 50, '2026-08-06'))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['numerator_start']);

    // Fully consume Allocation A on 2026-08-06
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(500_001, 502_000, 500, '2026-08-06'))
        ->assertRedirect();

    expect($allocationA->fresh()->status)->toBe(SkpdAllocationStatus::Completed);

    // Next service date: form now expects Allocation B (100_001) even though it is numerically lower than previous BAP
    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 100_001)
            ->etc()
        );

    // POST with Allocation B succeeds
    $this->actingAs($petugas)
        ->post(route('baps.store'), seqPayload(100_001, 100_500, 50, '2026-08-07'))
        ->assertRedirect();

    $bapB = Bap::query()->where('numerator_start', 100_001)->sole();
    expect($bapB->numerator_start)->toBe(100_001)
        ->and($bapB->numerator_end)->toBe(100_500);

    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $bapB->id,
        'skpd_allocation_id' => $allocationB->id,
        'numerator_start' => 100_001,
        'numerator_end' => 100_500,
    ]);

    // Test tie-breaking by accepted_at on same allocation_date
    $loketTie = Loket::factory()->create(['name' => 'Loket Tie Break']);
    $petugasTie = seqPetugas($loketTie);

    $allocationC = seqAllocation(
        $petugasTie,
        $loketTie,
        700_001,
        701_000,
        allocationDate: '2026-09-01',
        acceptedAt: CarbonImmutable::parse('2026-09-01 08:00:00'),
    );

    $allocationD = seqAllocation(
        $petugasTie,
        $loketTie,
        600_001,
        601_000,
        allocationDate: '2026-09-01',
        acceptedAt: CarbonImmutable::parse('2026-09-01 12:00:00'),
    );

    $sequence = app(BapAllocationSequence::class);
    $allocationsTie = $sequence->receivedAllocations($loketTie->id);
    expect($allocationsTie->first()->id)->toBe($allocationC->id)
        ->and($sequence->expectedStart($allocationsTie, null))->toBe(700_001);

    // Test tie-breaking by id when allocation_date and accepted_at are identical
    $sameTimestamp = CarbonImmutable::parse('2026-09-02 09:00:00');
    $allocationE = seqAllocation(
        $petugasTie,
        $loketTie,
        900_001,
        901_000,
        allocationDate: '2026-09-02',
        acceptedAt: $sameTimestamp,
    );
    $allocationF = seqAllocation(
        $petugasTie,
        $loketTie,
        800_001,
        801_000,
        allocationDate: '2026-09-02',
        acceptedAt: $sameTimestamp,
    );

    expect($allocationE->id)->toBeLessThan($allocationF->id);
    $allocationsSameDate = $sequence->receivedAllocations($loketTie->id)
        ->whereIn('id', [$allocationE->id, $allocationF->id])
        ->values();
    expect($allocationsSameDate->first()->id)->toBe($allocationE->id);
});

test('8 BAP actions enforce shared inventory lock and preserve ledger integrity', function () {
    $this->travelTo('2026-09-10 09:00:00');

    $loket = Loket::factory()->create(['name' => 'Loket Lock Test']);
    $petugas = seqPetugas($loket);
    seqAllocation($petugas, $loket, 50_001, 51_000);

    $createAction = app(CreateBap::class);

    // Delete lock row to verify action enforces inventory lock
    DB::table('skpd_inventory_locks')->where('id', 1)->delete();

    try {
        expect(fn () => $createAction->handle(
            $petugas,
            $loket,
            CarbonImmutable::parse('2026-09-01'),
            50_001,
            50_500,
        ))->toThrow(LogicException::class, 'Kunci transaksi inventaris SKPD tidak tersedia.');
    } finally {
        DB::table('skpd_inventory_locks')->insert(['id' => 1]);
    }

    // With lock present, create succeeds
    $bap = $createAction->handle(
        $petugas,
        $loket,
        CarbonImmutable::parse('2026-09-01'),
        50_001,
        50_500,
    );
    expect($bap->id)->not->toBeNull();

    $updateAction = app(UpdateBap::class);

    // Verify update also enforces inventory lock
    DB::table('skpd_inventory_locks')->where('id', 1)->delete();

    try {
        expect(fn () => $updateAction->handle(
            $petugas,
            $bap,
            CarbonImmutable::parse('2026-09-01'),
            50_001,
            50_600,
            0,
        ))->toThrow(LogicException::class, 'Kunci transaksi inventaris SKPD tidak tersedia.');
    } finally {
        DB::table('skpd_inventory_locks')->insert(['id' => 1]);
    }

    // With lock restored, update succeeds
    $updated = $updateAction->handle(
        $petugas,
        $bap,
        CarbonImmutable::parse('2026-09-01'),
        50_001,
        50_600,
        0,
    );
    expect($updated->numerator_end)->toBe(50_600);
});
