<?php

use App\Actions\SkpdInventory\AcceptSkpdAllocation;
use App\Actions\SkpdInventory\CancelSkpdAllocation;
use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\CreateSkpdAllocation;
use App\Actions\SkpdInventory\RecordBapCancellation;
use App\Actions\SkpdInventory\RegisterSkpdBox;
use App\Actions\SkpdInventory\SubmitBap;
use App\Actions\SkpdInventory\UpdateBap;
use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\SkpdBoxStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

function petugasLoket(Loket $loket): User
{
    return User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
}

function registerBox(User $actor, int $numeratorStart = 5_000_000, int $numeratorEnd = 5_001_999, string $boxNumber = 'BOX-001'): SkpdBox
{
    return app(RegisterSkpdBox::class)->handle(
        $actor,
        $boxNumber,
        $numeratorStart,
        $numeratorEnd,
        CarbonImmutable::parse('2026-08-30 09:00:00'),
    );
}

function allocate(User $actor, SkpdBox $box, Loket $loket, int $numeratorStart, int $numeratorEnd): SkpdAllocation
{
    return app(CreateSkpdAllocation::class)->handle(
        $actor,
        $box,
        $loket,
        CarbonImmutable::parse('2026-08-31'),
        $numeratorStart,
        $numeratorEnd,
    );
}

function accept(User $actor, SkpdAllocation $allocation): SkpdAllocation
{
    return app(AcceptSkpdAllocation::class)->handle($actor, $allocation);
}

function createBap(User $actor, Loket $loket, string $serviceDate, int $numeratorStart, int $numeratorEnd, int $onlineUsageCount = 0): Bap
{
    return app(CreateBap::class)->handle(
        $actor,
        $loket,
        CarbonImmutable::parse($serviceDate),
        $numeratorStart,
        $numeratorEnd,
        $onlineUsageCount,
    );
}

test('registers a valid sequential box and derives its central inventory', function () {
    $actor = User::factory()->create();

    $box = registerBox($actor);

    $this->assertModelExists($box);
    $this->assertDatabaseHas('skpd_boxes', [
        'id' => $box->id,
        'box_number' => 'BOX-001',
        'numerator_start' => 5_000_000,
        'numerator_end' => 5_001_999,
        'total_sets' => 2_000,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdBox::class,
        'auditable_id' => $box->id,
        'event' => 'skpd_box.registered',
    ]);
    expect($box->availableQuantity())->toBe(2_000)
        ->and($box->centralPhysicalQuantity())->toBe(2_000)
        ->and($box->status())->toBe(SkpdBoxStatus::Available);
});

test('rejects an invalid box range', function () {
    $actor = User::factory()->create();

    expect(fn () => registerBox($actor, 5_000_001, 5_000_000))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('skpd_boxes', ['box_number' => 'BOX-001']);
});

test('inventory actions reject the zero numerator boundary', function () {
    $actor = User::factory()->make();
    $loket = Loket::factory()->make();
    $box = SkpdBox::factory()->make();
    $bap = Bap::factory()->make();

    expect(fn () => app(RegisterSkpdBox::class)->handle(
        $actor,
        'BOX-ZERO-BOUNDARY',
        0,
        1,
        CarbonImmutable::parse('2026-08-30 09:00:00'),
    ))->toThrow(ValidationException::class);

    expect(fn () => app(CreateSkpdAllocation::class)->handle(
        $actor,
        $box,
        $loket,
        CarbonImmutable::parse('2026-08-31'),
        0,
        1,
    ))
        ->toThrow(ValidationException::class);

    expect(fn () => app(CreateBap::class)->handle(
        $actor,
        $loket,
        CarbonImmutable::parse('2026-08-30'),
        0,
        1,
    ))->toThrow(ValidationException::class);

    expect(fn () => app(UpdateBap::class)->handle(
        $actor,
        $bap,
        CarbonImmutable::parse('2026-08-30'),
        0,
        1,
        0,
    ))->toThrow(ValidationException::class);
});

test('rejects a duplicate box number', function () {
    $actor = User::factory()->create();
    registerBox($actor);

    expect(fn () => registerBox($actor, 5_002_000, 5_003_999))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('skpd_boxes', ['numerator_start' => 5_002_000]);
});

test('rejects an overlapping box range', function () {
    $actor = User::factory()->create();
    registerBox($actor);

    expect(fn () => registerBox($actor, 5_001_000, 5_002_999, 'BOX-002'))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('skpd_boxes', ['box_number' => 'BOX-002']);
});

test('registers a non-contiguous box range without allowing overlap', function () {
    $actor = User::factory()->create();
    registerBox($actor);

    $box = registerBox($actor, 5_003_000, 5_004_999, 'BOX-002');

    $this->assertDatabaseHas('skpd_boxes', [
        'id' => $box->id,
        'box_number' => 'BOX-002',
        'numerator_start' => 5_003_000,
        'numerator_end' => 5_004_999,
        'total_sets' => 2_000,
    ]);
});

test('creates partial allocations for the same loket without moving pending stock', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);

    $firstAllocation = allocate($actor, $box, $loket, 5_000_000, 5_000_499);
    $secondAllocation = allocate($actor, $box, $loket, 5_000_500, 5_000_999);

    $this->assertModelExists($firstAllocation);
    $this->assertModelExists($secondAllocation);
    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $firstAllocation->id,
        'quantity' => 500,
        'status' => SkpdAllocationStatus::Pending->value,
    ]);
    expect($box->fresh()->pendingQuantity())->toBe(1_000)
        ->and($box->fresh()->administrativelyAllocatedQuantity())->toBe(0)
        ->and($box->fresh()->centralPhysicalQuantity())->toBe(2_000)
        ->and($box->fresh()->availableQuantity())->toBe(1_000)
        ->and($box->fresh()->status())->toBe(SkpdBoxStatus::PartiallyAllocated);
});

test('one box can be split across Lokets while their ranges stay disjoint', function () {
    $firstLoket = Loket::factory()->create();
    $secondLoket = Loket::factory()->create();
    $actor = petugasLoket($firstLoket);
    $box = registerBox($actor);
    allocate($actor, $box, $firstLoket, 5_000_000, 5_000_499);

    $secondAllocation = allocate($actor, $box, $secondLoket, 5_000_500, 5_000_999);

    expect($secondAllocation->loket_id)->toBe($secondLoket->id)
        ->and($secondAllocation->skpd_box_id)->toBe($box->id);
    expect(fn () => allocate($actor, $box, $secondLoket, 5_000_400, 5_000_450))
        ->toThrow(ValidationException::class);
});

test('rejects allocation ranges outside their source box or overlapping an existing allocation', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    allocate($actor, $box, $loket, 5_000_000, 5_000_499);

    expect(fn () => allocate($actor, $box, $loket, 4_999_999, 5_000_000))
        ->toThrow(ValidationException::class);
    expect(fn () => allocate($actor, $box, $loket, 5_000_400, 5_000_600))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('skpd_allocations', ['numerator_start' => 4_999_999]);
    $this->assertDatabaseMissing('skpd_allocations', ['numerator_start' => 5_000_400]);
});

test('activates an allocation only after its destination loket accepts the handover', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    $allocation = allocate($actor, $box, $loket, 5_000_000, 5_000_499);

    $acceptedAllocation = accept($actor, $allocation);

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Accepted->value,
        'accepted_by' => $actor->id,
    ]);
    expect($acceptedAllocation->accepted_at)->not->toBeNull()
        ->and($box->fresh()->pendingQuantity())->toBe(0)
        ->and($box->fresh()->administrativelyAllocatedQuantity())->toBe(500)
        ->and($box->fresh()->centralPhysicalQuantity())->toBe(1_500);
});

test('rejects acceptance by a user assigned to another loket', function () {
    $firstLoket = Loket::factory()->create();
    $secondLoket = Loket::factory()->create();
    $actor = petugasLoket($firstLoket);
    $otherActor = petugasLoket($secondLoket);
    $box = registerBox($actor);
    $allocation = allocate($actor, $box, $firstLoket, 5_000_000, 5_000_499);

    expect(fn () => accept($otherActor, $allocation))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Pending->value,
    ]);
});

test('cancels a pending allocation and releases its range for the same loket', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    $allocation = allocate($actor, $box, $loket, 5_000_000, 5_000_499);

    $cancelledAllocation = app(CancelSkpdAllocation::class)->handle($actor, $allocation);
    $replacementAllocation = allocate($actor, $box, $loket, 5_000_000, 5_000_499);

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Cancelled->value,
    ]);
    expect($cancelledAllocation->status)->toBe(SkpdAllocationStatus::Cancelled)
        ->and($replacementAllocation->status)->toBe(SkpdAllocationStatus::Pending)
        ->and($box->fresh()->pendingQuantity())->toBe(500);
});

test('creates a BAP across contiguous accepted allocations and keeps online usage inclusive', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    $firstAllocation = accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));
    $secondAllocation = accept($actor, allocate($actor, $box, $loket, 5_000_003, 5_000_004));

    $bap = createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_004, 2);

    $this->assertModelExists($bap);
    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'total_usage' => 5,
        'online_usage_count' => 2,
        'status' => BapStatus::Draft->value,
    ]);
    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $firstAllocation->id,
        'quantity' => 3,
    ]);
    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $secondAllocation->id,
        'quantity' => 2,
    ]);
    expect($bap->total_usage)->toBe(5)
        ->and($firstAllocation->fresh()->status)->toBe(SkpdAllocationStatus::Completed)
        ->and($secondAllocation->fresh()->status)->toBe(SkpdAllocationStatus::Completed)
        ->and($box->fresh()->usedQuantity())->toBe(5);
});

test('rejects a BAP range outside the accepted allocation', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));

    expect(fn () => createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_003))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('baps', ['loket_id' => $loket->id]);
});

test('rejects invalid BAP ranges and online usage above the range total', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));

    expect(fn () => createBap($actor, $loket, '2026-08-30', 5_000_002, 5_000_001))
        ->toThrow(ValidationException::class);
    expect(fn () => createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002, 4))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('baps', ['loket_id' => $loket->id]);
});

test('rejects a second BAP on the same date while the allocation still has numerators and allows a zero-usage day', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_005));
    createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);

    expect(fn () => createBap($actor, $loket, '2026-08-30', 5_000_003, 5_000_003))
        ->toThrow(ValidationException::class);

    $nextBap = createBap($actor, $loket, '2026-09-01', 5_000_003, 5_000_005);

    expect($nextBap->service_date->toDateString())->toBe('2026-09-01')
        ->and($nextBap->numerator_start)->toBe(5_000_003);
});

test('rejects a sequential numerator jump', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_005));
    createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);

    expect(fn () => createBap($actor, $loket, '2026-08-31', 5_000_004, 5_000_005))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('baps', ['numerator_start' => 5_000_004]);
});

test('records cancellation inside a BAP without reducing total usage', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));
    $bap = createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);

    $cancellation = app(RecordBapCancellation::class)->handle(
        $actor,
        $bap,
        5_000_001,
        BapCancellationReason::Damaged,
        'Tinta rusak.',
    );

    $this->assertModelExists($cancellation);
    $this->assertDatabaseHas('bap_cancellations', [
        'bap_id' => $bap->id,
        'numerator' => 5_000_001,
        'reason' => BapCancellationReason::Damaged->value,
    ]);
    expect($bap->fresh()->total_usage)->toBe(3)
        ->and($bap->fresh()->normalUsageQuantity())->toBe(2);
});

test('rejects cancellation outside a BAP and duplicate cancellation', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));
    $bap = createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);

    expect(fn () => app(RecordBapCancellation::class)->handle($actor, $bap, 5_000_003, BapCancellationReason::Cancelled))
        ->toThrow(ValidationException::class);

    app(RecordBapCancellation::class)->handle($actor, $bap, 5_000_001, BapCancellationReason::Cancelled);

    expect(fn () => app(RecordBapCancellation::class)->handle($actor, $bap, 5_000_001, BapCancellationReason::Cancelled))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('bap_cancellations', ['numerator' => 5_000_003]);
});

test('prevents a cancelled numerator from being reused in a subsequent BAP', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_003));
    $bap = createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);
    app(RecordBapCancellation::class)->handle($actor, $bap, 5_000_001, BapCancellationReason::Cancelled);

    expect(fn () => createBap($actor, $loket, '2026-08-31', 5_000_001, 5_000_003))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseMissing('baps', ['numerator_start' => 5_000_001]);
});

test('submits a draft BAP once and rejects an invalid status transition', function () {
    $loket = Loket::factory()->create();
    $actor = petugasLoket($loket);
    $box = registerBox($actor);
    accept($actor, allocate($actor, $box, $loket, 5_000_000, 5_000_002));
    $bap = createBap($actor, $loket, '2026-08-30', 5_000_000, 5_000_002);

    $submittedBap = app(SubmitBap::class)->handle($actor, $bap);

    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'status' => BapStatus::Submitted->value,
    ]);
    expect($submittedBap->submitted_at)->not->toBeNull();
    expect(fn () => app(SubmitBap::class)->handle($actor, $submittedBap))
        ->toThrow(ValidationException::class);
});
