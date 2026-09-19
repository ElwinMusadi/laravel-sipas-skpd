<?php

use App\Actions\SkpdInventory\AcceptSkpdAllocation;
use App\Actions\SkpdInventory\CreateSkpdAllocation;
use App\Actions\SkpdInventory\RegisterSkpdBox;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

function phaseFiveBendahara(): User
{
    return User::factory()->create(['role' => UserRole::BendaharaBarang]);
}

function phaseFivePetugasLoket(Loket $loket): User
{
    return User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
}

function phaseFiveBox(
    User $actor,
    string $boxNumber = 'BOX-PHASE-05',
    int $numeratorStart = 5_000_000,
    int $numeratorEnd = 5_001_999,
): SkpdBox {
    return app(RegisterSkpdBox::class)->handle(
        $actor,
        $boxNumber,
        $numeratorStart,
        $numeratorEnd,
        CarbonImmutable::parse('2026-08-30 09:00:00'),
    );
}

function phaseFiveAllocation(
    User $actor,
    SkpdBox $box,
    Loket $loket,
    int $numeratorStart = 5_000_000,
    int $numeratorEnd = 5_000_499,
): SkpdAllocation {
    return app(CreateSkpdAllocation::class)->handle(
        $actor,
        $box,
        $loket,
        now(),
        $numeratorStart,
        $numeratorEnd,
    );
}

test('bendahara barang can register Boxes with non-contiguous ranges through the inventory endpoint', function () {
    $bendahara = phaseFiveBendahara();

    $firstResponse = $this->actingAs($bendahara)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'box-phase-05-001',
            'numerator_start' => '0582608',
            'numerator_end' => '0582620',
            'received_at' => '2026-08-30',
        ]);

    $firstBox = SkpdBox::query()->where('box_number', 'BOX-PHASE-05-001')->firstOrFail();

    $firstResponse->assertRedirect(route('skpd.boxes.show', $firstBox));

    $secondResponse = $this->actingAs($bendahara)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-PHASE-05-002',
            'numerator_start' => '0700001',
            'numerator_end' => '0702000',
            'received_at' => '2026-09-02',
        ]);

    $secondBox = SkpdBox::query()->where('box_number', 'BOX-PHASE-05-002')->firstOrFail();

    $secondResponse->assertRedirect(route('skpd.boxes.show', $secondBox));
    $this->assertDatabaseHas('skpd_boxes', [
        'id' => $secondBox->id,
        'box_number' => 'BOX-PHASE-05-002',
        'numerator_start' => 700_001,
        'numerator_end' => 702_000,
        'total_sets' => 2_000,
        'created_by' => $bendahara->id,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdBox::class,
        'auditable_id' => $secondBox->id,
        'event' => 'skpd_box.registered',
    ]);
});

test('registration rejects an invalid Box range before it reaches the domain action', function () {
    $bendahara = phaseFiveBendahara();

    $this->actingAs($bendahara)
        ->from(route('skpd.boxes.create'))
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-INVALID',
            'numerator_start' => '0582620',
            'numerator_end' => '0582608',
            'received_at' => '2026-08-30',
        ])
        ->assertRedirect(route('skpd.boxes.create'))
        ->assertSessionHasErrors([
            'numerator_end' => 'Nomerator akhir harus lebih besar dari nomerator awal.',
        ]);

    $this->assertDatabaseMissing('skpd_boxes', ['box_number' => 'BOX-INVALID']);
});

test('registration rejects the zero numerator boundary before it reaches the domain action', function () {
    $bendahara = phaseFiveBendahara();

    $this->actingAs($bendahara)
        ->from(route('skpd.boxes.create'))
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-ZERO-BOUNDARY',
            'numerator_start' => '0000000',
            'numerator_end' => '0000001',
            'received_at' => '2026-08-30',
        ])
        ->assertRedirect(route('skpd.boxes.create'))
        ->assertSessionHasErrors([
            'numerator_start' => 'Nomerator awal minimal 0000001.',
        ]);

    $this->assertDatabaseMissing('skpd_boxes', ['box_number' => 'BOX-ZERO-BOUNDARY']);
});

test('non-bendahara roles cannot register a Box through direct HTTP requests', function () {
    $petugas = User::factory()->create(['role' => UserRole::PetugasPenetapan]);

    $this->actingAs($petugas)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-BYPASS',
            'numerator_start' => '0582608',
            'numerator_end' => '0582620',
            'received_at' => '2026-08-30',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('skpd_boxes', ['box_number' => 'BOX-BYPASS']);
});

test('bendahara barang can create a partial allocation through the inventory endpoint', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create(['name' => 'SAMSAT Corner']);
    $box = phaseFiveBox($bendahara);

    $response = $this->actingAs($bendahara)
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $loket->id,
            'allocation_date' => '2026-08-31',
            'numerator_start' => '5000000',
            'numerator_end' => '5000499',
        ]);

    $allocation = SkpdAllocation::query()->firstOrFail();

    $response->assertRedirect(route('skpd.allocations.show', $allocation));
    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'quantity' => 500,
        'status' => SkpdAllocationStatus::Pending->value,
    ]);
    expect($allocation->allocation_date?->toDateString())->toBe('2026-08-31');
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdAllocation::class,
        'auditable_id' => $allocation->id,
        'event' => 'skpd_allocation.created',
    ]);
});

test('allocation endpoint requires a valid allocation date', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create();
    $box = phaseFiveBox($bendahara);

    $this->actingAs($bendahara)
        ->from(route('skpd.allocations.create'))
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $loket->id,
            'numerator_start' => '5000000',
            'numerator_end' => '5000499',
        ])
        ->assertRedirect(route('skpd.allocations.create'))
        ->assertSessionHasErrors('allocation_date');

    $this->assertDatabaseCount('skpd_allocations', 0);
});

test('allocation endpoint rejects a range outside its Box', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create();
    $box = phaseFiveBox($bendahara);

    $this->actingAs($bendahara)
        ->from(route('skpd.allocations.create'))
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $loket->id,
            'allocation_date' => '2026-08-31',
            'numerator_start' => '4999999',
            'numerator_end' => '5000001',
        ])
        ->assertRedirect(route('skpd.allocations.create'))
        ->assertSessionHasErrors('numerator_start');

    $this->assertDatabaseMissing('skpd_allocations', [
        'skpd_box_id' => $box->id,
        'numerator_start' => 4_999_999,
    ]);
});

test('a Box cannot be allocated to another Loket through direct HTTP requests', function () {
    $bendahara = phaseFiveBendahara();
    $firstLoket = Loket::factory()->create();
    $secondLoket = Loket::factory()->create();
    $box = phaseFiveBox($bendahara);

    phaseFiveAllocation($bendahara, $box, $firstLoket);

    $this->actingAs($bendahara)
        ->from(route('skpd.allocations.create'))
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $secondLoket->id,
            'allocation_date' => '2026-08-31',
            'numerator_start' => '5000500',
            'numerator_end' => '5000999',
        ])
        ->assertRedirect(route('skpd.allocations.create'))
        ->assertSessionHasErrors('loket_id');

    $this->assertDatabaseMissing('skpd_allocations', ['loket_id' => $secondLoket->id]);
});

test('Box list exposes ledger-derived status and range data for bendahara barang', function () {
    $bendahara = phaseFiveBendahara();
    $box = phaseFiveBox($bendahara);

    $this->actingAs($bendahara)
        ->get(route('skpd.boxes.index', ['status' => 'available']))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/boxes/index')
                ->where('boxes.data.0.id', $box->id)
                ->where('boxes.data.0.status', 'available')
                ->where('boxes.data.0.numerator_start', 5_000_000)
                ->where('boxes.data.0.available_quantity', 2_000)
                ->etc(),
        );

    $this->actingAs($bendahara)
        ->get(route('skpd.boxes.show', $box))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/boxes/show')
                ->where('box.id', $box->id)
                ->where('box.status', 'available')
                ->where('box.creator.id', $bendahara->id)
                ->etc(),
        );
});

test('assigned petugas loket can accept a pending handover and activate its inventory', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create();
    $petugas = phaseFivePetugasLoket($loket);
    $allocation = phaseFiveAllocation($bendahara, phaseFiveBox($bendahara), $loket);

    $this->actingAs($petugas)
        ->get(route('skpd.allocations.show', $allocation))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/allocations/show')
                ->where('allocation.id', $allocation->id)
                ->where('allocation.can.accept', true)
                ->where('allocation.box.box_number', $allocation->skpdBox->box_number)
                ->etc(),
        );

    $this->actingAs($petugas)
        ->post(route('skpd.allocations.accept', $allocation))
        ->assertRedirect(route('skpd.allocations.show', $allocation));

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Accepted->value,
        'accepted_by' => $petugas->id,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdAllocation::class,
        'auditable_id' => $allocation->id,
        'event' => 'skpd_allocation.accepted',
    ]);
});

test('bendahara barang can view and update a pending allocation through the inventory endpoint', function () {
    $bendahara = phaseFiveBendahara();
    $firstLoket = Loket::factory()->create(['name' => 'Loket awal']);
    $secondLoket = Loket::factory()->create(['name' => 'Loket pengganti']);
    $allocation = phaseFiveAllocation(
        $bendahara,
        phaseFiveBox($bendahara),
        $firstLoket,
    );

    $this->actingAs($bendahara)
        ->get(route('skpd.allocations.edit', $allocation))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/allocations/edit')
                ->where('allocation.id', $allocation->id)
                ->where('allocation.loket_id', $firstLoket->id)
                ->where('allocation.allocation_date', now()->toDateString())
                ->where('allocation.numerator_start', 5_000_000)
                ->where('allocation.numerator_end', 5_000_499)
                ->etc(),
        );

    $this->actingAs($bendahara)
        ->patch(route('skpd.allocations.update', $allocation), [
            'loket_id' => $secondLoket->id,
            'allocation_date' => '2026-09-01',
            'numerator_start' => '5000500',
            'numerator_end' => '5000999',
        ])
        ->assertRedirect(route('skpd.allocations.show', $allocation));

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'skpd_box_id' => $allocation->skpd_box_id,
        'loket_id' => $secondLoket->id,
        'numerator_start' => 5_000_500,
        'numerator_end' => 5_000_999,
        'quantity' => 500,
        'status' => SkpdAllocationStatus::Pending->value,
    ]);
    expect($allocation->fresh()->allocation_date?->toDateString())->toBe('2026-09-01');
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdAllocation::class,
        'auditable_id' => $allocation->id,
        'event' => 'skpd_allocation.updated',
    ]);
});

test('accepted allocations cannot be edited through direct HTTP requests', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create();
    $petugas = phaseFivePetugasLoket($loket);
    $allocation = phaseFiveAllocation($bendahara, phaseFiveBox($bendahara), $loket);

    app(AcceptSkpdAllocation::class)->handle($petugas, $allocation);

    $this->actingAs($bendahara)
        ->get(route('skpd.allocations.edit', $allocation))
        ->assertForbidden();

    $this->actingAs($bendahara)
        ->patch(route('skpd.allocations.update', $allocation), [
            'loket_id' => $loket->id,
            'numerator_start' => '5000500',
            'numerator_end' => '5000999',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'numerator_start' => 5_000_000,
        'numerator_end' => 5_000_499,
        'status' => SkpdAllocationStatus::Accepted->value,
    ]);
});

test('creator bendahara barang can cancel a pending allocation through the inventory endpoint', function () {
    $bendahara = phaseFiveBendahara();
    $loket = Loket::factory()->create();
    $allocation = phaseFiveAllocation($bendahara, phaseFiveBox($bendahara), $loket);

    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.cancel', $allocation))
        ->assertRedirect(route('skpd.allocations.show', $allocation));

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Cancelled->value,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => SkpdAllocation::class,
        'auditable_id' => $allocation->id,
        'event' => 'skpd_allocation.cancelled',
    ]);
});

test('petugas loket cannot view or accept an allocation assigned to another Loket', function () {
    $bendahara = phaseFiveBendahara();
    $destinationLoket = Loket::factory()->create();
    $otherPetugas = phaseFivePetugasLoket(Loket::factory()->create());
    $allocation = phaseFiveAllocation($bendahara, phaseFiveBox($bendahara), $destinationLoket);

    $this->actingAs($otherPetugas)
        ->get(route('skpd.allocations.show', $allocation))
        ->assertForbidden();

    $this->actingAs($otherPetugas)
        ->post(route('skpd.allocations.accept', $allocation))
        ->assertForbidden();

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $allocation->id,
        'status' => SkpdAllocationStatus::Pending->value,
        'accepted_by' => null,
    ]);
});

test('petugas loket inventory contains only allocations for their own Loket', function () {
    $bendahara = phaseFiveBendahara();
    $currentLoket = Loket::factory()->create(['name' => 'Loket Sendiri']);
    $otherLoket = Loket::factory()->create(['name' => 'Loket Lain']);
    $petugas = phaseFivePetugasLoket($currentLoket);
    $currentAllocation = phaseFiveAllocation(
        $bendahara,
        phaseFiveBox($bendahara, 'BOX-LOKET-1'),
        $currentLoket,
    );
    $otherAllocation = phaseFiveAllocation(
        $bendahara,
        phaseFiveBox($bendahara, 'BOX-LOKET-2', 5_002_000, 5_003_999),
        $otherLoket,
        5_002_000,
        5_002_499,
    );

    app(AcceptSkpdAllocation::class)->handle($petugas, $currentAllocation);

    $this->actingAs($petugas)
        ->get(route('skpd.inventory.index'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/inventory')
                ->where('scope', 'loket')
                ->where('loket.id', $currentLoket->id)
                ->where('metrics.received_quantity', 500)
                ->where('recent_allocations.0.id', $currentAllocation->id)
                ->missing('recent_allocations.1')
                ->etc(),
        );

    $this->assertDatabaseHas('skpd_allocations', [
        'id' => $otherAllocation->id,
        'loket_id' => $otherLoket->id,
    ]);
});

test('roles outside the inventory workflow cannot access inventory pages', function () {
    $petugasPenetapan = User::factory()->create(['role' => UserRole::PetugasPenetapan]);

    $this->actingAs($petugasPenetapan)
        ->get(route('skpd.inventory.index'))
        ->assertForbidden();
});

test('superadmin receives central oversight with mutation permission', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->get(route('skpd.inventory.index'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('skpd/inventory')
                ->where('scope', 'central')
                ->where('auth.permissions.viewCentralSkpdInventory', true)
                ->where('auth.permissions.manageSkpdInventory', true)
                ->etc(),
        );

    $this->actingAs($superadmin)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-SUPERADMIN-BYPASS',
            'numerator_start' => '0582608',
            'numerator_end' => '0582620',
            'received_at' => '2026-08-30',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('skpd_boxes', [
        'box_number' => 'BOX-SUPERADMIN-BYPASS',
        'created_by' => $superadmin->id,
    ]);
});
