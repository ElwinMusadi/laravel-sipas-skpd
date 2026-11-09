<?php

use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\SubmitBap;
use App\Actions\SkpdVerification\CompleteBapVerification;
use App\Actions\SkpdVerification\StartBapVerification;
use App\Actions\SkpdVerification\SubmitBapClarificationResponse;
use App\BapClarificationResolutionOutcome;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResolution;
use App\Models\BapVerification;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-11-09 10:00:00');
});

/**
 * @return array{loket: Loket, petugas: User}
 */
function correctionLoket(): array
{
    $loket = Loket::factory()->create(['code' => 'MPP', 'name' => 'Mall Pelayanan Publik']);
    $petugas = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-KOREKSI-001',
        'numerator_start' => 583_000,
        'numerator_end' => 583_099,
        'total_sets' => 100,
    ]);
    SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'allocation_date' => '2026-11-01',
        'numerator_start' => 583_000,
        'numerator_end' => 583_099,
        'quantity' => 100,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugas->id,
        'accepted_at' => now()->subWeek(),
    ]);

    return ['loket' => $loket, 'petugas' => $petugas];
}

function correctionSubmittedBap(User $petugas, Loket $loket, string $serviceDate, int $start, int $end, int $online): Bap
{
    $bap = app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse($serviceDate), $start, $end, $online);

    return app(SubmitBap::class)->handle($petugas, $bap);
}

/**
 * @return array{result: string, checklist: list<array<string, int|bool|string>>, discrepancies: list<array{type: string, notes: string}>}
 */
function correctionChecklistPayload(Bap $bap, int $physicalOnline): array
{
    $matches = $physicalOnline === $bap->online_usage_count;

    return [
        'result' => $matches ? BapVerificationResult::Passed->value : BapVerificationResult::Discrepancy->value,
        'checklist' => [
            ['type' => BapVerificationChecklistType::UsageQuantity->value, 'is_attested' => true, 'actual_quantity' => $bap->total_usage],
            ['type' => BapVerificationChecklistType::Numerator->value, 'is_attested' => true, 'actual_numerator_start' => $bap->numerator_start, 'actual_numerator_end' => $bap->numerator_end],
            ['type' => BapVerificationChecklistType::TindisanSets->value, 'is_attested' => true, 'actual_quantity' => $bap->total_usage],
            ['type' => BapVerificationChecklistType::Cancellation->value, 'is_attested' => true, 'actual_quantity' => $bap->cancellations()->count()],
            ['type' => BapVerificationChecklistType::Online->value, 'is_attested' => true, 'actual_quantity' => $physicalOnline],
        ],
        'discrepancies' => $matches ? [] : [[
            'type' => BapVerificationChecklistType::Online->value,
            'notes' => 'Bukti online fisik berbeda dari data BAP.',
        ]],
    ];
}

/**
 * Drives a submitted BAP to a responded clarification at the given stage, with
 * the physical online count differing from the BAP.
 */
function correctionRespondedClarification(Bap $bap, User $petugas, BapVerificationStage $stage, User $verifier, int $physicalOnline): BapClarificationRequest
{
    if ($stage === BapVerificationStage::Phase2) {
        $penetapan = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
        app(StartBapVerification::class)->handle($penetapan, $bap, BapVerificationStage::Phase1);
        app(CompleteBapVerification::class)->handle($penetapan, $bap->refresh(), BapVerificationStage::Phase1, correctionChecklistPayload($bap, $bap->online_usage_count));
    }

    app(StartBapVerification::class)->handle($verifier, $bap->refresh(), $stage);
    app(CompleteBapVerification::class)->handle($verifier, $bap->refresh(), $stage, correctionChecklistPayload($bap, $physicalOnline));

    $clarification = BapClarificationRequest::query()->where('bap_id', $bap->id)->latest('id')->firstOrFail();
    app(SubmitBapClarificationResponse::class)->handle($petugas, $clarification, 'Petugas salah mengetik jumlah online pada BAP.');

    return $clarification->refresh();
}

test('a Phase 1 verifier returns a mis-entered BAP as a draft that the Loket corrects, resubmits, and passes', function () {
    ['loket' => $loket, 'petugas' => $petugas] = correctionLoket();
    $verifier = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = correctionSubmittedBap($petugas, $loket, '2026-11-09', 583_000, 583_009, 5);
    $clarification = correctionRespondedClarification($bap, $petugas, BapVerificationStage::Phase1, $verifier, 7);

    $this->actingAs($verifier)
        ->post(route('bap-clarifications.review', $clarification), [
            'outcome' => 'returned_for_correction',
            'notes' => 'Jumlah SKPD online fisik 7 set. Mohon koreksi BAP.',
        ])
        ->assertRedirect(route('bap-clarifications.show', $clarification))
        ->assertSessionHasNoErrors();

    $resolution = BapClarificationResolution::query()->sole();

    expect($bap->refresh()->status)->toBe(BapStatus::Draft)
        ->and($bap->submitted_at)->toBeNull()
        ->and($clarification->refresh()->status)->toBe(BapClarificationStatus::Resolved)
        ->and($resolution->outcome)->toBe(BapClarificationResolutionOutcome::ReturnedForCorrection)
        ->and($resolution->clarificationRequest->is($clarification))->toBeTrue()
        ->and($resolution->response->clarificationRequest->is($clarification))->toBeTrue();
    $this->assertDatabaseHas('audit_logs', [
        'auditable_id' => $bap->id,
        'actor_id' => $verifier->id,
        'event' => 'bap_clarification.returned_for_correction',
    ]);

    $this->actingAs($petugas)
        ->get(route('baps.show', $bap))
        ->assertInertia(fn (Assert $page) => $page
            ->where('bap.status', 'draft')
            ->where('bap.can.edit', true)
            ->where('bap.can.delete', false)
            ->where('bap.correction_request.stage_label', 'Verifikasi Tahap 1')
            ->where('bap.correction_request.notes', 'Jumlah SKPD online fisik 7 set. Mohon koreksi BAP.'));

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), [
            'service_date' => '2026-11-09',
            'numerator_start' => '0583000',
            'numerator_end' => '0583009',
            'online_usage_count' => 7,
            'cancellation_count' => 0,
        ])
        ->assertRedirect(route('baps.show', $bap))
        ->assertSessionHasNoErrors();
    $this->actingAs($petugas)
        ->post(route('baps.submit', $bap))
        ->assertSessionHasNoErrors();

    expect($bap->refresh()->status)->toBe(BapStatus::Submitted)
        ->and($bap->online_usage_count)->toBe(7);

    $this->actingAs($verifier)
        ->post(route('bap-verifications.start', $bap))
        ->assertSessionHasNoErrors();
    $this->actingAs($verifier)
        ->post(route('bap-verifications.complete', $bap), correctionChecklistPayload($bap, 7))
        ->assertSessionHasNoErrors();

    expect($bap->refresh()->status)->toBe(BapStatus::WaitingVerificationPhase2)
        ->and(BapVerification::query()->where('bap_id', $bap->id)->where('stage', BapVerificationStage::Phase1)->where('attempt', 2)->sole()->result)
        ->toBe(BapVerificationResult::Passed);
});

test('a BAP returned from Phase 2 restarts at Phase 1 after resubmission', function () {
    ['loket' => $loket, 'petugas' => $petugas] = correctionLoket();
    $phaseTwoVerifier = User::factory()->create(['role' => UserRole::PetugasVerifikasi]);
    $phaseOneVerifier = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = correctionSubmittedBap($petugas, $loket, '2026-11-09', 583_000, 583_009, 5);
    $clarification = correctionRespondedClarification($bap, $petugas, BapVerificationStage::Phase2, $phaseTwoVerifier, 6);

    $this->actingAs($phaseTwoVerifier)
        ->post(route('bap-clarifications.review', $clarification), [
            'outcome' => 'returned_for_correction',
            'notes' => 'Jumlah online fisik 6 set.',
        ])
        ->assertSessionHasNoErrors();
    $this->actingAs($petugas)->post(route('baps.submit', $bap))->assertSessionHasNoErrors();

    expect($bap->refresh()->status)->toBe(BapStatus::Submitted);

    $this->actingAs($phaseTwoVerifier)
        ->post(route('bap-verifications-phase-2.start', $bap))
        ->assertForbidden();
    $this->actingAs($phaseOneVerifier)
        ->post(route('bap-verifications.start', $bap))
        ->assertSessionHasNoErrors();

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerification)
        ->and(BapVerification::query()->where('bap_id', $bap->id)->where('stage', BapVerificationStage::Phase1)->max('attempt'))->toBe(2);
});

test('a returned draft followed by a later Loket BAP keeps its date and range but accepts online and Batal/Rusak corrections', function () {
    ['loket' => $loket, 'petugas' => $petugas] = correctionLoket();
    $verifier = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = correctionSubmittedBap($petugas, $loket, '2026-11-08', 583_000, 583_009, 5);
    $laterBap = app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse('2026-11-09'), 583_010, 583_019, 2);
    $clarification = correctionRespondedClarification($bap, $petugas, BapVerificationStage::Phase1, $verifier, 3);

    $this->actingAs($verifier)->post(route('bap-clarifications.review', $clarification), [
        'outcome' => 'returned_for_correction',
        'notes' => 'Online fisik 3 set dan satu SKPD rusak belum dicatat.',
    ]);
    $segmentsBefore = $bap->usageSegments()->get(['skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity'])->toArray();

    $this->actingAs($petugas)
        ->get(route('baps.edit', $bap))
        ->assertInertia(fn (Assert $page) => $page->where('bap.range_locked', true));

    $this->actingAs($petugas)
        ->from(route('baps.edit', $bap))
        ->put(route('baps.update', $bap), [
            'service_date' => '2026-11-08',
            'numerator_start' => '0583000',
            'numerator_end' => '0583008',
            'online_usage_count' => 3,
            'cancellation_count' => 0,
        ])
        ->assertRedirect(route('baps.edit', $bap))
        ->assertSessionHasErrors(['numerator_start' => 'Tanggal dan range Nomerator BAP draft tidak dapat diubah setelah terdapat BAP Loket berikutnya. Hanya jumlah online dan Batal/Rusak yang dapat dikoreksi.']);

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), [
            'service_date' => '2026-11-08',
            'numerator_start' => '0583000',
            'numerator_end' => '0583009',
            'online_usage_count' => 3,
            'cancellation_count' => 1,
            'cancellations' => [
                ['numerator' => '0583004', 'reason' => 'printer_error', 'description' => null],
            ],
        ])
        ->assertRedirect(route('baps.show', $bap))
        ->assertSessionHasNoErrors();

    $bap->refresh();

    expect($bap->status)->toBe(BapStatus::Draft)
        ->and($bap->service_date->toDateString())->toBe('2026-11-08')
        ->and([$bap->numerator_start, $bap->numerator_end, $bap->total_usage])->toBe([583_000, 583_009, 10])
        ->and($bap->online_usage_count)->toBe(3)
        ->and($bap->usageSegments()->get(['skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity'])->toArray())->toBe($segmentsBefore)
        ->and($laterBap->refresh()->numerator_start)->toBe(583_010);
    $this->assertDatabaseHas('bap_cancellations', [
        'bap_id' => $bap->id,
        'numerator' => 583_004,
        'reason' => 'printer_error',
    ]);
});
