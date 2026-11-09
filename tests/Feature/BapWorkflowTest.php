<?php

use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\GenerateBapDocumentNumber;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Database\QueryException;
use Inertia\Testing\AssertableInertia as Assert;

function bapPetugas(Loket $loket, ?string $name = null): User
{
    return User::factory()->create([
        'name' => $name ?? 'Petugas Loket',
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
}

function bapAllocation(
    User $petugas,
    Loket $loket,
    int $numeratorStart = 582_608,
    int $numeratorEnd = 582_620,
    ?SkpdBox $box = null,
): SkpdAllocation {
    $box ??= SkpdBox::factory()->create([
        'box_number' => 'BOX-BAP-'.fake()->unique()->bothify('####??'),
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
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => now(),
    ]);
}

/**
 * @return array{service_date: string, numerator_start: string, numerator_end: string, online_usage_count: int, cancellation_count: int}
 */
function bapPayload(
    int $numeratorStart = 582_608,
    int $numeratorEnd = 582_620,
    int $onlineUsageCount = 5,
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

test('petugas loket can create a BAP draft from their assigned Loket with derived segments and audit', function () {
    $loket = Loket::factory()->create(['name' => 'SAMSAT Corner']);
    $petugas = bapPetugas($loket);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-BAP-MULTI',
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'total_sets' => 13,
    ]);
    $firstAllocation = bapAllocation($petugas, $loket, 582_608, 582_614, $box);
    $secondAllocation = bapAllocation($petugas, $loket, 582_615, 582_620, $box);

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload())
        ->assertRedirect();

    $bap = Bap::query()->sole();

    expect($bap->loket_id)->toBe($loket->id)
        ->and($bap->total_usage)->toBe(13)
        ->and($bap->online_usage_count)->toBe(5)
        ->and($bap->status)->toBe(BapStatus::Draft);
    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $firstAllocation->id,
        'numerator_start' => 582_608,
        'numerator_end' => 582_614,
        'quantity' => 7,
    ]);
    $this->assertDatabaseHas('bap_usage_segments', [
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $secondAllocation->id,
        'numerator_start' => 582_615,
        'numerator_end' => 582_620,
        'quantity' => 6,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap.created',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap_usage_segments.created',
    ]);
});

test('BAP index provides the cancellation count for its Batal/Rusak column', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket);

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload())
        ->assertRedirect();

    $bap = Bap::query()->sole();
    BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_610,
        'reason' => 'printer_error',
        'created_by' => $petugas->id,
    ]);

    $this->actingAs($petugas)
        ->get(route('baps.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/index')
            ->where('baps.data.0.id', $bap->id)
            ->where('baps.data.0.cancellation_count', 1)
            ->etc(),
        );
});

test('created BAP persists a document number from its Loket and service date, not its creation date', function () {
    $loket = Loket::factory()->create([
        'code' => 'SAMLING-01',
        'name' => 'SAMLING 01',
    ]);
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket);

    $this->travelTo('2026-09-03 10:15:00');

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload(serviceDate: '2026-09-02'))
        ->assertRedirect();

    $bap = Bap::query()->sole();

    expect($bap->document_number)->toBe('PB/SAMLING01/02/09/2026');
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap.created',
    ]);
    expect($bap->auditLogs()->where('event', 'bap.created')->sole()->new_values)
        ->toMatchArray(['document_number' => 'PB/SAMLING01/02/09/2026']);
});

test('document number uses fixed codes for Mall Pelayanan Publik and Loket utama', function () {
    $generator = app(GenerateBapDocumentNumber::class);
    $createdAt = now()->setDate(2026, 9, 3);

    expect($generator->handle(Loket::factory()->make([
        'code' => 'MPP',
        'name' => 'Mall Pelayanan Publik',
    ]), $createdAt))->toBe('PB/MPP/03/09/2026')
        ->and($generator->handle(Loket::factory()->make([
            'code' => 'SAMSAT-KANTOR',
            'name' => 'SAMSAT Kantor',
        ]), $createdAt))->toBe('PB/LOKET/03/09/2026');
});

test('store rejects a client supplied Loket, status, or total usage instead of trusting frontend fields', function () {
    $petugas = bapPetugas(Loket::factory()->create());
    $otherLoket = Loket::factory()->create();
    bapAllocation($petugas, $petugas->loket);

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), [
            ...bapPayload(),
            'loket_id' => $otherLoket->id,
            'status' => BapStatus::Submitted->value,
            'total_usage' => 999,
        ])
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['loket_id', 'status', 'total_usage']);

    $this->assertDatabaseCount('baps', 0);
});

test('BAP requires an accepted allocation for the same Loket and keeps leading zero input presentation', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    $pendingAllocation = bapAllocation($petugas, $loket);
    $pendingAllocation->update(['status' => SkpdAllocationStatus::Pending]);

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), bapPayload())
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors('numerator_start');

    bapAllocation($petugas, $loket);

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/create')
            ->where('expected_numerator_start', 582_608)
            ->where('allocations.0.numerator_start', 582_608)
            ->etc(),
        );
});

test('one Loket cannot create a second BAP for the same service date while its allocation still has numerators', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket);

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload(582_608, 582_610, 1))
        ->assertRedirect();

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), bapPayload(582_611, 582_620, 0))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['service_date' => CreateBap::SAME_DATE_MESSAGE]);

    $this->assertDatabaseCount('baps', 1);
});

test('BAP rejects reversed ranges, online usage above the total, and sequence gaps', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket);

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), bapPayload(582_620, 582_608, 0))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors('numerator_end');

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), bapPayload(582_608, 582_610, 4))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors('online_usage_count');

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload(582_608, 582_610, 1, now()->subDay()->toDateString()))
        ->assertRedirect();

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), bapPayload(582_615, 582_620, 0))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors('numerator_start');
});

test('Petugas Loket cannot view or submit a BAP from another Loket through direct HTTP requests', function () {
    $ownerLoket = Loket::factory()->create();
    $otherLoket = Loket::factory()->create();
    $owner = bapPetugas($ownerLoket, 'Pemilik BAP');
    $otherPetugas = bapPetugas($otherLoket, 'Petugas Lain');
    bapAllocation($owner, $ownerLoket);

    $this->actingAs($owner)
        ->post(route('baps.store'), bapPayload())
        ->assertRedirect();

    $bap = Bap::query()->sole();

    $this->actingAs($otherPetugas)
        ->get(route('baps.show', $bap))
        ->assertForbidden();

    $this->actingAs($otherPetugas)
        ->post(route('baps.submit', $bap))
        ->assertForbidden();

    $this->actingAs($otherPetugas)
        ->get(route('baps.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/index')
            ->where('baps.data', [])
            ->etc(),
        );
});

test('draft can be updated by its creator with new segments and audit but becomes read-only after submit', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket, 582_608, 582_620);

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload(582_608, 582_612, 2))
        ->assertRedirect();

    $bap = Bap::query()->sole();

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), bapPayload(582_608, 582_615, 3))
        ->assertRedirect(route('baps.show', $bap));

    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'numerator_end' => 582_615,
        'total_usage' => 8,
        'online_usage_count' => 3,
        'status' => BapStatus::Draft->value,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap.updated',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap_usage_segments.updated',
    ]);

    $this->actingAs($petugas)
        ->post(route('baps.submit', $bap))
        ->assertRedirect(route('baps.show', $bap));

    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'status' => BapStatus::Submitted->value,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap.submitted',
    ]);

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), bapPayload(582_608, 582_616, 3))
        ->assertForbidden();
});

test('dashboard serves actual BAP work within the Petugas Loket scope', function () {
    $this->travelTo('2026-11-09 03:00:00');

    $currentLoket = Loket::factory()->create(['name' => 'Loket Sendiri']);
    $otherLoket = Loket::factory()->create(['name' => 'Loket Lain']);
    $petugas = bapPetugas($currentLoket);
    $otherPetugas = bapPetugas($otherLoket);
    bapAllocation($petugas, $currentLoket);
    bapAllocation($otherPetugas, $otherLoket, 582_621, 582_633);

    $this->actingAs($petugas)
        ->post(route('baps.store'), bapPayload())
        ->assertRedirect();
    $this->actingAs($otherPetugas)
        ->post(route('baps.store'), bapPayload(582_621, 582_633))
        ->assertRedirect();

    $currentBap = Bap::query()->where('loket_id', $currentLoket->id)->sole();

    $this->actingAs($petugas)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.metrics.0.value', 1)
            ->where('dashboard.recentBaps.0.id', $currentBap->id)
            ->missing('dashboard.recentBaps.1')
            ->etc(),
        );
});

test('database unique constraint rejects a duplicate document number during a race', function () {
    $loket = Loket::factory()->create();
    $creator = bapPetugas($loket);

    Bap::factory()->create([
        'document_number' => 'PB/MPP/09/11/2026',
        'loket_id' => $loket->id,
        'service_date' => '2026-11-09',
        'numerator_start' => 700_000,
        'numerator_end' => 700_009,
        'total_usage' => 10,
        'created_by' => $creator->id,
    ]);

    expect(fn () => Bap::factory()->create([
        'document_number' => 'PB/MPP/09/11/2026',
        'loket_id' => $loket->id,
        'service_date' => '2026-11-10',
        'numerator_start' => 700_010,
        'numerator_end' => 700_019,
        'total_usage' => 10,
        'created_by' => $creator->id,
    ]))->toThrow(QueryException::class);

    $this->assertDatabaseCount('baps', 1);
    $this->assertDatabaseCount('audit_logs', 0);
});

test('a draft BAP followed by a later Loket BAP cannot be deleted so the numerator chain has no gap', function () {
    $loket = Loket::factory()->create();
    $petugas = bapPetugas($loket);
    bapAllocation($petugas, $loket);

    $this->actingAs($petugas)->post(route('baps.store'), bapPayload(582_608, 582_610, 0, now()->subDay()->toDateString()));
    $this->actingAs($petugas)->post(route('baps.store'), bapPayload(582_611, 582_615, 0));
    [$earlierDraft, $tailDraft] = Bap::query()->orderBy('id')->get()->all();

    $this->actingAs($petugas)
        ->get(route('baps.show', $earlierDraft))
        ->assertInertia(fn (Assert $page) => $page->where('bap.can.delete', false)->etc());
    $this->actingAs($petugas)
        ->get(route('baps.show', $tailDraft))
        ->assertInertia(fn (Assert $page) => $page->where('bap.can.delete', true)->etc());

    $this->actingAs($petugas)
        ->from(route('baps.show', $earlierDraft))
        ->delete(route('baps.destroy', $earlierDraft))
        ->assertRedirect(route('baps.show', $earlierDraft))
        ->assertSessionHasErrors(['bap' => 'Draft BAP tidak dapat dihapus karena sudah ada BAP Loket berikutnya. Hapus dimulai dari BAP paling akhir agar urutan Nomerator tidak berlubang.']);

    $this->assertModelExists($earlierDraft);
    $this->assertDatabaseCount('bap_usage_segments', 2);
});
