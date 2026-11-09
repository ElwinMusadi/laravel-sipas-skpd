<?php

use App\Actions\SkpdInventory\CreateBap;
use App\Models\AuditLog;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-11-10 03:00:00');
});

/**
 * @return array{bendahara: User, petugas: User, loket: Loket, box: SkpdBox, allocation: SkpdAllocation}
 */
function remainderAcceptedAllocation(): array
{
    $bendahara = User::factory()->create(['role' => UserRole::BendaharaBarang]);
    $loket = Loket::factory()->create();
    $petugas = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-SISA-001',
        'numerator_start' => 700_000,
        'numerator_end' => 700_099,
        'total_sets' => 100,
        'created_by' => $bendahara->id,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'allocation_date' => '2026-11-01',
        'numerator_start' => 700_000,
        'numerator_end' => 700_049,
        'quantity' => 50,
        'status' => SkpdAllocationStatus::Accepted,
        'created_by' => $bendahara->id,
        'accepted_by' => $petugas->id,
        'accepted_at' => now()->subWeek(),
    ]);

    return compact('bendahara', 'petugas', 'loket', 'box', 'allocation');
}

test('Bendahara Barang returns the unused tail of a partly used allocation and the freed range can be allocated again', function () {
    ['bendahara' => $bendahara, 'petugas' => $petugas, 'loket' => $loket, 'box' => $box, 'allocation' => $allocation] = remainderAcceptedAllocation();
    app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse('2026-11-09'), 700_000, 700_019);

    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.return-remainder', $allocation), ['reason' => 'Loket ditutup sementara untuk renovasi.'])
        ->assertRedirect(route('skpd.allocations.show', $allocation))
        ->assertSessionHasNoErrors();

    $allocation->refresh();
    $audit = AuditLog::query()->where('event', 'skpd_allocation.remainder_returned')->sole();

    expect([$allocation->numerator_start, $allocation->numerator_end, $allocation->quantity])->toBe([700_000, 700_019, 20])
        ->and($allocation->status)->toBe(SkpdAllocationStatus::Completed)
        ->and($audit->actor_id)->toBe($bendahara->id)
        ->and($audit->old_values)->toEqual(['numerator_start' => 700_000, 'numerator_end' => 700_049, 'quantity' => 50, 'status' => 'accepted'])
        ->and($audit->new_values['returned_numerator_start'])->toBe(700_020)
        ->and($audit->new_values['returned_numerator_end'])->toBe(700_049)
        ->and($audit->new_values['returned_quantity'])->toBe(30)
        ->and($audit->new_values['reason'])->toBe('Loket ditutup sementara untuk renovasi.')
        ->and($box->refresh()->availableQuantity())->toBe(80);

    $otherLoket = Loket::factory()->create();
    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $otherLoket->id,
            'allocation_date' => '2026-11-10',
            'numerator_start' => '0700020',
            'numerator_end' => '0700049',
        ])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('skpd_allocations', ['loket_id' => $otherLoket->id, 'numerator_start' => 700_020, 'status' => 'pending']);
});

test('an unused accepted allocation is returned whole and keeps its range for history', function () {
    ['bendahara' => $bendahara, 'allocation' => $allocation, 'box' => $box] = remainderAcceptedAllocation();

    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.return-remainder', $allocation), ['reason' => 'Alokasi salah Loket, ditarik kembali.'])
        ->assertSessionHasNoErrors();

    $allocation->refresh();

    expect($allocation->status)->toBe(SkpdAllocationStatus::Returned)
        ->and([$allocation->numerator_start, $allocation->numerator_end, $allocation->quantity])->toBe([700_000, 700_049, 50])
        ->and($box->refresh()->availableQuantity())->toBe(100);
});

test('numerators already recorded in a draft BAP stay with the Loket when the remainder is returned', function () {
    ['bendahara' => $bendahara, 'petugas' => $petugas, 'loket' => $loket, 'allocation' => $allocation] = remainderAcceptedAllocation();
    app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse('2026-11-09'), 700_000, 700_009);
    app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse('2026-11-10'), 700_010, 700_014);

    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.return-remainder', $allocation), ['reason' => 'Sisa ditarik untuk Loket lain.'])
        ->assertSessionHasNoErrors();

    expect($allocation->refresh()->numerator_end)->toBe(700_014)
        ->and($allocation->quantity)->toBe(15);
});

test('returning a remainder requires a reason and is forbidden to other roles and to non-accepted allocations', function () {
    ['bendahara' => $bendahara, 'petugas' => $petugas, 'allocation' => $allocation] = remainderAcceptedAllocation();

    $this->actingAs($bendahara)
        ->from(route('skpd.allocations.show', $allocation))
        ->post(route('skpd.allocations.return-remainder', $allocation), ['reason' => ' '])
        ->assertSessionHasErrors(['reason' => 'Alasan pengembalian wajib diisi.']);

    $this->actingAs($petugas)
        ->post(route('skpd.allocations.return-remainder', $allocation), ['reason' => 'Petugas mencoba menarik sisa.'])
        ->assertForbidden();

    $pendingAllocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $allocation->skpd_box_id,
        'loket_id' => $allocation->loket_id,
        'numerator_start' => 700_050,
        'numerator_end' => 700_059,
        'quantity' => 10,
        'status' => SkpdAllocationStatus::Pending,
        'created_by' => $bendahara->id,
    ]);

    $this->actingAs($bendahara)
        ->post(route('skpd.allocations.return-remainder', $pendingAllocation), ['reason' => 'Mencoba alokasi yang masih pending.'])
        ->assertForbidden();

    expect($allocation->refresh()->status)->toBe(SkpdAllocationStatus::Accepted)
        ->and($allocation->numerator_end)->toBe(700_049);
    $this->assertDatabaseMissing('audit_logs', ['event' => 'skpd_allocation.remainder_returned']);
});

test('the allocation page offers the return only to Bendahara Barang while numerators remain', function () {
    ['bendahara' => $bendahara, 'petugas' => $petugas, 'allocation' => $allocation] = remainderAcceptedAllocation();

    $this->actingAs($bendahara)
        ->get(route('skpd.allocations.show', $allocation))
        ->assertInertia(fn (Assert $page) => $page->where('allocation.can.return_remainder', true)->etc());
    $this->actingAs($petugas)
        ->get(route('skpd.allocations.show', $allocation))
        ->assertInertia(fn (Assert $page) => $page->where('allocation.can.return_remainder', false)->etc());
});
