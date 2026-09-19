<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
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

function phaseNineVerifier(string $name = 'Petugas Verifikasi'): User
{
    return User::factory()->create([
        'name' => $name,
        'role' => UserRole::PetugasVerifikasi,
    ]);
}

function phaseNineWaitingBap(
    bool $hasPassedPhaseOne = true,
    int $numeratorStart = 582_608,
    int $numeratorEnd = 582_620,
    int $onlineUsageCount = 5,
): Bap {
    $loket = Loket::factory()->create(['name' => 'SAMSAT Corner']);
    $petugasLoket = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-PHASE-09-'.fake()->unique()->bothify('####??'),
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
        'accepted_by' => $petugasLoket->id,
        'accepted_at' => now(),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => now()->toDateString(),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => $numeratorEnd - $numeratorStart + 1,
        'online_usage_count' => $onlineUsageCount,
        'status' => BapStatus::WaitingVerificationPhase2,
        'created_by' => $petugasLoket->id,
        'submitted_at' => now()->subHour(),
    ]);

    BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => $bap->total_usage,
    ]);

    if ($hasPassedPhaseOne) {
        $phaseOneVerifier = User::factory()->create([
            'name' => 'Petugas Penetapan',
            'role' => UserRole::PetugasPenetapan,
        ]);

        BapVerification::factory()
            ->completed(BapVerificationResult::Passed)
            ->create([
                'bap_id' => $bap->id,
                'verifier_id' => $phaseOneVerifier->id,
                'stage' => BapVerificationStage::Phase1,
                'started_at' => now()->subMinutes(45),
                'completed_at' => now()->subMinutes(30),
            ]);
    }

    return $bap;
}

function phaseNineStartVerification(User $verifier, Bap $bap): BapVerification
{
    test()->actingAs($verifier)
        ->post(route('bap-verifications-phase-2.start', $bap))
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap));

    return BapVerification::query()
        ->where('stage', BapVerificationStage::Phase2)
        ->sole();
}

/**
 * @return array{
 *     result: string,
 *     notes: string,
 *     checklist: list<array<string, int|bool|string>>,
 *     discrepancies: list<array{type: string, notes: string}>
 * }
 */
function phaseNineCompletionPayload(Bap $bap): array
{
    return [
        'result' => BapVerificationResult::Passed->value,
        'notes' => 'Pemeriksaan fisik Tahap 2 telah dilakukan.',
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

test('Petugas Verifikasi sees only BAP records that passed Phase 1 in the Phase 2 queue', function () {
    $verifier = phaseNineVerifier();
    $waitingBap = phaseNineWaitingBap();
    $withoutPhaseOne = phaseNineWaitingBap(hasPassedPhaseOne: false, numeratorStart: 582_700, numeratorEnd: 582_712);
    $submittedBap = phaseNineWaitingBap(numeratorStart: 582_800, numeratorEnd: 582_812);
    $submittedBap->update(['status' => BapStatus::Submitted]);
    $clarificationBap = phaseNineWaitingBap(numeratorStart: 582_900, numeratorEnd: 582_912);
    $clarificationBap->update(['status' => BapStatus::NeedsClarification]);

    $this->actingAs($verifier)
        ->get(route('bap-verifications-phase-2.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-verifications/index')
            ->where('verification_stage.value', BapVerificationStage::Phase2->value)
            ->where('baps.data.0.id', $waitingBap->id)
            ->where('baps.data.0.phase_one_verification.result', BapVerificationResult::Passed->value)
            ->missing('baps.data.1')
            ->etc(),
        );

    expect($withoutPhaseOne->id)->not->toBe($waitingBap->id);
});

test('Petugas Verifikasi can view Phase 1 history, source data, and cancellations before Phase 2', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_612,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Cetakan rusak.',
        'created_by' => $bap->created_by,
    ]);

    $this->actingAs($verifier)
        ->get(route('bap-verifications-phase-2.show', $bap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-verifications/show')
            ->where('verification_stage.value', BapVerificationStage::Phase2->value)
            ->where('bap.numerator_start', 582_608)
            ->where('bap.segments.0.quantity', 13)
            ->where('bap.cancellations.0.numerator', 582_612)
            ->where('checklist.3.expected_quantity', 1)
            ->where('phase_one_verification.verifier', 'Petugas Penetapan')
            ->where('phase_one_verification.result', BapVerificationResult::Passed->value)
            ->etc(),
        );
});

test('Petugas Verifikasi can start Phase 2 with an audit trail', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();

    $verification = phaseNineStartVerification($verifier, $bap);

    expect($verification->status)->toBe(BapVerificationStatus::InProgress)
        ->and($verification->stage)->toBe(BapVerificationStage::Phase2)
        ->and($verification->verifier_id)->toBe($verifier->id);
    $this->assertDatabaseHas('baps', [
        'id' => $bap->id,
        'status' => BapStatus::UnderVerificationPhase2->value,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $bap->id,
        'event' => 'bap_verification.phase_2_started',
    ]);
});

test('Phase 2 start rejects a BAP without a passed Phase 1 result', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap(hasPassedPhaseOne: false);

    $this->actingAs($verifier)
        ->from(route('bap-verifications-phase-2.show', $bap))
        ->post(route('bap-verifications-phase-2.start', $bap))
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasErrors('bap');

    expect($bap->refresh()->status)->toBe(BapStatus::WaitingVerificationPhase2);
    $this->assertDatabaseCount('bap_verifications', 0);
});

test('a complete matching checklist passes Phase 2 without changing source data', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    $cancellation = BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => 582_612,
        'reason' => BapCancellationReason::Cancelled,
        'created_by' => $bap->created_by,
    ]);
    phaseNineStartVerification($verifier, $bap);
    $source = $bap->only(['numerator_start', 'numerator_end', 'total_usage', 'online_usage_count']);
    $usageSegment = BapUsageSegment::query()->where('bap_id', $bap->id)->sole();
    $segmentSource = $usageSegment->only(['skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity']);
    $allocation = $usageSegment->skpdAllocation;
    $allocationSource = $allocation->only(['numerator_start', 'numerator_end', 'quantity', 'status']);
    $cancellationSource = $cancellation->only(['numerator', 'reason', 'description', 'created_by']);

    $this->actingAs($verifier)
        ->post(route('bap-verifications-phase-2.complete', $bap), phaseNineCompletionPayload($bap))
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap));

    $verification = BapVerification::query()
        ->where('stage', BapVerificationStage::Phase2)
        ->sole();

    expect($verification->refresh()->status)->toBe(BapVerificationStatus::Completed)
        ->and($verification->result)->toBe(BapVerificationResult::Passed)
        ->and($bap->refresh()->status)->toBe(BapStatus::VerifiedPhase2)
        ->and($bap->only(['numerator_start', 'numerator_end', 'total_usage', 'online_usage_count']))->toBe($source)
        ->and($usageSegment->refresh()->only(['skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity']))->toBe($segmentSource)
        ->and($allocation->refresh()->only(['numerator_start', 'numerator_end', 'quantity', 'status']))->toBe($allocationSource)
        ->and($cancellation->refresh()->only(['numerator', 'reason', 'description', 'created_by']))->toBe($cancellationSource);
    $this->assertDatabaseCount('bap_verification_checklist_items', 5);
    $this->assertDatabaseCount('bap_verification_discrepancies', 0);
    $this->assertDatabaseCount('bap_clarification_requests', 0);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_id' => $bap->id,
        'event' => 'bap_verification.phase_2_passed',
    ]);
});

test('multiple Phase 2 physical mismatches record independent discrepancies and preserve Phase 1', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    $phaseOneVerification = BapVerification::query()
        ->where('stage', BapVerificationStage::Phase1)
        ->sole();
    phaseNineStartVerification($verifier, $bap);
    $payload = phaseNineCompletionPayload($bap);
    $payload['result'] = BapVerificationResult::Discrepancy->value;
    $payload['checklist'][1]['actual_numerator_end'] = 582_619;
    $payload['checklist'][4]['actual_quantity'] = 4;
    $payload['discrepancies'] = [
        [
            'type' => BapVerificationChecklistType::Numerator->value,
            'notes' => 'Nomerator fisik terakhir belum ditemukan.',
        ],
        [
            'type' => BapVerificationChecklistType::Online->value,
            'notes' => 'Satu bukti online belum sesuai.',
        ],
    ];

    $this->actingAs($verifier)
        ->post(route('bap-verifications-phase-2.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap));

    $verification = BapVerification::query()
        ->where('stage', BapVerificationStage::Phase2)
        ->sole();

    expect($verification->result)->toBe(BapVerificationResult::Discrepancy)
        ->and($bap->refresh()->status)->toBe(BapStatus::NeedsClarification)
        ->and($phaseOneVerification->refresh()->result)->toBe(BapVerificationResult::Passed);
    $this->assertDatabaseCount('bap_verification_discrepancies', 2);
    $this->assertDatabaseHas('bap_verification_discrepancies', [
        'bap_verification_id' => $verification->id,
        'type' => BapVerificationChecklistType::Numerator->value,
        'expected_value' => '0582608–0582620',
        'actual_value' => '0582608–0582619',
        'difference' => -1,
    ]);
    $this->assertDatabaseHas('bap_verification_discrepancies', [
        'bap_verification_id' => $verification->id,
        'type' => BapVerificationChecklistType::Online->value,
        'expected_value' => '5',
        'actual_value' => '4',
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
        'event' => 'bap_verification.phase_2_sent_to_clarification',
    ]);
});

test('Phase 2 cannot pass a checklist with a physical mismatch', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    phaseNineStartVerification($verifier, $bap);
    $payload = phaseNineCompletionPayload($bap);
    $payload['checklist'][2]['actual_quantity'] = 12;

    $this->actingAs($verifier)
        ->from(route('bap-verifications-phase-2.show', $bap))
        ->post(route('bap-verifications-phase-2.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasErrors([
            'result' => 'Hasil lulus tidak dapat dipilih ketika masih ada nilai fisik yang berbeda dari sistem.',
        ]);

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerificationPhase2);
    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('Phase 2 rejects an incomplete checklist', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    phaseNineStartVerification($verifier, $bap);
    $payload = phaseNineCompletionPayload($bap);
    array_pop($payload['checklist']);

    $this->actingAs($verifier)
        ->from(route('bap-verifications-phase-2.show', $bap))
        ->post(route('bap-verifications-phase-2.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasErrors('checklist');

    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('roles outside Petugas Verifikasi cannot access or start Phase 2 through direct HTTP requests', function (UserRole $role) {
    $bap = phaseNineWaitingBap();
    $actor = User::factory()->create(['role' => $role]);

    $this->actingAs($actor)
        ->get(route('bap-verifications-phase-2.index'))
        ->assertForbidden();

    $this->actingAs($actor)
        ->get(route('bap-verifications-phase-2.show', $bap))
        ->assertForbidden();

    $this->actingAs($actor)
        ->post(route('bap-verifications-phase-2.start', $bap))
        ->assertForbidden();

    $this->actingAs($actor)
        ->post(route('bap-verifications-phase-2.complete', $bap), phaseNineCompletionPayload($bap))
        ->assertForbidden();

    $this->assertDatabaseCount('bap_verifications', 1);
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Bendahara Barang' => UserRole::BendaharaBarang,
]);

test('only the Phase 2 verifier who started the BAP can complete it', function () {
    $starter = phaseNineVerifier('Verifier Awal');
    $otherVerifier = phaseNineVerifier('Verifier Lain');
    $bap = phaseNineWaitingBap();
    phaseNineStartVerification($starter, $bap);

    $this->actingAs($otherVerifier)
        ->from(route('bap-verifications-phase-2.show', $bap))
        ->post(route('bap-verifications-phase-2.complete', $bap), phaseNineCompletionPayload($bap))
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasErrors('bap');

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerificationPhase2);
    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('duplicate Phase 2 completion is rejected without a second result', function () {
    $verifier = phaseNineVerifier();
    $bap = phaseNineWaitingBap();
    phaseNineStartVerification($verifier, $bap);
    $payload = phaseNineCompletionPayload($bap);

    $this->actingAs($verifier)
        ->post(route('bap-verifications-phase-2.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap));

    $this->actingAs($verifier)
        ->from(route('bap-verifications-phase-2.show', $bap))
        ->post(route('bap-verifications-phase-2.complete', $bap), $payload)
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasErrors('status');

    $this->assertDatabaseCount('bap_verifications', 2);
    $this->assertDatabaseCount('bap_verification_checklist_items', 5);
});
