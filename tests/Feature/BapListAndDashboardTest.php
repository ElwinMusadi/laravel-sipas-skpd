<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

test('the BAP list can be searched by document number', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $wanted = Bap::factory()->create(['document_number' => 'PB/MPP/09/11/2026-2']);
    Bap::factory()->create(['document_number' => 'PB/LOKET/08/11/2026']);

    $this->actingAs($superadmin)
        ->get(route('baps.index', ['search' => '09/11/2026-2']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/index')
            ->has('baps.data', 1)
            ->where('baps.data.0.id', $wanted->id));
});

test('the dashboard lists recent BAPs with their real status', function () {
    $loket = Loket::factory()->create();
    $petugas = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);
    Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => '2026-11-09',
        'status' => BapStatus::Completed,
    ]);

    $this->actingAs($petugas)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.recentBaps.0.status', 'completed')
            ->etc());
});

test('the Batal/Rusak history can be searched by BAP document number', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $wanted = Bap::factory()->create(['document_number' => 'PB/MPP/09/11/2026']);
    $other = Bap::factory()->create(['document_number' => 'PB/LOKET/08/11/2026']);
    $wantedCancellation = BapCancellation::create([
        'bap_id' => $wanted->id,
        'numerator' => $wanted->numerator_start,
        'reason' => BapCancellationReason::PrinterError,
        'created_by' => $superadmin->id,
    ]);
    BapCancellation::create([
        'bap_id' => $other->id,
        'numerator' => $other->numerator_start,
        'reason' => BapCancellationReason::PrinterError,
        'created_by' => $superadmin->id,
    ]);

    $this->actingAs($superadmin)
        ->get(route('bap-cancellations.index', ['search' => 'PB/MPP/09']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('cancellations.data', 1)
            ->where('cancellations.data.0.id', $wantedCancellation->id)
            ->etc());
});
