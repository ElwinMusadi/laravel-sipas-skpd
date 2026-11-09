<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Illuminate\Database\QueryException;
use Inertia\Testing\AssertableInertia as Assert;

function historicalCancellationPetugas(Loket $loket): User
{
    return User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
}

/**
 * @return array{bap: Bap, cancellation: BapCancellation}
 */
function historicalCancellationFixture(User $petugas, Loket $loket): array
{
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'created_by' => $petugas->id,
        'service_date' => now()->toDateString(),
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'total_usage' => 13,
        'online_usage_count' => 0,
        'status' => BapStatus::Draft,
    ]);

    $cancellation = BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_612,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Cetakan historis tidak dapat digunakan.',
        'created_by' => $petugas->id,
    ]);

    return compact('bap', 'cancellation');
}

test('historical cancellation is listed read-only with its parent BAP context', function () {
    $loket = Loket::factory()->create();
    $petugas = historicalCancellationPetugas($loket);
    ['bap' => $bap, 'cancellation' => $cancellation] = historicalCancellationFixture($petugas, $loket);

    $this->actingAs($petugas)
        ->get(route('bap-cancellations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-cancellations/index')
            ->where('cancellations.data.0.id', $cancellation->id)
            ->where('cancellations.data.0.reason_label', 'Rusak')
            ->where('cancellations.data.0.bap_document_number', $bap->document_number)
            ->where('reasons', [
                ['value' => 'cancelled', 'label' => 'Batal'],
                ['value' => 'damaged', 'label' => 'Rusak'],
                ['value' => 'network_error', 'label' => 'Jaringan Error'],
                ['value' => 'printer_error', 'label' => 'Printer Error'],
                ['value' => 'custom', 'label' => 'Isi Sendiri'],
            ])
            ->etc(),
        );

    $this->actingAs($petugas)
        ->get(route('bap-cancellations.show', $cancellation))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-cancellations/show')
            ->where('cancellation.id', $cancellation->id)
            ->where('cancellation.reason_label', 'Rusak')
            ->where('cancellation.bap.document_number', $bap->document_number)
            ->etc(),
        );
});

test('historical cancellations preserve legacy reason values while new reasons remain castable', function () {
    $loket = Loket::factory()->create();
    $petugas = historicalCancellationPetugas($loket);
    ['bap' => $bap, 'cancellation' => $legacy] = historicalCancellationFixture($petugas, $loket);

    $newReason = BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_613,
        'reason' => BapCancellationReason::PrinterError,
        'description' => null,
        'created_by' => $petugas->id,
    ]);

    expect($legacy->refresh()->reason)->toBe(BapCancellationReason::Damaged)
        ->and($legacy->reason->label())->toBe('Rusak')
        ->and($newReason->refresh()->reason)->toBe(BapCancellationReason::PrinterError)
        ->and($newReason->reason->label())->toBe('Printer Error');
});

test('cancellation numerator remains globally unique for historical integrity', function () {
    $loket = Loket::factory()->create();
    $petugas = historicalCancellationPetugas($loket);
    ['bap' => $bap, 'cancellation' => $cancellation] = historicalCancellationFixture($petugas, $loket);

    expect(fn () => BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => $cancellation->numerator,
        'reason' => BapCancellationReason::NetworkError,
        'created_by' => $petugas->id,
    ]))->toThrow(QueryException::class);
});

test('standalone cancellation routes are read-only and BAP mutation remains unified', function () {
    $loket = Loket::factory()->create();
    $petugas = historicalCancellationPetugas($loket);
    ['bap' => $bap] = historicalCancellationFixture($petugas, $loket);

    $this->actingAs($petugas)
        ->post("/baps/{$bap->id}/cancellations", [
            'numerator' => '0582613',
            'reason' => BapCancellationReason::NetworkError->value,
        ])
        ->assertNotFound();

    $this->assertDatabaseCount('bap_cancellations', 1);
});
