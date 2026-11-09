<?php

use App\Actions\SkpdInventory\RegisterSkpdBox;
use App\BapStatus;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Database\Seeders\DevelopmentUserSeeder;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

function phaseSeventeenSuperadmin(): User
{
    return User::factory()->create(['role' => UserRole::Superadmin]);
}

function phaseSeventeenAcceptedAllocation(User $petugas, Loket $loket): SkpdAllocation
{
    $box = SkpdBox::factory()->create([
        'box_number' => 'BOX-PHASE-17-'.fake()->unique()->bothify('####??'),
        'numerator_start' => 5_826_080,
        'numerator_end' => 5_826_099,
        'total_sets' => 20,
    ]);

    return SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => $loket->id,
        'numerator_start' => 5_826_080,
        'numerator_end' => 5_826_099,
        'quantity' => 20,
        'status' => SkpdAllocationStatus::Accepted,
        'created_by' => $petugas->id,
        'accepted_by' => $petugas->id,
        'accepted_at' => now(),
    ]);
}

/**
 * @return array{service_date: string, numerator_start: string, numerator_end: string, online_usage_count: int, cancellation_count: int}
 */
function phaseSeventeenBapPayload(): array
{
    return [
        'service_date' => now()->toDateString(),
        'numerator_start' => '5826080',
        'numerator_end' => '5826084',
        'online_usage_count' => 2,
        'cancellation_count' => 0,
    ];
}

test('superadmin manages Loket master data and inactive Loket is excluded from new assignments', function () {
    $superadmin = phaseSeventeenSuperadmin();
    $petugas = User::factory()->create(['role' => UserRole::PetugasPenetapan]);

    $this->actingAs($petugas)
        ->get(route('lokets.index'))
        ->assertForbidden();

    $this->actingAs($superadmin)
        ->post(route('lokets.store'), [
            'code' => 'samsat-kantor',
            'name' => 'SAMSAT Kantor',
            'description' => 'Loket layanan utama.',
        ])
        ->assertRedirect();

    $loket = Loket::query()->sole();

    expect($loket->code)->toBe('SAMSAT-KANTOR')
        ->and($loket->is_active)->toBeTrue();
    $this->assertDatabaseHas('audit_logs', ['event' => 'loket.created', 'auditable_id' => $loket->id]);

    $this->actingAs($superadmin)
        ->get(route('lokets.index', ['search' => 'KANTOR', 'status' => 'active']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('lokets/index')
            ->where('lokets.data.0.id', $loket->id)
            ->where('lokets.data.0.code', 'SAMSAT-KANTOR')
            ->etc(),
        );

    $this->actingAs($superadmin)
        ->put(route('lokets.update', $loket), [
            'code' => $loket->code,
            'name' => $loket->name,
            'description' => $loket->description,
            'is_active' => false,
        ])
        ->assertRedirect();

    expect($loket->fresh()->is_active)->toBeFalse();
    $this->assertDatabaseHas('audit_logs', ['event' => 'loket.deactivated', 'auditable_id' => $loket->id]);

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'petugas.inactive-loket',
            'name' => 'Petugas Loket Tidak Aktif',
            'nip' => '199001012020011010',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::PetugasLoket->value,
            'loket_id' => $loket->id,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('loket_id');

    $loket->update(['is_active' => true]);
    User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);

    $this->actingAs($superadmin)
        ->put(route('lokets.update', $loket), [
            'code' => $loket->code,
            'name' => $loket->name,
            'description' => $loket->description,
            'is_active' => false,
        ])
        ->assertSessionHasErrors('is_active');

    $this->actingAs($superadmin)
        ->delete(route('lokets.destroy', $loket))
        ->assertSessionHasErrors('loket');

    $this->assertDatabaseHas('lokets', ['id' => $loket->id]);
});

test('Loket detail lists assigned users with readable role labels', function () {
    $superadmin = phaseSeventeenSuperadmin();
    $loket = Loket::factory()->create();
    $petugas = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);

    $this->actingAs($superadmin)
        ->get(route('lokets.show', $loket))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('lokets/show')
            ->where('loket.users.0.id', $petugas->id)
            ->where('loket.users.0.role', UserRole::PetugasLoket->value)
            ->where('loket.users.0.role_label', 'Petugas Loket')
            ->etc(),
        );
});

test('NIP is mandatory unique and exactly eighteen digits for managed users', function () {
    $superadmin = phaseSeventeenSuperadmin();

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'nip-invalid',
            'name' => 'NIP Invalid',
            'nip' => '123',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::BendaharaBarang->value,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('nip');

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'nip-valid',
            'name' => 'NIP Valid',
            'nip' => '199001012020011011',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::BendaharaBarang->value,
            'is_active' => true,
        ])
        ->assertRedirect();

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'nip-duplicate',
            'name' => 'NIP Duplikat',
            'nip' => '199001012020011011',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::BendaharaBarang->value,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('nip');
});

test('Box metadata is editable but its range and historical allocation protect it from deletion', function () {
    $bendahara = User::factory()->create(['role' => UserRole::BendaharaBarang]);
    $box = app(RegisterSkpdBox::class)->handle(
        $bendahara,
        'BOX-PHASE-17',
        5_826_080,
        5_826_099,
        CarbonImmutable::parse('2026-09-01 09:00:00'),
    );

    $this->actingAs($bendahara)
        ->put(route('skpd.boxes.update', $box), [
            'box_number' => 'BOX-PHASE-17-REVISI',
            'central_storage_location' => 'Gudang Arsip Bendahara',
            'received_at' => '2026-09-01',
            'numerator_start' => '0000001',
            'numerator_end' => '0000002',
        ])
        ->assertRedirect();

    $box->refresh();
    expect($box->box_number)->toBe('BOX-PHASE-17-REVISI')
        ->and($box->central_storage_location)->toBe('Gudang Arsip Bendahara')
        ->and($box->numerator_start)->toBe(5_826_080)
        ->and($box->numerator_end)->toBe(5_826_099);
    $this->assertDatabaseHas('audit_logs', ['event' => 'skpd_box.updated', 'auditable_id' => $box->id]);

    SkpdAllocation::factory()->create([
        'skpd_box_id' => $box->id,
        'loket_id' => Loket::factory(),
        'created_by' => $bendahara->id,
    ]);

    $this->actingAs($bendahara)
        ->delete(route('skpd.boxes.destroy', $box))
        ->assertSessionHasErrors('box');

    $this->assertDatabaseHas('skpd_boxes', ['id' => $box->id]);
});

test('only a history-free draft BAP can be deleted and its allocation returns to its derived state', function () {
    $loket = Loket::factory()->create();
    $petugas = User::factory()->create([
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
    ]);
    $allocation = phaseSeventeenAcceptedAllocation($petugas, $loket);

    $this->actingAs($petugas)
        ->post(route('baps.store'), phaseSeventeenBapPayload())
        ->assertRedirect();

    $bap = Bap::query()->sole();

    $this->actingAs($petugas)
        ->delete(route('baps.destroy', $bap))
        ->assertRedirect(route('baps.index'));

    $this->assertDatabaseMissing('baps', ['id' => $bap->id]);
    $this->assertDatabaseMissing('bap_usage_segments', ['bap_id' => $bap->id]);
    expect($allocation->fresh()->status)->toBe(SkpdAllocationStatus::Accepted);
    $this->assertDatabaseHas('audit_logs', ['event' => 'bap.deleted', 'auditable_id' => $bap->id]);

    $this->actingAs($petugas)
        ->post(route('baps.store'), phaseSeventeenBapPayload())
        ->assertRedirect();

    $submittedBap = Bap::query()->sole();

    $this->actingAs($petugas)
        ->post(route('baps.submit', $submittedBap))
        ->assertRedirect();

    expect($submittedBap->fresh()->status)->toBe(BapStatus::Submitted);

    $this->actingAs($petugas)
        ->delete(route('baps.destroy', $submittedBap))
        ->assertForbidden();

    $this->assertDatabaseHas('baps', ['id' => $submittedBap->id]);
});

test('development seed data is idempotent, uses the documented roles, and logs in by username', function () {
    $seeder = app(DevelopmentUserSeeder::class);

    $seeder->run();
    $seeder->run();

    expect(User::query()->count())->toBe(7)
        ->and(Loket::query()->count())->toBe(4);

    $simson = User::query()->where('username', 'simson.sae')->firstOrFail();
    expect($simson->name)->toBe('Simson Sae')
        ->and($simson->nip)->toBe('197709032007011010')
        ->and($simson->role)->toBe(UserRole::PetugasLoket)
        ->and($simson->loket?->code)->toBe('SAMSAT-KANTOR')
        ->and(Hash::check('password', $simson->password))->toBeTrue();

    $expectedUsers = [
        'elwinmusadi16' => ['199707162025061002', UserRole::Superadmin],
        'yunus.asamani' => ['197907302009011003', UserRole::BendaharaBarang],
        'simson.sae' => ['197709032007011010', UserRole::PetugasLoket],
        'lily.toelle' => ['197012281993092001', UserRole::PetugasPenetapan],
        'jevon.wilahuky' => ['200408152025211001', UserRole::PetugasVerifikasi],
        'nena.maing' => ['198804212011012006', UserRole::KasiePenetapan],
        'jonny.alfreth' => ['197106152007011039', UserRole::KasieVerifikasi],
    ];

    foreach ($expectedUsers as $username => [$nip, $role]) {
        $user = User::query()->where('username', $username)->firstOrFail();

        expect($user->nip)->toBe($nip)
            ->and($user->role)->toBe($role)
            ->and($user->is_active)->toBeTrue();

        $this->post(route('login.store'), [
            'username' => $username,
            'password' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
        $this->post(route('logout'))->assertRedirect();
        $this->assertGuest();
    }
});
