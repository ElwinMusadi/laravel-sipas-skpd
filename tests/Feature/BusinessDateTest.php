<?php

use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * 23:30 UTC on 9 November is already 07:30 WITA on 10 November in Kupang.
 */
beforeEach(function () {
    $this->travelTo('2026-11-09 23:30:00');
});

function businessDatePetugas(): User
{
    $loket = Loket::factory()->create();
    $petugas = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-WITA',
        'numerator_start' => 590_000,
        'numerator_end' => 590_099,
        'total_sets' => 100,
    ]);
    SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => 590_000,
        'numerator_end' => 590_099,
        'quantity' => 100,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => now()->subDay(),
    ]);

    return $petugas;
}

test('early morning in Kupang a Loket can file a BAP for the local date and the form defaults to it', function () {
    $petugas = businessDatePetugas();

    $this->actingAs($petugas)
        ->get(route('baps.create'))
        ->assertInertia(fn (Assert $page) => $page->where('default_service_date', '2026-11-10'));

    $this->actingAs($petugas)
        ->post(route('baps.store'), [
            'service_date' => '2026-11-10',
            'numerator_start' => '0590000',
            'numerator_end' => '0590009',
            'online_usage_count' => 0,
            'cancellation_count' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect(Bap::query()->sole()->service_date->toDateString())->toBe('2026-11-10');
});

test('a service date after the local date in Kupang is still rejected', function () {
    $petugas = businessDatePetugas();

    $this->actingAs($petugas)
        ->post(route('baps.store'), [
            'service_date' => '2026-11-11',
            'numerator_start' => '0590000',
            'numerator_end' => '0590009',
            'online_usage_count' => 0,
            'cancellation_count' => 0,
        ])
        ->assertSessionHasErrors('service_date');

    $this->assertDatabaseCount('baps', 0);
});

test('the dashboard counts BAPs of the local date as today', function () {
    $petugas = businessDatePetugas();
    Bap::factory()->create(['loket_id' => $petugas->loket_id, 'service_date' => '2026-11-10']);
    Bap::factory()->create(['loket_id' => $petugas->loket_id, 'service_date' => '2026-11-09']);

    $this->actingAs($petugas)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('dashboard.metrics.0.value', 1)->etc());
});

test('Buku Kendali and Laporan Pemakaian default to the local date and month', function () {
    $bendahara = User::factory()->create(['role' => UserRole::BendaharaBarang]);

    $this->actingAs($bendahara)
        ->get(route('buku-kendali.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.start_date', '2026-11-01')
            ->where('filters.end_date', '2026-11-10')
            ->etc());

    $this->travelTo('2026-11-30 17:00:00');

    $this->actingAs($bendahara)
        ->get(route('laporan-pemakaian.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.month', 12)
            ->where('filters.year', 2026)
            ->etc());
});
