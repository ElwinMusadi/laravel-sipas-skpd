<?php

use App\Actions\SkpdVerification\ReceiveBapByBendaharaBarang;
use App\BapCancellationReason;
use App\BapClarificationResolutionOutcome;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResolution;
use App\Models\BapClarificationResponse;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @return array{bap: Bap, loket_user: User, allocation: SkpdAllocation, segment: BapUsageSegment, cancellation: BapCancellation}
 */
function phaseElevenReadyBap(
    int $numeratorStart = 611_000,
    ?BapStatus $status = null,
    bool $withPassedPhaseOne = true,
    bool $withPassedPhaseTwo = true,
): array {
    $numeratorEnd = $numeratorStart + 12;
    $loket = Loket::factory()->create(['name' => "Loket Fase 11 {$numeratorStart}"]);
    $loketUser = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => "BOX-PHASE-11-{$numeratorStart}",
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_sets' => 13,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => 13,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $loketUser->id,
        'accepted_at' => now()->subDays(2),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => now()->toDateString(),
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'total_usage' => 13,
        'online_usage_count' => 5,
        'status' => $status ?? BapStatus::VerifiedPhase2,
        'created_by' => $loketUser->id,
        'submitted_at' => now()->subHours(2),
    ]);
    $segment = BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => $numeratorStart,
        'numerator_end' => $numeratorEnd,
        'quantity' => 13,
    ]);
    $cancellation = BapCancellation::create([
        'bap_id' => $bap->id,
        'numerator' => $numeratorStart + 4,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Dokumen fisik rusak dan telah dicatat sebelum verifikasi.',
        'created_by' => $loketUser->id,
    ]);

    if ($withPassedPhaseOne) {
        BapVerification::factory()
            ->completed(BapVerificationResult::Passed)
            ->create([
                'bap_id' => $bap->id,
                'verifier_id' => User::factory()->create([
                    'name' => "Penetapan {$numeratorStart}",
                    'role' => UserRole::PetugasPenetapan,
                ])->id,
                'stage' => BapVerificationStage::Phase1,
                'attempt' => 1,
                'started_at' => now()->subMinutes(90),
                'completed_at' => now()->subMinutes(75),
            ]);
    }

    if ($withPassedPhaseTwo) {
        BapVerification::factory()
            ->completed(BapVerificationResult::Passed)
            ->create([
                'bap_id' => $bap->id,
                'verifier_id' => User::factory()->create([
                    'name' => "Verifikator {$numeratorStart}",
                    'role' => UserRole::PetugasVerifikasi,
                ])->id,
                'stage' => BapVerificationStage::Phase2,
                'attempt' => 1,
                'started_at' => now()->subMinutes(60),
                'completed_at' => now()->subMinutes(45),
            ]);
    }

    return compact('bap', 'loketUser', 'allocation', 'segment', 'cancellation');
}

function phaseElevenBendahara(): User
{
    return User::factory()->create([
        'name' => 'Bendahara Barang',
        'role' => UserRole::BendaharaBarang,
    ]);
}

/**
 * @param  list<string>  $attributes
 * @return array<string, mixed>
 */
function phaseElevenRawAttributes(Bap|BapUsageSegment|SkpdAllocation|BapCancellation|BapClarificationRequest $model, array $attributes): array
{
    $model->refresh();

    return collect($attributes)
        ->mapWithKeys(fn (string $attribute): array => [$attribute => $model->getRawOriginal($attribute)])
        ->all();
}

test('Bendahara Barang sees only the verified Phase 2 receipt queue and can filter it', function () {
    $bendahara = phaseElevenBendahara();
    $ready = phaseElevenReadyBap(611_000);
    $waitingVerification = phaseElevenReadyBap(611_100, BapStatus::WaitingVerificationPhase2);
    $clarification = phaseElevenReadyBap(611_200, BapStatus::NeedsClarification);
    $completed = phaseElevenReadyBap(611_300, BapStatus::Completed);
    $completed['bap']->update([
        'received_by' => $bendahara->id,
        'received_at' => now()->subMinute(),
    ]);

    $this->actingAs($bendahara)
        ->get(route('bap-administrations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-administrations/index')
            ->where('baps.data.0.id', $ready['bap']->id)
            ->where('baps.data.0.administrative_status', 'ready')
            ->missing('baps.data.1')
            ->etc(),
        );

    $this->actingAs($bendahara)
        ->get(route('bap-administrations.index', [
            'status' => 'completed',
            'search' => "#{$completed['bap']->id}",
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-administrations/index')
            ->where('filters.status', 'completed')
            ->where('baps.data.0.id', $completed['bap']->id)
            ->where('baps.data.0.administrative_status', 'completed')
            ->missing('baps.data.1')
            ->etc(),
        );

    expect($waitingVerification['bap']->id)->not->toBe($ready['bap']->id)
        ->and($clarification['bap']->id)->not->toBe($ready['bap']->id);
});

test('Bendahara Barang can view the full BAP record before administrative receipt', function () {
    $bendahara = phaseElevenBendahara();
    $context = phaseElevenReadyBap();

    $this->actingAs($bendahara)
        ->get(route('bap-administrations.show', $context['bap']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-administrations/show')
            ->where('bap.id', $context['bap']->id)
            ->where('bap.can.receive', true)
            ->where('bap.segments.0.allocation_id', $context['allocation']->id)
            ->where('bap.cancellations.0.numerator', 611_004)
            ->where('bap.cancellations.0.reason_label', 'Rusak')
            ->where('bap.phase_one.0.result', BapVerificationResult::Passed->value)
            ->where('bap.phase_two.0.result', BapVerificationResult::Passed->value)
            ->etc(),
        );
});

test('Bendahara Barang receives a BAP with server-side metadata and audit trail', function () {
    $bendahara = phaseElevenBendahara();
    $context = phaseElevenReadyBap();

    $this->actingAs($bendahara)
        ->post(route('bap-administrations.receive', $context['bap']), [
            'receipt_notes' => 'Berkas fisik diterima dan disimpan sesuai prosedur.',
        ])
        ->assertRedirect(route('bap-administrations.show', $context['bap']));

    $received = $context['bap']->refresh();

    expect($received->status)->toBe(BapStatus::Completed)
        ->and($received->received_by)->toBe($bendahara->id)
        ->and($received->received_at)->not->toBeNull()
        ->and($received->receipt_notes)->toBe('Berkas fisik diterima dan disimpan sesuai prosedur.');
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $received->id,
        'actor_id' => $bendahara->id,
        'event' => 'bap_administration.received',
    ]);

    $this->actingAs($bendahara)
        ->get(route('bap-administrations.show', $received))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('bap.status', BapStatus::Completed->value)
            ->where('bap.receipt.received_by', $bendahara->name)
            ->where('bap.receipt.receipt_notes', 'Berkas fisik diterima dan disimpan sesuai prosedur.')
            ->where('bap.history.0.event', 'BAP diterima Bendahara Barang')
            ->etc(),
        );
});

test('the receipt endpoint rejects frontend receipt timestamps and source mutations', function () {
    $bendahara = phaseElevenBendahara();
    $context = phaseElevenReadyBap();

    $this->actingAs($bendahara)
        ->from(route('bap-administrations.show', $context['bap']))
        ->post(route('bap-administrations.receive', $context['bap']), [
            'received_at' => now()->subYear()->toIso8601String(),
            'total_usage' => 1,
        ])
        ->assertRedirect(route('bap-administrations.show', $context['bap']))
        ->assertSessionHasErrors(['received_at', 'total_usage']);

    expect($context['bap']->refresh()->status)->toBe(BapStatus::VerifiedPhase2)
        ->and($context['bap']->received_at)->toBeNull();
});

test('administrative receipt preserves inventory source and resolved clarification history', function () {
    $bendahara = phaseElevenBendahara();
    $context = phaseElevenReadyBap(611_000, withPassedPhaseOne: false);
    $firstPhaseOneAttempt = BapVerification::factory()
        ->completed(BapVerificationResult::Discrepancy)
        ->create([
            'bap_id' => $context['bap']->id,
            'verifier_id' => User::factory()->create(['role' => UserRole::PetugasPenetapan])->id,
            'stage' => BapVerificationStage::Phase1,
            'attempt' => 1,
        ]);
    $clarification = BapClarificationRequest::factory()
        ->forVerification($firstPhaseOneAttempt)
        ->create([
            'status' => BapClarificationStatus::Resolved,
            'opened_by' => $context['loketUser']->id,
            'opened_at' => now()->subHours(3),
        ]);
    $response = BapClarificationResponse::factory()->create([
        'bap_clarification_request_id' => $clarification->id,
        'responded_by' => $context['loketUser']->id,
    ]);
    BapClarificationResolution::factory()->create([
        'bap_clarification_request_id' => $clarification->id,
        'bap_clarification_response_id' => $response->id,
        'resolved_by' => $firstPhaseOneAttempt->verifier_id,
        'outcome' => BapClarificationResolutionOutcome::Resolved,
    ]);
    BapVerification::factory()
        ->completed(BapVerificationResult::Passed)
        ->create([
            'bap_id' => $context['bap']->id,
            'verifier_id' => $firstPhaseOneAttempt->verifier_id,
            'stage' => BapVerificationStage::Phase1,
            'attempt' => 2,
        ]);

    $source = phaseElevenRawAttributes($context['bap'], [
        'loket_id', 'service_date', 'numerator_start', 'numerator_end',
        'total_usage', 'online_usage_count', 'created_by', 'submitted_at',
    ]);
    $segmentSource = phaseElevenRawAttributes($context['segment'], [
        'skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity',
    ]);
    $allocationSource = phaseElevenRawAttributes($context['allocation'], [
        'numerator_start', 'numerator_end', 'quantity', 'status',
    ]);
    $cancellationSource = phaseElevenRawAttributes($context['cancellation'], [
        'numerator', 'reason', 'description', 'created_by',
    ]);
    $clarificationSource = phaseElevenRawAttributes($clarification, [
        'bap_verification_id', 'requested_by', 'opened_by', 'opened_at', 'status', 'notes',
    ]);

    $this->actingAs($bendahara)
        ->post(route('bap-administrations.receive', $context['bap']))
        ->assertRedirect(route('bap-administrations.show', $context['bap']));

    expect(phaseElevenRawAttributes($context['bap']->refresh(), array_keys($source)))->toBe($source)
        ->and(phaseElevenRawAttributes($context['segment']->refresh(), array_keys($segmentSource)))->toBe($segmentSource)
        ->and(phaseElevenRawAttributes($context['allocation']->refresh(), array_keys($allocationSource)))->toBe($allocationSource)
        ->and(phaseElevenRawAttributes($context['cancellation']->refresh(), array_keys($cancellationSource)))->toBe($cancellationSource)
        ->and(phaseElevenRawAttributes($clarification->refresh(), array_keys($clarificationSource)))->toBe($clarificationSource)
        ->and(BapVerification::query()->where('bap_id', $context['bap']->id)->count())->toBe(3)
        ->and(BapClarificationResponse::query()->where('bap_clarification_request_id', $clarification->id)->count())->toBe(1)
        ->and(BapClarificationResolution::query()->where('bap_clarification_request_id', $clarification->id)->count())->toBe(1);
});

test('the action revalidates the state and prevents a duplicate administrative receipt', function () {
    $bendahara = phaseElevenBendahara();
    $context = phaseElevenReadyBap();
    $action = app(ReceiveBapByBendaharaBarang::class);

    $action->handle($bendahara, $context['bap'], 'Penerimaan pertama.');

    expect(fn () => $action->handle($bendahara, $context['bap']->refresh(), 'Penerimaan kedua.'))
        ->toThrow(ValidationException::class);

    expect($context['bap']->refresh()->status)->toBe(BapStatus::Completed)
        ->and($context['bap']->receipt_notes)->toBe('Penerimaan pertama.');
    $this->assertDatabaseCount('audit_logs', 1);
});

test('the receipt action rejects a BAP with incomplete prerequisite verification or active clarification', function () {
    $bendahara = phaseElevenBendahara();
    $withoutPhaseTwo = phaseElevenReadyBap(611_000, withPassedPhaseTwo: false);
    $withActiveClarification = phaseElevenReadyBap(611_100);
    $phaseTwo = BapVerification::query()
        ->where('bap_id', $withActiveClarification['bap']->id)
        ->where('stage', BapVerificationStage::Phase2)
        ->sole();
    BapClarificationRequest::factory()
        ->forVerification($phaseTwo)
        ->create(['status' => BapClarificationStatus::WaitingResponse]);

    $this->actingAs($bendahara)
        ->from(route('bap-administrations.show', $withoutPhaseTwo['bap']))
        ->post(route('bap-administrations.receive', $withoutPhaseTwo['bap']))
        ->assertRedirect(route('bap-administrations.show', $withoutPhaseTwo['bap']))
        ->assertSessionHasErrors('bap');
    $this->actingAs($bendahara)
        ->from(route('bap-administrations.show', $withActiveClarification['bap']))
        ->post(route('bap-administrations.receive', $withActiveClarification['bap']))
        ->assertRedirect(route('bap-administrations.show', $withActiveClarification['bap']))
        ->assertSessionHasErrors('status');

    expect($withoutPhaseTwo['bap']->refresh()->status)->toBe(BapStatus::VerifiedPhase2)
        ->and($withActiveClarification['bap']->refresh()->status)->toBe(BapStatus::VerifiedPhase2);
});

test('roles other than Bendahara Barang cannot access or receive BAPs through direct HTTP requests', function (UserRole $role) {
    $context = phaseElevenReadyBap();
    $actor = User::factory()->create(['role' => $role]);

    $this->actingAs($actor)
        ->get(route('bap-administrations.index'))
        ->assertForbidden();
    $this->actingAs($actor)
        ->get(route('bap-administrations.show', $context['bap']))
        ->assertForbidden();
    $this->actingAs($actor)
        ->post(route('bap-administrations.receive', $context['bap']))
        ->assertForbidden();

    expect($context['bap']->refresh()->status)->toBe(BapStatus::VerifiedPhase2)
        ->and($context['bap']->received_at)->toBeNull();
    $this->assertDatabaseCount('audit_logs', 0);
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
]);
