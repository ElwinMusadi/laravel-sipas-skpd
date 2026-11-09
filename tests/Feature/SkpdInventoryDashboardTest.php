<?php

use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Box A (100 sets) is split across two Lokets: 40 accepted by Loket Utama with
 * 15 used, and 10 pending for Loket Corner. Box B (50 sets) is untouched.
 *
 * @return array{bendahara: User, petugas: User}
 */
function inventoryDashboardFixture(): array
{
    $bendahara = User::factory()->create(['role' => UserRole::BendaharaBarang]);
    $mainLoket = Loket::factory()->create(['name' => 'Loket Utama']);
    $cornerLoket = Loket::factory()->create(['name' => 'Loket Corner']);
    $petugas = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $mainLoket->id]);
    $boxA = SkpdBox::factory()->create([
        'box_number' => 'BOX-A',
        'numerator_start' => 800_000,
        'numerator_end' => 800_099,
        'total_sets' => 100,
        'received_at' => now()->subDays(2),
    ]);
    SkpdBox::factory()->create([
        'box_number' => 'BOX-B',
        'numerator_start' => 900_000,
        'numerator_end' => 900_049,
        'total_sets' => 50,
        'received_at' => now()->subDays(5),
    ]);
    $accepted = SkpdAllocation::factory()->create([
        'skpd_box_id' => $boxA->id,
        'loket_id' => $mainLoket->id,
        'numerator_start' => 800_000,
        'numerator_end' => 800_039,
        'quantity' => 40,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => now()->subDay(),
    ]);
    SkpdAllocation::factory()->create([
        'skpd_box_id' => $boxA->id,
        'loket_id' => $cornerLoket->id,
        'numerator_start' => 800_040,
        'numerator_end' => 800_049,
        'quantity' => 10,
        'status' => SkpdAllocationStatus::Pending,
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $mainLoket->id,
        'numerator_start' => 800_000,
        'numerator_end' => 800_014,
        'total_usage' => 15,
    ]);
    BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $accepted->id,
        'numerator_start' => 800_000,
        'numerator_end' => 800_014,
        'quantity' => 15,
    ]);

    return compact('bendahara', 'petugas');
}

test('the central inventory dashboard aggregates boxes, allocations, and usage', function () {
    ['bendahara' => $bendahara] = inventoryDashboardFixture();

    $this->actingAs($bendahara)
        ->get(route('skpd.inventory.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('scope', 'central')
            ->where('metrics.total_boxes', 2)
            ->where('metrics.total_inventory', 135)
            ->where('metrics.available_quantity', 100)
            ->where('metrics.allocated_quantity', 40)
            ->where('metrics.used_quantity', 15)
            ->where('metrics.pending_allocations', 1)
            ->where('metrics.active_allocations', 1)
            ->where('metrics.nearly_depleted_boxes', 0)
            ->where('recent_boxes.0.box_number', 'BOX-A')
            ->where('recent_boxes.0.pending_quantity', 10)
            ->where('recent_boxes.0.allocated_quantity', 40)
            ->where('recent_boxes.0.used_quantity', 15)
            ->where('recent_boxes.0.available_quantity', 50)
            ->where('recent_boxes.0.status', 'partially_allocated')
            ->where('recent_boxes.0.loket.name', 'Loket Utama')
            ->where('recent_boxes.1.box_number', 'BOX-B')
            ->where('recent_boxes.1.status', 'available')
            ->where('recent_boxes.1.loket', null));
});

test('the Loket inventory dashboard sums usage of its held allocations', function () {
    ['petugas' => $petugas] = inventoryDashboardFixture();

    $this->actingAs($petugas)
        ->get(route('skpd.inventory.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('scope', 'loket')
            ->where('metrics.received_quantity', 40)
            ->where('metrics.used_quantity', 15)
            ->where('metrics.remaining_quantity', 25)
            ->where('metrics.pending_allocations', 0)
            ->etc());
});
