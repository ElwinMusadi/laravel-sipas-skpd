<?php

use App\Models\AuditLog;
use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('petugas loket cannot access user management through direct HTTP requests', function () {
    $user = User::factory()->create(['role' => UserRole::PetugasLoket]);

    $this->actingAs($user)
        ->get(route('users.index'))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('users.store'), [
            'username' => 'bypass-user',
            'name' => 'Bypass User',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::Superadmin->value,
            'is_active' => true,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('users', ['username' => 'bypass-user']);
});

test('superadmin can access user management', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->where('auth.permissions.manageUsers', true)
            ->etc(),
        );
});

test('superadmin can create an active petugas loket user with a loket assignment', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $loket = Loket::factory()->create(['name' => 'Loket Utama']);

    $response = $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'PETUGAS.LOKET',
            'name' => 'Petugas Loket',
            'nip' => '199001012020011001',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::PetugasLoket->value,
            'loket_id' => $loket->id,
            'is_active' => true,
        ]);

    $user = User::query()->where('username', 'petugas.loket')->firstOrFail();

    $response->assertRedirect(route('users.show', $user));
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'username' => 'petugas.loket',
        'nip' => '199001012020011001',
        'role' => UserRole::PetugasLoket->value,
        'loket_id' => $loket->id,
        'is_active' => true,
    ]);
    expect(Hash::check('Password-aman-123!', $user->password))->toBeTrue();

    $audit = AuditLog::query()->where('event', 'user.created')->firstOrFail();
    expect($audit->new_values)
        ->toHaveKey('username', 'petugas.loket')
        ->not->toHaveKey('password');
});

test('superadmin can deactivate a user and their active session loses access', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $user = User::factory()->create(['role' => UserRole::PetugasPenetapan]);

    $this->actingAs($superadmin)
        ->put(route('users.update', $user), [
            'username' => $user->username,
            'name' => $user->name,
            'nip' => $user->nip,
            'role' => UserRole::PetugasPenetapan->value,
            'is_active' => false,
        ])
        ->assertRedirect(route('users.show', $user));

    $this->assertDatabaseHas('users', ['id' => $user->id, 'is_active' => false]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'user.deactivated']);

    $this->actingAs($user->fresh())
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('superadmin can reset a password without exposing it in the audit trail', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $user = User::factory()->create(['role' => UserRole::BendaharaBarang]);

    $this->actingAs($superadmin)
        ->post(route('users.reset-password', $user), [
            'password' => 'Password-baru-123!',
            'password_confirmation' => 'Password-baru-123!',
        ])
        ->assertRedirect(route('users.show', $user));

    expect(Hash::check('Password-baru-123!', $user->fresh()->password))->toBeTrue();

    $audit = AuditLog::query()->where('event', 'user.password_reset')->firstOrFail();
    expect($audit->old_values)->toBeNull();
    expect($audit->new_values)->toBeNull();
});

test('user detail response never includes a password', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $user = User::factory()->create(['role' => UserRole::KepalaUptd]);

    $this->actingAs($superadmin)
        ->get(route('users.show', $user))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/show')
            ->where('user.username', $user->username)
            ->missing('user.password')
            ->etc(),
        );
});

test('superadmin can filter users by search role status and loket', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $loket = Loket::factory()->create(['name' => 'Loket Barat']);
    $matchingUser = User::factory()->create([
        'username' => 'petugas-barat',
        'role' => UserRole::PetugasLoket,
        'loket_id' => $loket->id,
        'is_active' => true,
    ]);
    User::factory()->create(['role' => UserRole::PetugasLoket]);

    $this->actingAs($superadmin)
        ->get(route('users.index', [
            'search' => 'barat',
            'role' => UserRole::PetugasLoket->value,
            'status' => 'active',
            'loket' => $loket->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->where('users.data.0.id', $matchingUser->id)
            ->where('users.data.0.loket.id', $loket->id)
            ->etc(),
        );
});

test('petugas loket requires a loket assignment', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->post(route('users.store'), [
            'username' => 'loket-tanpa-relasi',
            'name' => 'Petugas Tanpa Loket',
            'nip' => '199001012020011002',
            'password' => 'Password-aman-123!',
            'password_confirmation' => 'Password-aman-123!',
            'role' => UserRole::PetugasLoket->value,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('loket_id');

    $this->assertDatabaseMissing('users', ['username' => 'loket-tanpa-relasi']);
});

test('a session started before an admin password reset is signed out on its next request', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $user = User::factory()->create(['role' => UserRole::BendaharaBarang]);
    $sessionBeforeReset = ['password_hash_web' => Auth::guard('web')->hashPasswordForCookie($user->password)];

    $this->withSession($sessionBeforeReset)
        ->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();

    $this->actingAs($superadmin)
        ->post(route('users.reset-password', $user), [
            'password' => 'Password-baru-123!',
            'password_confirmation' => 'Password-baru-123!',
        ])
        ->assertRedirect(route('users.show', $user));

    $this->withSession($sessionBeforeReset)
        ->actingAs($user->fresh())
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('a superadmin cannot deactivate or demote their own account', function (array $changes, string $field, string $message) {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin, 'is_active' => true]);

    $this->actingAs($superadmin)
        ->from(route('users.edit', $superadmin))
        ->put(route('users.update', $superadmin), [
            'username' => $superadmin->username,
            'name' => $superadmin->name,
            'nip' => $superadmin->nip,
            'role' => UserRole::Superadmin->value,
            'is_active' => true,
            ...$changes,
        ])
        ->assertRedirect(route('users.edit', $superadmin))
        ->assertSessionHasErrors([$field => $message]);

    $this->assertDatabaseHas('users', [
        'id' => $superadmin->id,
        'role' => UserRole::Superadmin->value,
        'is_active' => true,
    ]);
    $this->assertDatabaseMissing('audit_logs', ['auditable_id' => $superadmin->id, 'event' => 'user.deactivated']);
})->with([
    'deactivate' => [['is_active' => false], 'is_active', 'Anda tidak dapat menonaktifkan akun Anda sendiri.'],
    'demote' => [['role' => UserRole::PetugasPenetapan->value], 'role', 'Anda tidak dapat mengubah peran akun Anda sendiri.'],
]);

test('a superadmin can still deactivate another superadmin', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $otherSuperadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->put(route('users.update', $otherSuperadmin), [
            'username' => $otherSuperadmin->username,
            'name' => $otherSuperadmin->name,
            'nip' => $otherSuperadmin->nip,
            'role' => UserRole::Superadmin->value,
            'is_active' => false,
        ])
        ->assertRedirect(route('users.show', $otherSuperadmin))
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('users', ['id' => $otherSuperadmin->id, 'is_active' => false]);
});
