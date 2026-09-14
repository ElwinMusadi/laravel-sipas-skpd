<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;

/**
 * @return array{result: string, notes: string, checklist: list<array<string, int|bool|string>>, discrepancies: list<array{type: string, notes: string}>}
 */
function phaseSixteenPassingVerificationPayload(Bap $bap): array
{
    return [
        'result' => BapVerificationResult::Passed->value,
        'notes' => 'Pemeriksaan Superadmin sesuai dengan data dan bukti fisik.',
        'checklist' => [
            ['type' => BapVerificationChecklistType::UsageQuantity->value, 'is_attested' => true, 'actual_quantity' => $bap->total_usage],
            ['type' => BapVerificationChecklistType::Numerator->value, 'is_attested' => true, 'actual_numerator_start' => $bap->numerator_start, 'actual_numerator_end' => $bap->numerator_end],
            ['type' => BapVerificationChecklistType::TindisanSets->value, 'is_attested' => true, 'actual_quantity' => $bap->total_usage],
            ['type' => BapVerificationChecklistType::Cancellation->value, 'is_attested' => true, 'actual_quantity' => $bap->cancellations()->count()],
            ['type' => BapVerificationChecklistType::Online->value, 'is_attested' => true, 'actual_quantity' => $bap->online_usage_count],
        ],
        'discrepancies' => [],
    ];
}

/**
 * @return array{result: string, notes: string, checklist: list<array<string, int|bool|string>>, discrepancies: list<array{type: string, notes: string}>}
 */
function phaseSixteenDiscrepancyVerificationPayload(Bap $bap): array
{
    $payload = phaseSixteenPassingVerificationPayload($bap);
    $payload['result'] = BapVerificationResult::Discrepancy->value;
    $payload['notes'] = 'Perlu klarifikasi bukti online sebelum pemeriksaan ulang.';
    $payload['checklist'][4]['actual_quantity'] = $bap->online_usage_count - 1;
    $payload['discrepancies'] = [[
        'type' => BapVerificationChecklistType::Online->value,
        'notes' => 'Satu bukti online belum ditemukan pada bundel fisik.',
    ]];

    return $payload;
}

test('Superadmin without a Loket can administer all available SIPAS-SKPD workflows while retaining their audit identity', function () {
    $superadmin = User::factory()->create([
        'role' => UserRole::Superadmin,
        'loket_id' => null,
    ]);
    $loket = Loket::factory()->create(['name' => 'Loket Phase 16']);

    $this->actingAs($superadmin)
        ->get(route('baps.create', ['loket' => $loket->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('loket.id', $loket->id)
            ->where('lokets.0.id', $loket->id)
            ->etc(),
        );

    $this->actingAs($superadmin)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-PHASE-16-001',
            'numerator_start' => '5826080',
            'numerator_end' => '5826092',
            'received_at' => now()->toDateString(),
        ])
        ->assertRedirect();
    $box = SkpdBox::query()->sole();

    $this->actingAs($superadmin)
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $box->id,
            'loket_id' => $loket->id,
            'allocation_date' => now()->toDateString(),
            'numerator_start' => '5826080',
            'numerator_end' => '5826092',
        ])
        ->assertRedirect();
    $allocation = SkpdAllocation::query()->sole();

    $this->actingAs($superadmin)
        ->post(route('skpd.allocations.accept', $allocation))
        ->assertRedirect();
    expect($allocation->refresh()->status)->toBe(SkpdAllocationStatus::Accepted)
        ->and($allocation->accepted_by)->toBe($superadmin->id);

    $this->actingAs($superadmin)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-PHASE-16-002',
            'numerator_start' => '5826093',
            'numerator_end' => '5826105',
            'received_at' => now()->toDateString(),
        ])
        ->assertRedirect();
    $cancelledBox = SkpdBox::query()->where('box_number', 'BOX-PHASE-16-002')->sole();

    $this->actingAs($superadmin)
        ->post(route('skpd.allocations.store'), [
            'skpd_box_id' => $cancelledBox->id,
            'loket_id' => $loket->id,
            'allocation_date' => now()->toDateString(),
            'numerator_start' => '5826093',
            'numerator_end' => '5826105',
        ])
        ->assertRedirect();
    $cancelledAllocation = SkpdAllocation::query()->where('skpd_box_id', $cancelledBox->id)->sole();

    $this->actingAs($superadmin)
        ->post(route('skpd.allocations.cancel', $cancelledAllocation))
        ->assertRedirect();
    expect($cancelledAllocation->refresh()->status)->toBe(SkpdAllocationStatus::Cancelled);

    $this->actingAs($superadmin)
        ->post(route('baps.store'), [
            'loket_id' => $loket->id,
            'service_date' => now()->toDateString(),
            'numerator_start' => '5826080',
            'numerator_end' => '5826092',
            'online_usage_count' => 5,
            'cancellation_count' => 0,
        ])
        ->assertRedirect();
    $bap = Bap::query()->sole();

    $this->actingAs($superadmin)
        ->put(route('baps.update', $bap), [
            'service_date' => now()->toDateString(),
            'numerator_start' => '5826080',
            'numerator_end' => '5826092',
            'online_usage_count' => 6,
            'cancellation_count' => 1,
            'cancellations' => [
                [
                    'numerator' => '5826081',
                    'reason' => BapCancellationReason::PrinterError->value,
                    'description' => '',
                ],
            ],
        ])
        ->assertRedirect();
    $cancellation = BapCancellation::query()->sole();

    $this->actingAs($superadmin)
        ->post(route('baps.submit', $bap))
        ->assertRedirect();
    expect($bap->refresh()->status)->toBe(BapStatus::Submitted);

    $this->actingAs($superadmin)
        ->post(route('bap-verifications.start', $bap))
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('bap-verifications.complete', $bap), phaseSixteenDiscrepancyVerificationPayload($bap->refresh()))
        ->assertRedirect();
    $clarification = BapClarificationRequest::query()->sole();

    $this->actingAs($superadmin)
        ->post(route('bap-clarifications.open', $clarification))
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('bap-clarifications.responses.store', $clarification), [
            'response' => 'Bukti online ditemukan dan diserahkan untuk verifikasi ulang.',
        ])
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('bap-clarifications.review', $clarification), [
            'outcome' => 'resolved',
            'notes' => 'Tanggapan dan bukti fisik telah diperiksa.',
        ])
        ->assertRedirect();
    expect($bap->refresh()->status)->toBe(BapStatus::WaitingReverificationPhase1);

    $this->actingAs($superadmin)
        ->post(route('bap-verifications.start', $bap))
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('bap-verifications.complete', $bap), phaseSixteenPassingVerificationPayload($bap->refresh()))
        ->assertRedirect();
    expect($bap->refresh()->status)->toBe(BapStatus::WaitingVerificationPhase2);

    $this->actingAs($superadmin)
        ->post(route('bap-verifications-phase-2.start', $bap))
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('bap-verifications-phase-2.complete', $bap), phaseSixteenPassingVerificationPayload($bap->refresh()))
        ->assertRedirect();
    expect($bap->refresh()->status)->toBe(BapStatus::VerifiedPhase2);

    $this->actingAs($superadmin)
        ->post(route('bap-administrations.receive', $bap), ['receipt_notes' => 'Diterima administratif oleh Superadmin.'])
        ->assertRedirect();
    expect($bap->refresh()->status)->toBe(BapStatus::Completed)
        ->and($bap->received_by)->toBe($superadmin->id)
        ->and($superadmin->refresh()->loket_id)->toBeNull();

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'phase16-user',
            'name' => 'Pengguna Phase 16',
            'nip' => '199001012020011003',
            'password' => 'Phase16-password!',
            'password_confirmation' => 'Phase16-password!',
            'role' => UserRole::PetugasLoket->value,
            'loket_id' => $loket->id,
            'is_active' => true,
        ])
        ->assertRedirect();
    $managedUser = User::query()->where('username', 'phase16-user')->sole();

    $this->actingAs($superadmin)
        ->put(route('users.update', $managedUser), [
            'username' => 'phase16-user',
            'name' => 'Pengguna Phase 16 Diperbarui',
            'nip' => '199001012020011003',
            'role' => UserRole::BendaharaBarang->value,
            'loket_id' => null,
            'is_active' => false,
        ])
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(route('users.reset-password', $managedUser), [
            'password' => 'Phase16-reset-password!',
            'password_confirmation' => 'Phase16-reset-password!',
        ])
        ->assertRedirect();
    expect($managedUser->refresh()->is_active)->toBeFalse()
        ->and($managedUser->loket_id)->toBeNull()
        ->and(Hash::check('Phase16-reset-password!', $managedUser->password))->toBeTrue();

    $this->assertDatabaseHas('audit_logs', [
        'actor_id' => $superadmin->id,
        'event' => 'bap_administration.received',
    ]);

    foreach ([
        route('dashboard'),
        route('users.index'),
        route('users.show', $managedUser),
        route('users.edit', $managedUser),
        route('skpd.inventory.index'),
        route('skpd.boxes.index'),
        route('skpd.boxes.show', $box),
        route('skpd.allocations.index'),
        route('skpd.allocations.show', $allocation),
        route('baps.index'),
        route('baps.show', $bap),
        route('bap-cancellations.index'),
        route('bap-cancellations.show', $cancellation),
        route('bap-verifications.index'),
        route('bap-verifications.show', $bap),
        route('bap-verifications-phase-2.index'),
        route('bap-verifications-phase-2.show', $bap),
        route('bap-clarifications.index'),
        route('bap-clarifications.show', $clarification),
        route('bap-administrations.index'),
        route('bap-administrations.show', $bap),
        route('buku-kendali.index'),
        route('laporan-pemakaian.index'),
        route('laporan-pemakaian.pdf'),
        route('laporan-pemakaian.excel'),
    ] as $url) {
        $this->actingAs($superadmin)->get($url)->assertOk();
    }
});

test('roles other than Superadmin remain blocked from unrelated privileged workflow mutations', function () {
    $loket = Loket::factory()->create();
    $petugasLoket = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);
    $petugasPenetapan = User::factory()->create(['role' => UserRole::PetugasPenetapan]);
    $petugasVerifikasi = User::factory()->create(['role' => UserRole::PetugasVerifikasi]);
    $bendahara = User::factory()->create(['role' => UserRole::BendaharaBarang]);
    $kepalaUptd = User::factory()->create(['role' => UserRole::KepalaUptd]);

    expect(Gate::forUser($petugasLoket)->allows('manage-skpd-inventory'))->toBeFalse()
        ->and(Gate::forUser($petugasPenetapan)->allows('view-bap-verifications-phase-2'))->toBeFalse()
        ->and(Gate::forUser($petugasVerifikasi)->allows('receive-bap-administratively', new Bap))->toBeFalse()
        ->and(Gate::forUser($bendahara)->allows('start-bap-verification-phase-1', new Bap))->toBeFalse()
        ->and(Gate::forUser($kepalaUptd)->allows('manage-skpd-inventory'))->toBeFalse();

    $this->actingAs($petugasLoket)
        ->post(route('skpd.boxes.store'), [
            'box_number' => 'BOX-PHASE-16-UNAUTHORIZED',
            'numerator_start' => '5826080',
            'numerator_end' => '5826092',
            'received_at' => now()->toDateString(),
        ])
        ->assertForbidden();

    $this->assertDatabaseCount('skpd_boxes', 0);
});
