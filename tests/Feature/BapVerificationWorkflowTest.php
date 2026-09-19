<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

function phaseEightVerifier(string $name = 'Petugas Penetapan'): User
{
    return User::factory()->create([
        'name' => $name,
        'role' => UserRole::PetugasPenetapan,
    ]);
}

function phaseEightSubmittedBap(
    ?User $petugas = null,
    int $numeratorStart = 582_608,
    int $numeratorEnd = 582_620,
    int $onlineUsageCount = 5,
): Bap {
    $loket = Loket::factory()->create(['name' => 'SAMSAT Corner']);
    $petugas ??= User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-PHASE-08-'.fake()->unique()->bothify('####??'),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => $numeratorEnd - $numeratorStart + 1,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $numeratorEnd - $numeratorStart + 1,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => now(),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => now()->toDateString(),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => $numeratorEnd - $numeratorStart + 1,
        'online_usage_count' => $onlineUsageCount,
        'status' => BapStatus::Submitted,
        'created_by' => $petugas->id,
        'submitted_at' => now()->subMinutes(30),
    ]);

    BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $bap->total_usage,
    ]);

    return $bap;
}

function phaseEightStartVerification(User $verifier, Bap $bap): BapVerification
{
    test()->actingAs($verifier)
        ->post(route('bap-verifications.start', $bap))
        ->assertRedirect(route('bap-verifications.show', $bap));

    return BapVerification::query()->sole();
}

/**
 * @return array{
 *     result: string,
 *     notes: string,
 *     checklist: list<array<string, int|bool|string>>,
 *     discrepancies: list<array{type: string, notes: string}>
 * }
 */
function phaseEightCompletionPayload(Bap $bap): array
{
    return [
        'result' => BapVerificationResult::Passed->value,
        'notes' => 'Seluruh pemeriksaan fisik telah dilakukan.',
        'checklist' => [
            [
                'type' => BapVerificationChecklistType::UsageQuantity->value,
                'is_attested' => true,
                'actual_quantity' => $bap->total_usage,
            ],
            [
                'type' => BapVerificationChecklistType::Numerator->value,
                'is_attested' => true,
                'actual_numerator_start' => $bap->numerator_start,
                'actual_numerator_end' => $bap->numerator_end,
            ],
            [
                'type' => BapVerificationChecklistType::TindisanSets->value,
                'is_attested' => true,
                'actual_quantity' => $bap->total_usage,
            ],
            [
                'type' => BapVerificationChecklistType::Cancellation->value,
                'is_attested' => true,
                'actual_quantity' => $bap->cancellations()->count(),
            ],
            [
                'type' => BapVerificationChecklistType::Online->value,
                'is_attested' => true,
                'actual_quantity' => $bap->online_usage_count,
            ],
        ],
        'discrepancies' => [],
    ];
}

test('Petugas Penetapan sees only submitted and active BAP records in the Phase 1 queue', function () {
    $verifier = phaseEightVerifier();
    $submittedBap = phaseEightSubmittedBap();
    $draftBap = phaseEightSubmittedBap(numeratorStart: 582_700, numeratorEnd: 582_712);
    $draftBap->update(['status' => BapStatus::Draft, 'submitted_at' => null]);

    $this->actingAs($verifier)
        ->get(route('bap-verifications.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-verifications/index')
            ->where('baps.data.0.id', $submittedBap->id)
            ->missing('baps.data.1')
            ->etc(),
        );
});

test('Petugas Penetapan can start a submitted BAP verification with an audit trail', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();

    $verification = phaseEightStartVerification($verifier, $bap);

    expect($verification->status)->toBe(BapVerificationStatus::InProgress)
        ->and($verification->verifier_id)->toBe($verifier->id);
    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'status' => BapStatus::UnderVerification->value,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap_verification.phase_1_started',
    ]);
});

test('BAP detail hides Loket actions and rejects direct mutations after Phase 1 starts', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    $petugas = User::query()->findOrFail($bap->created_by);

    phaseEightStartVerification($verifier, $bap);

    $this->actingAs($petugas)
        ->get(route('baps.show', $bap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.status', BapStatus::UnderVerification->value)
            ->where('bap.can.edit', false)
            ->where('bap.can.submit', false)
            ->where('bap.can.delete', false)
            ->etc(),
        );

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), [
            'service_date' => now()->toDateString(),
            'numerator_start' => '0582608',
            'numerator_end' => '0582620',
            'online_usage_count' => 5,
            'cancellation_count' => 0,
        ])
        ->assertForbidden();

    $this->actingAs($petugas)
        ->post(route('baps.submit', $bap))
        ->assertForbidden();

    $this->actingAs($petugas)
        ->delete(route('baps.destroy', $bap))
        ->assertForbidden();

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), [
            'service_date' => now()->toDateString(),
            'numerator_start' => '0582608',
            'numerator_end' => '0582620',
            'online_usage_count' => 5,
            'cancellation_count' => 1,
            'cancellations' => [
                ['numerator' => '0582612', 'reason' => BapCancellationReason::PrinterError->value, 'description' => ''],
            ],
        ])
        ->assertForbidden();
});

test('Petugas Penetapan can view BAP source data, segments, and cancellation numbers before completing verification', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_612,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Cetakan rusak.',
        'created_by' => $bap->created_by,
    ]);

    $this->actingAs($verifier)
        ->get(route('bap-verifications.show', $bap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-verifications/show')
            ->where('bap.numerator_start', 582_608)
            ->where('bap.numerator_end', 582_620)
            ->where('bap.total_usage', 13)
            ->where('bap.online_usage_count', 5)
            ->where('bap.segments.0.quantity', 13)
            ->where('bap.cancellations.0.numerator', 582_612)
            ->where('checklist.3.expected_quantity', 1)
            ->etc(),
        );
});

test('a complete matching checklist passes Phase 1 without changing BAP source data', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $source = $bap->only(['numerator_start', 'numerator_end', 'total_usage', 'online_usage_count']);

    $this->actingAs($verifier)
        ->post(route('bap-verifications.complete', $bap), phaseEightCompletionPayload($bap))
        ->assertRedirect(route('bap-verifications.show', $bap));

    $verification = BapVerification::query()->sole();

    expect($verification->refresh()->status)->toBe(BapVerificationStatus::Completed)
        ->and($verification->result)->toBe(BapVerificationResult::Passed)
        ->and($bap->refresh()->status)->toBe(BapStatus::WaitingVerificationPhase2)
        ->and($bap->only(['numerator_start', 'numerator_end', 'total_usage', 'online_usage_count']))->toBe($source);
    $this->assertDatabaseCount('bap_verification_checklist_items', 5);
    $this->assertDatabaseCount('bap_verification_discrepancies', 0);
    $this->assertDatabaseCount('bap_clarification_requests', 0);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_id' => $bap->id,
        'event' => 'bap_verification.phase_1_passed',
    ]);
});

test('a physical mismatch records a structured discrepancy and sends the BAP to clarification', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $payload = phaseEightCompletionPayload($bap);
    $payload['result'] = BapVerificationResult::Discrepancy->value;
    $payload['checklist'][2]['actual_quantity'] = 12;
    $payload['discrepancies'] = [[
        'type' => BapVerificationChecklistType::TindisanSets->value,
        'notes' => 'Tindisan nomerator 0582615 belum ditemukan.',
    ]];

    $this->actingAs($verifier)
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap));

    $verification = BapVerification::query()->sole();

    expect($verification->refresh()->result)->toBe(BapVerificationResult::Discrepancy)
        ->and($bap->refresh()->status)->toBe(BapStatus::NeedsClarification);
    $this->assertDatabaseHas('bap_verification_checklist_items', [
        'bap_verification_id' => $verification->id,
        'type' => BapVerificationChecklistType::TindisanSets->value,
        'expected_quantity' => 13,
        'actual_quantity' => 12,
        'quantity_difference' => -1,
    ]);
    $this->assertDatabaseHas('bap_verification_discrepancies', [
        'bap_verification_id' => $verification->id,
        'type' => BapVerificationChecklistType::TindisanSets->value,
        'expected_value' => '13',
        'actual_value' => '12',
        'difference' => -1,
    ]);
    $this->assertDatabaseHas('bap_clarification_requests', [
        'bap_id' => $bap->id,
        'bap_verification_id' => $verification->id,
        'requested_by' => $verifier->id,
        'status' => 'waiting_response',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_id' => $bap->id,
        'event' => 'bap_verification.phase_1_sent_to_clarification',
    ]);
});

test('a verifier cannot pass a checklist that contains a physical mismatch', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $payload = phaseEightCompletionPayload($bap);
    $payload['checklist'][4]['actual_quantity'] = 4;

    $this->actingAs($verifier)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors([
            'result' => 'Hasil lulus tidak dapat dipilih ketika masih ada nilai fisik yang berbeda dari sistem.',
        ]);

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerification);
    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('a discrepancy result requires one verifier note for every detected discrepancy', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $payload = phaseEightCompletionPayload($bap);
    $payload['result'] = BapVerificationResult::Discrepancy->value;
    $payload['checklist'][1]['actual_numerator_end'] = 582_619;

    $this->actingAs($verifier)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors('discrepancies');

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerification);
    $this->assertDatabaseCount('bap_verification_discrepancies', 0);
});

test('roles outside Petugas Penetapan cannot access or start Phase 1 verification through direct HTTP requests', function (UserRole $role) {
    $bap = phaseEightSubmittedBap();
    $actor = User::factory()->create(['role' => $role]);

    $this->actingAs($actor)
        ->get(route('bap-verifications.index'))
        ->assertForbidden();

    $this->actingAs($actor)
        ->post(route('bap-verifications.start', $bap))
        ->assertForbidden();

    $this->assertDatabaseCount('bap_verifications', 0);
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Bendahara Barang' => UserRole::BendaharaBarang,
]);

test('Petugas Penetapan cannot start verification for a draft BAP through a direct HTTP request', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    $bap->update(['status' => BapStatus::Draft, 'submitted_at' => null]);

    $this->actingAs($verifier)
        ->post(route('bap-verifications.start', $bap))
        ->assertForbidden();

    $this->assertDatabaseCount('bap_verifications', 0);
});

test('only the verifier who started a BAP can complete it', function () {
    $starter = phaseEightVerifier('Verifier Awal');
    $otherVerifier = phaseEightVerifier('Verifier Lain');
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($starter, $bap);

    $this->actingAs($otherVerifier)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), phaseEightCompletionPayload($bap))
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors('bap');

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerification);
    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('a duplicate completion receives a state conflict and cannot create a second result', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $payload = phaseEightCompletionPayload($bap);

    $this->actingAs($verifier)
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap));

    $this->actingAs($verifier)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors('status');

    $this->assertDatabaseCount('bap_verifications', 1);
    $this->assertDatabaseCount('bap_verification_checklist_items', 5);
});

test('the verification endpoint rejects source BAP fields supplied by the client', function () {
    $verifier = phaseEightVerifier();
    $bap = phaseEightSubmittedBap();
    phaseEightStartVerification($verifier, $bap);
    $payload = phaseEightCompletionPayload($bap);
    $payload['total_usage'] = 12;
    $payload['online_usage_count'] = 4;
    $payload['numerator_end'] = 582_619;

    $this->actingAs($verifier)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors(['total_usage', 'online_usage_count', 'numerator_end']);

    expect($bap->refresh()->total_usage)->toBe(13)
        ->and($bap->online_usage_count)->toBe(5)
        ->and($bap->numerator_end)->toBe(582_620);
});
