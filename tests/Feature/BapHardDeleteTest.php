<?php

use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\RecordDomainAudit;
use App\BapCancellationReason;
use App\BapClarificationResolutionOutcome;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\Models\AuditLog;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResolution;
use App\Models\BapClarificationResponse;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\BapVerificationChecklistItem;
use App\Models\BapVerificationDiscrepancy;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Database\Eloquent\Model;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Build a realistic context featuring an earlier completed BAP (non-tail)
 * and a latest completed BAP (tail) with a full child graph:
 * - multi-stage & multi-attempt verifications (Phase 1 & Phase 2)
 * - checklist items & discrepancies
 * - clarification requests with multi-round responses and resolutions
 * - cancellations and usage segments
 * - shared and dedicated allocations
 * - existing domain audit records
 *
 * @return array{
 *     loket: Loket,
 *     superadmin: User,
 *     petugasLoket: User,
 *     petugasPenetapan: User,
 *     petugasVerifikasi: User,
 *     bendaharaBarang: User,
 *     box: SkpdBox,
 *     allocation1: SkpdAllocation,
 *     allocation2: SkpdAllocation,
 *     nonTailBap: Bap,
 *     tailBap: Bap,
 *     checklistIds: list<int>,
 *     discrepancyIds: list<int>,
 *     responseIds: list<int>,
 *     resolutionIds: list<int>,
 *     clarificationIds: list<int>,
 *     verificationIds: list<int>,
 *     cancellationIds: list<int>,
 *     segmentIds: list<int>
 * }
 */
function createHardDeleteFullGraphContext(): array
{
    $loket = Loket::factory()->create([
        'name' => 'Loket Kantor Samsat',
        'code' => 'SAMSAT-KANTOR',
        'is_active' => true,
    ]);

    $superadmin = User::factory()->create([
        'name' => 'Superadmin Hard Delete',
        'role' => UserRole::Superadmin,
        'loket_id' => null,
    ]);

    $petugasLoket = User::factory()->create([
        'name' => 'Petugas Loket HD',
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);

    $petugasPenetapan = User::factory()->create([
        'name' => 'Petugas Penetapan HD',
        'role' => UserRole::PetugasPenetapan,
    ]);

    $petugasVerifikasi = User::factory()->create([
        'name' => 'Petugas Verifikasi HD',
        'role' => UserRole::PetugasVerifikasi,
    ]);

    $bendaharaBarang = User::factory()->create([
        'name' => 'Bendahara Barang HD',
        'role' => UserRole::BendaharaBarang,
    ]);

    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-HD-'.fake()->unique()->bothify('####??'),
        'numerator_start' => 500_001,
        'numerator_end' => 500_050,
        'total_sets' => 50,
    ]);

    $allocation1 = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => 500_001,
        'numerator_end' => 500_020,
        'quantity' => 20,
        'status' => SkpdAllocationStatus::Completed,
        'accepted_by' => $petugasLoket->id,
        'accepted_at' => now()->subDays(4),
    ]);

    $allocation2 = SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => 500_021,
        'numerator_end' => 500_050,
        'quantity' => 30,
        'status' => SkpdAllocationStatus::Completed,
        'accepted_by' => $petugasLoket->id,
        'accepted_at' => now()->subDays(3),
    ]);

    $nonTailBap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'document_number' => 'PB/LOKET/'.now()->subDays(2)->format('d/m/Y'),
        'service_date' => now()->subDays(2)->toDateString(),
        'numerator_start' => 500_001,
        'numerator_end' => 500_025,
        'total_usage' => 25,
        'online_usage_count' => 10,
        'status' => BapStatus::Completed,
        'created_by' => $petugasLoket->id,
        'received_by' => $bendaharaBarang->id,
        'received_at' => now()->subDays(2),
    ]);

    BapUsageSegment::create([
        'bap_id' => $nonTailBap->id,
        'skpd_allocation_id' => $allocation1->id,
        'numerator_start' => 500_001,
        'numerator_end' => 500_020,
        'quantity' => 20,
    ]);

    BapUsageSegment::create([
        'bap_id' => $nonTailBap->id,
        'skpd_allocation_id' => $allocation2->id,
        'numerator_start' => 500_021,
        'numerator_end' => 500_025,
        'quantity' => 5,
    ]);

    $tailBap = Bap::factory()->create([
        'loket_id' => $loket->id,
        'document_number' => 'PB/LOKET/'.now()->subDay()->format('d/m/Y'),
        'service_date' => now()->subDay()->toDateString(),
        'numerator_start' => 500_026,
        'numerator_end' => 500_050,
        'total_usage' => 25,
        'online_usage_count' => 10,
        'status' => BapStatus::Completed,
        'created_by' => $petugasLoket->id,
        'received_by' => $bendaharaBarang->id,
        'received_at' => now()->subHours(5),
    ]);

    $segmentTail = BapUsageSegment::create([
        'bap_id' => $tailBap->id,
        'skpd_allocation_id' => $allocation2->id,
        'numerator_start' => 500_026,
        'numerator_end' => 500_050,
        'quantity' => 25,
    ]);

    $cancellation1 = BapCancellation::create([
        'bap_id' => $tailBap->id,
        'numerator' => 500_030,
        'reason' => BapCancellationReason::Damaged,
        'description' => 'Rusak saat pelayanan cetak fisik',
        'created_by' => $petugasLoket->id,
    ]);

    $cancellation2 = BapCancellation::create([
        'bap_id' => $tailBap->id,
        'numerator' => 500_040,
        'reason' => BapCancellationReason::PrinterError,
        'description' => 'Gagal cetak printer loket',
        'created_by' => $petugasLoket->id,
    ]);

    // Phase 1 Attempt 1 (Discrepancy)
    $v1 = BapVerification::factory()
        ->completed(BapVerificationResult::Discrepancy)
        ->create([
            'bap_id' => $tailBap->id,
            'verifier_id' => $petugasPenetapan->id,
            'stage' => BapVerificationStage::Phase1,
            'attempt' => 1,
            'started_at' => now()->subHours(8),
            'completed_at' => now()->subHours(7),
        ]);

    $v1ItemUsage = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v1->id,
        'type' => BapVerificationChecklistType::UsageQuantity,
        'expected_quantity' => 25,
        'actual_quantity' => 25,
    ]);

    $v1ItemNum = BapVerificationChecklistItem::factory()->numeratorRange(500_026, 500_050)->create([
        'bap_verification_id' => $v1->id,
    ]);

    $v1ItemTindisan = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v1->id,
        'type' => BapVerificationChecklistType::TindisanSets,
        'expected_quantity' => 25,
        'actual_quantity' => 25,
    ]);

    $v1ItemCanc = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v1->id,
        'type' => BapVerificationChecklistType::Cancellation,
        'expected_quantity' => 2,
        'actual_quantity' => 2,
    ]);

    $v1ItemOnline = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v1->id,
        'type' => BapVerificationChecklistType::Online,
        'expected_quantity' => 10,
        'actual_quantity' => 9,
        'quantity_difference' => -1,
    ]);

    $v1Discrepancy = BapVerificationDiscrepancy::factory()->forChecklistItem($v1ItemOnline)->create([
        'expected_value' => '10',
        'actual_value' => '9',
        'difference' => -1,
        'notes' => 'Satu bukti online fisik belum terverifikasi',
    ]);

    $clarification1 = BapClarificationRequest::factory()->forVerification($v1)->create([
        'bap_id' => $tailBap->id,
        'status' => BapClarificationStatus::Resolved,
    ]);

    $clar1Resp1 = BapClarificationResponse::factory()->create([
        'bap_clarification_request_id' => $clarification1->id,
        'round' => 1,
        'responded_by' => $petugasLoket->id,
        'response' => 'Bukti fisik telah ditemukan di bundle terpisah.',
    ]);

    $clar1Res1 = BapClarificationResolution::factory()->create([
        'bap_clarification_request_id' => $clarification1->id,
        'bap_clarification_response_id' => $clar1Resp1->id,
        'resolved_by' => $petugasPenetapan->id,
        'outcome' => BapClarificationResolutionOutcome::Resolved,
        'notes' => 'Pemeriksaan ulang fisik cocok.',
    ]);

    // Phase 1 Attempt 2 (Passed)
    $v2 = BapVerification::factory()
        ->completed(BapVerificationResult::Passed)
        ->create([
            'bap_id' => $tailBap->id,
            'verifier_id' => $petugasPenetapan->id,
            'stage' => BapVerificationStage::Phase1,
            'attempt' => 2,
            'started_at' => now()->subHours(6),
            'completed_at' => now()->subHours(5),
        ]);

    $v2ItemUsage = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v2->id,
        'type' => BapVerificationChecklistType::UsageQuantity,
        'expected_quantity' => 25,
        'actual_quantity' => 25,
    ]);

    // Phase 2 Attempt 1 (Discrepancy with multi-round clarification)
    $v3 = BapVerification::factory()
        ->completed(BapVerificationResult::Discrepancy)
        ->create([
            'bap_id' => $tailBap->id,
            'verifier_id' => $petugasVerifikasi->id,
            'stage' => BapVerificationStage::Phase2,
            'attempt' => 1,
            'started_at' => now()->subHours(4),
            'completed_at' => now()->subHours(3),
        ]);

    $v3ItemUsage = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v3->id,
        'type' => BapVerificationChecklistType::UsageQuantity,
        'expected_quantity' => 25,
        'actual_quantity' => 24,
        'quantity_difference' => -1,
    ]);

    $v3Discrepancy = BapVerificationDiscrepancy::factory()->forChecklistItem($v3ItemUsage)->create([
        'expected_value' => '25',
        'actual_value' => '24',
        'difference' => -1,
        'notes' => 'Perlu klarifikasi tindisan fisik',
    ]);

    $clarification2 = BapClarificationRequest::factory()->forVerification($v3)->create([
        'bap_id' => $tailBap->id,
        'status' => BapClarificationStatus::Resolved,
    ]);

    // Multi-round: Round 1 Unresolved
    $clar2Resp1 = BapClarificationResponse::factory()->create([
        'bap_clarification_request_id' => $clarification2->id,
        'round' => 1,
        'responded_by' => $petugasLoket->id,
        'response' => 'Penjelasan awal ronde 1 loket.',
    ]);

    $clar2Res1 = BapClarificationResolution::factory()->create([
        'bap_clarification_request_id' => $clarification2->id,
        'bap_clarification_response_id' => $clar2Resp1->id,
        'resolved_by' => $petugasVerifikasi->id,
        'outcome' => BapClarificationResolutionOutcome::Reopened,
        'notes' => 'Masih butuh penjelasan fisik lanjutan.',
    ]);

    // Multi-round: Round 2 Resolved
    $clar2Resp2 = BapClarificationResponse::factory()->create([
        'bap_clarification_request_id' => $clarification2->id,
        'round' => 2,
        'responded_by' => $petugasLoket->id,
        'response' => 'Penjelasan lanjutan ronde 2 dan bukti fisik diserahkan.',
    ]);

    $clar2Res2 = BapClarificationResolution::factory()->create([
        'bap_clarification_request_id' => $clarification2->id,
        'bap_clarification_response_id' => $clar2Resp2->id,
        'resolved_by' => $petugasVerifikasi->id,
        'outcome' => BapClarificationResolutionOutcome::Resolved,
        'notes' => 'Diterima penuh setelah verifikasi kedua.',
    ]);

    // Phase 2 Attempt 2 (Passed)
    $v4 = BapVerification::factory()
        ->completed(BapVerificationResult::Passed)
        ->create([
            'bap_id' => $tailBap->id,
            'verifier_id' => $petugasVerifikasi->id,
            'stage' => BapVerificationStage::Phase2,
            'attempt' => 2,
            'started_at' => now()->subHours(2),
            'completed_at' => now()->subHours(1),
        ]);

    $v4ItemUsage = BapVerificationChecklistItem::factory()->create([
        'bap_verification_id' => $v4->id,
        'type' => BapVerificationChecklistType::UsageQuantity,
        'expected_quantity' => 25,
        'actual_quantity' => 25,
    ]);

    // Existing domain audits for tail BAP
    $domainAudit = app(RecordDomainAudit::class);
    $domainAudit->handle($petugasLoket, $tailBap, 'bap.created', null, ['id' => $tailBap->id]);
    $domainAudit->handle($petugasLoket, $tailBap, 'bap.submitted', null, ['id' => $tailBap->id]);
    $domainAudit->handle($bendaharaBarang, $tailBap, 'bap.received', null, ['id' => $tailBap->id]);

    return [
        'loket' => $loket,
        'superadmin' => $superadmin,
        'petugasLoket' => $petugasLoket,
        'petugasPenetapan' => $petugasPenetapan,
        'petugasVerifikasi' => $petugasVerifikasi,
        'bendaharaBarang' => $bendaharaBarang,
        'box' => $box,
        'allocation1' => $allocation1,
        'allocation2' => $allocation2,
        'nonTailBap' => $nonTailBap,
        'tailBap' => $tailBap,
        'checklistIds' => [
            $v1ItemUsage->id, $v1ItemNum->id, $v1ItemTindisan->id, $v1ItemCanc->id, $v1ItemOnline->id,
            $v2ItemUsage->id, $v3ItemUsage->id, $v4ItemUsage->id,
        ],
        'discrepancyIds' => [$v1Discrepancy->id, $v3Discrepancy->id],
        'responseIds' => [$clar1Resp1->id, $clar2Resp1->id, $clar2Resp2->id],
        'resolutionIds' => [$clar1Res1->id, $clar2Res1->id, $clar2Res2->id],
        'clarificationIds' => [$clarification1->id, $clarification2->id],
        'verificationIds' => [$v1->id, $v2->id, $v3->id, $v4->id],
        'cancellationIds' => [$cancellation1->id, $cancellation2->id],
        'segmentIds' => [$segmentTail->id],
    ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

test('1, 4, 5, 6, 12: Superadmin successfully hard-deletes completed tail BAP with full child graph, preserving master entities, reconciling allocations, and creating audit snapshot', function () {
    $ctx = createHardDeleteFullGraphContext();
    $bap = $ctx['tailBap'];
    $bapId = $bap->id;
    $documentNumber = $bap->document_number;
    $reason = 'Permintaan resmi penghapusan tail BAP karena koreksi administratif mendesak.';

    $response = $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $bap), [
            'confirmation_document_number' => $documentNumber,
            'reason' => $reason,
        ]);

    $response->assertRedirect(route('baps.index'));
    // 1 & 12: BAP root row deleted without foreign key constraint errors
    $this->assertDatabaseMissing('baps', ['id' => $bapId]);

    // 4: Entire child graph deleted
    $this->assertDatabaseMissing('bap_usage_segments', ['bap_id' => $bapId]);
    $this->assertDatabaseMissing('bap_cancellations', ['bap_id' => $bapId]);
    $this->assertDatabaseMissing('bap_verifications', ['bap_id' => $bapId]);

    foreach ($ctx['checklistIds'] as $id) {
        $this->assertDatabaseMissing('bap_verification_checklist_items', ['id' => $id]);
    }
    foreach ($ctx['discrepancyIds'] as $id) {
        $this->assertDatabaseMissing('bap_verification_discrepancies', ['id' => $id]);
    }
    foreach ($ctx['clarificationIds'] as $id) {
        $this->assertDatabaseMissing('bap_clarification_requests', ['id' => $id]);
    }
    foreach ($ctx['responseIds'] as $id) {
        $this->assertDatabaseMissing('bap_clarification_responses', ['id' => $id]);
    }
    foreach ($ctx['resolutionIds'] as $id) {
        $this->assertDatabaseMissing('bap_clarification_resolutions', ['id' => $id]);
    }

    // 5: Master entities intact & allocation reconciliation
    $this->assertDatabaseHas('lokets', ['id' => $ctx['loket']->id]);
    $this->assertDatabaseHas('skpd_boxes', ['id' => $ctx['box']->id]);
    $this->assertDatabaseHas('users', ['id' => $ctx['petugasLoket']->id]);
    $this->assertDatabaseHas('users', ['id' => $ctx['superadmin']->id]);
    $this->assertDatabaseHas('users', ['id' => $ctx['bendaharaBarang']->id]);

    // Allocation 1 untouched: still completed
    expect($ctx['allocation1']->refresh()->status)->toBe(SkpdAllocationStatus::Completed);

    // Allocation 2 reconciled: now accepted because only 5 sets from BAP 1 remain used out of 30
    $allocation2 = $ctx['allocation2']->refresh();
    expect($allocation2->status)->toBe(SkpdAllocationStatus::Accepted);
    $remainingUsage = (int) BapUsageSegment::query()
        ->where('skpd_allocation_id', $allocation2->id)
        ->sum('quantity');
    expect($remainingUsage)->toBe(5);

    // 6: All prior audit records remain intact
    expect(AuditLog::query()
        ->where('auditable_type', Bap::class)
        ->where('auditable_id', $bapId)
        ->whereIn('event', ['bap.created', 'bap.submitted', 'bap.received'])
        ->count())->toBe(3);

    // 6: bap.hard_deleted audit entry created with snapshot and reason
    $hardDeleteAudit = AuditLog::query()
        ->where('auditable_type', Bap::class)
        ->where('auditable_id', $bapId)
        ->where('event', 'bap.hard_deleted')
        ->sole();

    expect($hardDeleteAudit->actor_id)->toBe($ctx['superadmin']->id)
        ->and($hardDeleteAudit->old_values['hard_delete_reason'])->toBe($reason)
        ->and($hardDeleteAudit->old_values['document_number'])->toBe($documentNumber)
        ->and($hardDeleteAudit->old_values['id'])->toBe($bapId)
        ->and($hardDeleteAudit->old_values['cancellations_count'])->toBe(2)
        ->and($hardDeleteAudit->old_values['verifications_count'])->toBe(4)
        ->and($hardDeleteAudit->old_values['clarifications_count'])->toBe(2)
        ->and($hardDeleteAudit->old_values['clarification_responses_count'])->toBe(3)
        ->and($hardDeleteAudit->old_values['clarification_resolutions_count'])->toBe(3)
        ->and($hardDeleteAudit->old_values['allocation_impact'])->toBeArray()
        ->and($hardDeleteAudit->old_values['allocation_impact'][0]['id'])->toBe($allocation2->id)
        ->and($hardDeleteAudit->old_values['allocation_impact'][0]['status_before'])->toBe('completed')
        ->and($hardDeleteAudit->old_values['allocation_impact'][0]['status_after'])->toBe('accepted')
        ->and($hardDeleteAudit->old_values['allocation_impact'][0]['released_quantity'])->toBe(25);
});

test('2: non-tail BAP deletion is rejected and leaves all data completely intact', function () {
    $ctx = createHardDeleteFullGraphContext();
    $nonTailBap = $ctx['nonTailBap'];
    $nonTailId = $nonTailBap->id;

    $response = $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $nonTailBap), [
            'confirmation_document_number' => $nonTailBap->document_number,
            'reason' => 'Mencoba menghapus BAP yang bukan tail.',
        ]);

    $response->assertSessionHasErrors(['bap']);

    // Assert non-tail BAP and all its associations remain intact
    $this->assertDatabaseHas('baps', ['id' => $nonTailId]);
    $this->assertDatabaseHas('bap_usage_segments', ['bap_id' => $nonTailId]);
    $this->assertDatabaseMissing('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $nonTailId,
        'event' => 'bap.hard_deleted',
    ]);
});

test('3: Superadmin cannot hard delete a non-completed BAP', function (BapStatus $status) {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];
    $tailBap->update(['status' => $status]);

    $response = $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Mencoba menghapus BAP yang belum completed.',
        ]);

    $response->assertRedirect()->assertSessionHasErrors(['bap']);
    $this->assertDatabaseHas('baps', ['id' => $tailBap->id]);
})->with([
    'Draft' => BapStatus::Draft,
    'NeedsClarification' => BapStatus::NeedsClarification,
    'VerifiedPhase2' => BapStatus::VerifiedPhase2,
]);

test('7: every non-superadmin role receives direct HTTP 403 on hard delete route', function (UserRole $role) {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];

    $user = User::factory()->create([
        'role' => $role,
        'loket_id' => $role === UserRole::PetugasLoket ? $ctx['loket']->id : null,
    ]);

    $response = $this->actingAs($user)
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Upaya penghapusan tanpa hak akses Superadmin.',
        ]);

    $response->assertForbidden();
    $this->assertDatabaseHas('baps', ['id' => $tailBap->id]);
})->with([
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Kasie Penetapan' => UserRole::KasiePenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
    'Kasie Verifikasi' => UserRole::KasieVerifikasi,
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);

test('7 (validation): invalid confirmation document number and reason are rejected without performing deletion', function () {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];

    // Mismatched document number
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => 'PB/WRONG/99/99/9999',
            'reason' => 'Alasan yang sah dan valid minimal 10 karakter.',
        ])
        ->assertSessionHasErrors(['confirmation_document_number']);

    // Missing confirmation document number
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'reason' => 'Alasan yang sah dan valid minimal 10 karakter.',
        ])
        ->assertSessionHasErrors(['confirmation_document_number']);

    // Reason too short (< 10 characters)
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Pendek',
        ])
        ->assertSessionHasErrors(['reason']);

    // Prohibited fields supplied
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Alasan yang sah dan valid minimal 10 karakter.',
            'status' => 'draft',
            'bap_id' => $tailBap->id,
        ])
        ->assertSessionHasErrors(['status', 'bap_id']);

    // Data remains completely intact
    $this->assertDatabaseHas('baps', ['id' => $tailBap->id]);
    $this->assertDatabaseMissing('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $tailBap->id,
        'event' => 'bap.hard_deleted',
    ]);
});

test('8: transaction rollback ensures all root, child entities, and allocation statuses remain intact when domain audit fails', function () {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];
    $tailBapId = $tailBap->id;

    $auditMock = Mockery::mock(RecordDomainAudit::class);
    $auditMock->shouldReceive('handle')
        ->andReturnUsing(function (User $actor, Model $model, string $event, ?array $oldValues = null, ?array $newValues = null) {
            if ($event === 'bap.hard_deleted') {
                throw new RuntimeException('Simulated domain audit failure causing transaction rollback.');
            }
        });
    $this->app->instance(RecordDomainAudit::class, $auditMock);

    expect(function () use ($ctx, $tailBap) {
        $this->withoutExceptionHandling()
            ->actingAs($ctx['superadmin'])
            ->delete(route('baps.hard-delete', $tailBap), [
                'confirmation_document_number' => $tailBap->document_number,
                'reason' => 'Alasan valid untuk menguji kegagalan rollback transaksi.',
            ]);
    })->toThrow(RuntimeException::class, 'Simulated domain audit failure');

    // BAP and children remain intact due to atomic rollback
    $this->assertDatabaseHas('baps', ['id' => $tailBapId]);
    $this->assertDatabaseHas('bap_usage_segments', ['bap_id' => $tailBapId]);
    $this->assertDatabaseHas('bap_cancellations', ['bap_id' => $tailBapId]);
    $this->assertDatabaseHas('bap_verifications', ['bap_id' => $tailBapId]);
    $this->assertDatabaseHas('bap_clarification_requests', ['bap_id' => $tailBapId]);

    // Allocation status has not been altered
    expect($ctx['allocation2']->refresh()->status)->toBe(SkpdAllocationStatus::Completed);

    // No hard_deleted audit log committed
    $this->assertDatabaseMissing('audit_logs', [
        'auditable_type' => Bap::class,
        'auditable_id' => $tailBapId,
        'event' => 'bap.hard_deleted',
    ]);
});

test('9: deleted tail numerator range can be re-created via existing CreateBap without modifying generator', function () {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];
    $petugas = $ctx['petugasLoket'];
    $loket = $ctx['loket'];

    // Hard-delete the tail BAP
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Menghapus BAP tail agar nomor urut dapat didaftarkan kembali.',
        ])
        ->assertRedirect(route('baps.index'));

    $this->assertDatabaseMissing('baps', ['id' => $tailBap->id]);

    // Re-create a new BAP for the exact same numerator range on a valid current service date
    $createBap = app(CreateBap::class);
    $newBap = $createBap->handle(
        actor: $petugas,
        loket: $loket,
        serviceDate: now(),
        numeratorStart: 500_026,
        numeratorEnd: 500_050,
        onlineUsageCount: 8,
        cancellationCount: 0,
        cancellations: [],
    );

    expect($newBap->numerator_start)->toBe(500_026)
        ->and($newBap->numerator_end)->toBe(500_050)
        ->and($newBap->status)->toBe(BapStatus::Draft)
        ->and($newBap->loket_id)->toBe($loket->id)
        ->and($newBap->document_number)->toBe('PB/LOKET/'.now()->format('d/m/Y'));

    $this->assertDatabaseHas('baps', ['id' => $newBap->id]);
});

test('10: deleted BAP and its child records disappear from representative operational queries and endpoints', function () {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];
    $tailBapId = $tailBap->id;

    // Verify presence before delete in Buku Kendali
    $this->actingAs($ctx['bendaharaBarang'])
        ->get(route('buku-kendali.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('buku-kendali/index')
            ->where('baps.data.0.id', $tailBapId)
        );

    // Hard delete
    $this->actingAs($ctx['superadmin'])
        ->delete(route('baps.hard-delete', $tailBap), [
            'confirmation_document_number' => $tailBap->document_number,
            'reason' => 'Pembersihan tuntas entitas operasional BAP.',
        ])
        ->assertRedirect(route('baps.index'));

    // Gone from Buku Kendali
    $this->actingAs($ctx['bendaharaBarang'])
        ->get(route('buku-kendali.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('buku-kendali/index')
            ->where('baps.data.0.id', $ctx['nonTailBap']->id)
            ->missing('baps.data.1')
        );

    // Gone from Administrative Receipt queue
    $this->actingAs($ctx['bendaharaBarang'])
        ->get(route('bap-administrations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bap-administrations/index')
            ->where('baps.data', [])
        );

    // Child records gone from database queries
    expect(BapVerification::query()->where('bap_id', $tailBapId)->exists())->toBeFalse()
        ->and(BapCancellation::query()->where('bap_id', $tailBapId)->exists())->toBeFalse()
        ->and(BapClarificationRequest::query()->where('bap_id', $tailBapId)->exists())->toBeFalse()
        ->and(BapUsageSegment::query()->where('bap_id', $tailBapId)->exists())->toBeFalse();
});

test('11: show endpoint exposes can.hard_delete as true only for Superadmin on completed tail BAP', function () {
    $ctx = createHardDeleteFullGraphContext();
    $tailBap = $ctx['tailBap'];
    $nonTailBap = $ctx['nonTailBap'];

    // Superadmin on completed tail: true
    $this->actingAs($ctx['superadmin'])
        ->get(route('baps.show', $tailBap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.can.hard_delete', true)
        );

    // Superadmin on completed non-tail: false
    $this->actingAs($ctx['superadmin'])
        ->get(route('baps.show', $nonTailBap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.can.hard_delete', false)
        );

    // Ordinary role (Petugas Loket) on completed tail: false
    $this->actingAs($ctx['petugasLoket'])
        ->get(route('baps.show', $tailBap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.can.hard_delete', false)
        );

    // Superadmin on non-completed tail (Draft): false
    $draftTailBap = Bap::factory()->create([
        'loket_id' => $ctx['loket']->id,
        'document_number' => 'PB/LOKET/'.now()->addDay()->format('d/m/Y'),
        'service_date' => now()->addDay()->toDateString(),
        'numerator_start' => 500_051,
        'numerator_end' => 500_060,
        'total_usage' => 10,
        'online_usage_count' => 5,
        'status' => BapStatus::Draft,
        'created_by' => $ctx['petugasLoket']->id,
    ]);

    $this->actingAs($ctx['superadmin'])
        ->get(route('baps.show', $draftTailBap))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('baps/show')
            ->where('bap.can.hard_delete', false)
        );
});
