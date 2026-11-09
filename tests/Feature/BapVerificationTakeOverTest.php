<?php

use App\Actions\SkpdVerification\StartBapVerification;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\AuditLog;
use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

function takeOverQueuedBap(BapVerificationStage $stage): Bap
{
    $loket = Loket::factory()->create(['name' => 'SAMSAT Corner']);
    $petugasLoket = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-TAKE-OVER-'.fake()->unique()->bothify('####??'),
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'total_sets' => 13,
    ]);
    $allocation = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'quantity' => 13,
        'status' => SkpdAllocationStatus::Accepted,
        'accepted_by' => $petugasLoket->id,
        'accepted_at' => now(),
    ]);
    $bap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'service_date' => now()->toDateString(),
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'total_usage' => 13,
        'online_usage_count' => 5,
        'status' => $stage->startBapStatus(),
        'created_by' => $petugasLoket->id,
        'submitted_at' => now()->subHour(),
    ]);

    BapUsageSegment::create([
        'bap_id' => $bap->id,
        'skpd_allocation_id' => $allocation->id,
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'quantity' => 13,
    ]);

    if ($stage === BapVerificationStage::Phase2) {
        BapVerification::factory()
            ->completed(BapVerificationResult::Passed)
            ->create([
                'bap_id' => $bap->id,
                'verifier_id' => User::factory()->create(['role' => UserRole::PetugasPenetapan])->id,
                'stage' => BapVerificationStage::Phase1,
                'started_at' => now()->subMinutes(45),
                'completed_at' => now()->subMinutes(30),
            ]);
    }

    return $bap;
}

function takeOverStartedBap(BapVerificationStage $stage, User $starter): Bap
{
    $bap = takeOverQueuedBap($stage);

    app(StartBapVerification::class)->handle($starter, $bap, $stage);

    return $bap->refresh();
}

function takeOverRoute(BapVerificationStage $stage, string $action, Bap $bap): string
{
    return $stage === BapVerificationStage::Phase1
        ? route("bap-verifications.{$action}", $bap)
        : route("bap-verifications-phase-2.{$action}", $bap);
}

/**
 * @return array{result: string, checklist: list<array<string, int|bool|string>>, discrepancies: list<array{type: string, notes: string}>}
 */
function takeOverPassingPayload(Bap $bap): array
{
    return [
        'result' => BapVerificationResult::Passed->value,
        'checklist' => [
            ['type' => BapVerificationChecklistType::UsageQuantity->value, 'is_attested' => true, 'actual_quantity' => 13],
            ['type' => BapVerificationChecklistType::Numerator->value, 'is_attested' => true, 'actual_numerator_start' => 582_608, 'actual_numerator_end' => 582_620],
            ['type' => BapVerificationChecklistType::TindisanSets->value, 'is_attested' => true, 'actual_quantity' => 13],
            ['type' => BapVerificationChecklistType::Cancellation->value, 'is_attested' => true, 'actual_quantity' => 0],
            ['type' => BapVerificationChecklistType::Online->value, 'is_attested' => true, 'actual_quantity' => 5],
        ],
        'discrepancies' => [],
    ];
}

test('a colleague Petugas Penetapan takes over a stalled Phase 1 check with an audit trail and can complete it', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $colleague = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);
    $verification = BapVerification::query()->sole();

    $this->actingAs($colleague)
        ->post(route('bap-verifications.take-over', $bap))
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasNoErrors();

    $audit = AuditLog::query()->where('event', 'bap_verification.phase_1_taken_over')->sole();

    expect($verification->refresh()->verifier_id)->toBe($colleague->id)
        ->and($verification->attempt)->toBe(1)
        ->and($bap->refresh()->status)->toBe(BapStatus::UnderVerification)
        ->and($audit->actor_id)->toBe($colleague->id)
        ->and($audit->auditable_id)->toBe($bap->id)
        ->and($audit->old_values)->toEqual(['verification_id' => $verification->id, 'verifier_id' => $starter->id])
        ->and($audit->new_values)->toEqual(['verification_id' => $verification->id, 'attempt' => 1, 'verifier_id' => $colleague->id]);

    $this->actingAs($colleague)
        ->post(route('bap-verifications.complete', $bap), takeOverPassingPayload($bap))
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasNoErrors();

    expect($bap->refresh()->status)->toBe(BapStatus::WaitingVerificationPhase2);
});

test('a colleague Petugas Verifikasi takes over a stalled Phase 2 check', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasVerifikasi]);
    $colleague = User::factory()->create(['role' => UserRole::PetugasVerifikasi]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase2, $starter);

    $this->actingAs($colleague)
        ->post(route('bap-verifications-phase-2.take-over', $bap))
        ->assertRedirect(route('bap-verifications-phase-2.show', $bap))
        ->assertSessionHasNoErrors();

    $phaseTwoVerification = BapVerification::query()
        ->where('stage', BapVerificationStage::Phase2)
        ->sole();

    expect($phaseTwoVerification->verifier_id)->toBe($colleague->id)
        ->and($bap->refresh()->status)->toBe(BapStatus::UnderVerificationPhase2);
    $this->assertDatabaseHas('audit_logs', ['event' => 'bap_verification.phase_2_taken_over', 'actor_id' => $colleague->id]);
});

test('Superadmin can take over a stalled verification', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);

    $this->actingAs($superadmin)
        ->post(route('bap-verifications.take-over', $bap))
        ->assertSessionHasNoErrors();

    expect(BapVerification::query()->sole()->verifier_id)->toBe($superadmin->id);
});

test('the original verifier can no longer complete a check after it is taken over', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $colleague = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);

    $this->actingAs($colleague)->post(route('bap-verifications.take-over', $bap));

    $this->actingAs($starter)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.complete', $bap), takeOverPassingPayload($bap))
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors(['bap' => 'Hanya verifier Verifikasi Tahap 1 yang memulai pemeriksaan ini dapat menyelesaikannya.']);

    expect($bap->refresh()->status)->toBe(BapStatus::UnderVerification);
    $this->assertDatabaseCount('bap_verification_checklist_items', 0);
});

test('a verifier cannot take over a check they already handle', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);

    $this->actingAs($starter)
        ->from(route('bap-verifications.show', $bap))
        ->post(route('bap-verifications.take-over', $bap))
        ->assertRedirect(route('bap-verifications.show', $bap))
        ->assertSessionHasErrors(['bap' => 'Pemeriksaan ini sudah ditangani oleh Anda.']);

    $this->assertDatabaseMissing('audit_logs', ['event' => 'bap_verification.phase_1_taken_over']);
});

test('take-over is forbidden when the BAP has no check in progress', function () {
    $verifier = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverQueuedBap(BapVerificationStage::Phase1);

    $this->actingAs($verifier)
        ->post(route('bap-verifications.take-over', $bap))
        ->assertForbidden();

    expect($bap->refresh()->status)->toBe(BapStatus::Submitted);
    $this->assertDatabaseCount('bap_verifications', 0);
});

test('roles outside the Phase 1 verifier role cannot take over through direct HTTP', function (UserRole $role) {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);
    $actor = User::factory()->create([
        'role' => $role,
        'loket_id' => $role === UserRole::PetugasLoket ? $bap->loket_id : null,
    ]);

    $this->actingAs($actor)
        ->post(route('bap-verifications.take-over', $bap))
        ->assertForbidden();

    expect(BapVerification::query()->sole()->verifier_id)->toBe($starter->id);
})->with([
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
    'Petugas Loket' => UserRole::PetugasLoket,
    'Kasie Penetapan' => UserRole::KasiePenetapan,
    'Bendahara Barang' => UserRole::BendaharaBarang,
]);

test('the verification page offers take-over only to a colleague while a check is in progress', function () {
    $starter = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $colleague = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $bap = takeOverStartedBap(BapVerificationStage::Phase1, $starter);

    $this->actingAs($starter)
        ->get(route('bap-verifications.show', $bap))
        ->assertInertia(fn (Assert $page) => $page
            ->where('can.complete', true)
            ->where('can.take_over', false));

    $this->actingAs($colleague)
        ->get(route('bap-verifications.show', $bap))
        ->assertInertia(fn (Assert $page) => $page
            ->where('can.complete', false)
            ->where('can.take_over', true));
});
