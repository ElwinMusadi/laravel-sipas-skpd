<?php

use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapVerification;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

function superadminForActionFlags(): User
{
    return User::factory()->create([
        'role' => UserRole::Superadmin,
        'loket_id' => null,
    ]);
}

test('Superadmin only sees allocation actions that the allocation status allows', function (
    SkpdAllocationStatus $status,
    bool $accept,
    bool $edit,
    bool $cancel,
    bool $returnRemainder,
) {
    $allocation = SkpdAllocation::factory()->create(['status' => $status]);

    $response = $this->actingAs(superadminForActionFlags())
        ->get(route('skpd.allocations.show', $allocation));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('skpd/allocations/show')
        ->where('allocation.can.accept', $accept)
        ->where('allocation.can.edit', $edit)
        ->where('allocation.can.cancel', $cancel)
        ->where('allocation.can.return_remainder', $returnRemainder)
        ->etc(),
    );
})->with([
    'pending handover' => [SkpdAllocationStatus::Pending, true, true, true, false],
    'accepted with unused remainder' => [SkpdAllocationStatus::Accepted, false, false, false, true],
    'completed' => [SkpdAllocationStatus::Completed, false, false, false, false],
    'cancelled' => [SkpdAllocationStatus::Cancelled, false, false, false, false],
    'returned to the centre' => [SkpdAllocationStatus::Returned, false, false, false, false],
]);

test('Superadmin only sees administrative receipt for a BAP waiting for receipt', function (BapStatus $status, bool $receive) {
    $bap = Bap::factory()->create(['status' => $status]);

    $response = $this->actingAs(superadminForActionFlags())
        ->get(route('bap-administrations.show', $bap));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('bap-administrations/show')
        ->where('bap.can.receive', $receive)
        ->etc(),
    );
})->with([
    'waiting for receipt' => [BapStatus::VerifiedPhase2, true],
    'already completed' => [BapStatus::Completed, false],
]);

test('Superadmin only sees the start button while the BAP is queued for that stage', function (
    string $routeName,
    BapStatus $status,
    bool $start,
) {
    $bap = Bap::factory()->create(['status' => $status]);

    $response = $this->actingAs(superadminForActionFlags())
        ->get(route($routeName, $bap));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('can.start', $start)
        ->etc(),
    );
})->with([
    'Tahap 1 submitted' => ['bap-verifications.show', BapStatus::Submitted, true],
    'Tahap 1 on a completed BAP' => ['bap-verifications.show', BapStatus::Completed, false],
    'Tahap 2 waiting' => ['bap-verifications-phase-2.show', BapStatus::WaitingVerificationPhase2, true],
    'Tahap 2 on a completed BAP' => ['bap-verifications-phase-2.show', BapStatus::Completed, false],
]);

test('Superadmin only sees clarification actions that the ticket and BAP status allow', function (
    BapStatus $bapStatus,
    BapClarificationStatus $clarificationStatus,
    bool $respond,
    bool $review,
) {
    $bap = Bap::factory()->create(['status' => $bapStatus]);
    $verification = BapVerification::factory()
        ->completed(BapVerificationResult::Discrepancy)
        ->create([
            'bap_id' => $bap->id,
            'stage' => BapVerificationStage::Phase1,
        ]);
    $clarification = BapClarificationRequest::factory()
        ->forVerification($verification)
        ->create(['status' => $clarificationStatus]);

    $response = $this->actingAs(superadminForActionFlags())
        ->get(route('bap-clarifications.show', $clarification));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('bap-clarifications/show')
        ->where('can.open', $respond)
        ->where('can.respond', $respond)
        ->where('can.review', $review)
        ->etc(),
    );
})->with([
    'waiting for the Loket response' => [BapStatus::NeedsClarification, BapClarificationStatus::WaitingResponse, true, false],
    'waiting for verifier review' => [BapStatus::NeedsClarification, BapClarificationStatus::Responded, false, true],
    'resolved on a completed BAP' => [BapStatus::Completed, BapClarificationStatus::Resolved, false, false],
]);
