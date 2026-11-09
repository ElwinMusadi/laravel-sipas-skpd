<?php

use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Database\Seeders\LaravelCloudLoketAndSuperadminSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

afterEach(function () {
    Str::createRandomStringsNormally();
});

test('Laravel Cloud seeder creates the six Lokets and a Superadmin with a random initial password shown once', function () {
    Str::createRandomStringsUsing(fn (): string => 'initial-cloud-password-0001');

    $this->artisan('db:seed', ['--class' => LaravelCloudLoketAndSuperadminSeeder::class, '--no-interaction' => true])
        ->expectsOutputToContain('Password awal Superadmin: initial-cloud-password-0001')
        ->assertSuccessful();

    $mpp = Loket::query()->where('code', 'MPP')->sole();
    $superadmin = User::query()->where('username', 'elwinmusadi16')->sole();

    $this->assertDatabaseCount('lokets', 6);
    $this->assertDatabaseHas('lokets', [
        'code' => 'SAMSAT-KANTOR',
        'name' => 'Kantor SAMSAT Kupang',
        'description' => 'Loket Pelayanan SAMSAT di kantor.',
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('lokets', [
        'code' => 'SAMLING-01',
        'name' => 'SAMLING 01',
        'description' => 'Loket Pelayanan SAMSAT keliling.',
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('lokets', [
        'code' => 'SAMSAT-CORNER',
        'name' => 'SAMSAT Corner',
        'description' => 'Loket Pelayanan SAMSAT Corner.',
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('lokets', [
        'code' => 'MPP',
        'name' => 'Mall Pelayanan Publik',
        'description' => 'Loket Pelayanan di Mall Pelayanan Publik.',
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('lokets', ['code' => 'SAMLING-02']);
    $this->assertDatabaseHas('lokets', ['code' => 'SAMLING-03']);
    $this->assertDatabaseCount('users', 1);

    expect($superadmin->name)->toBe('Elwin Bessiesura, S.Kom')
        ->and($superadmin->nip)->toBe('199707162025061002')
        ->and($superadmin->email)->toBe('elwinmusadi@gmail.com')
        ->and($superadmin->role)->toBe(UserRole::Superadmin)
        ->and($superadmin->loket_id)->toBe($mpp->id)
        ->and($superadmin->is_active)->toBeTrue()
        ->and(Hash::check('initial-cloud-password-0001', $superadmin->password))->toBeTrue()
        ->and(Hash::check('password', $superadmin->password))->toBeFalse();
});

test('Laravel Cloud seeder rerun keeps the existing Superadmin credentials, status, and edited Loket master data', function () {
    $this->seed(LaravelCloudLoketAndSuperadminSeeder::class);

    $superadmin = User::query()->where('username', 'elwinmusadi16')->sole();
    $superadmin->forceFill([
        'password' => Hash::make('changed-in-production'),
        'is_active' => false,
    ])->save();
    Loket::query()->where('code', 'SAMLING-03')->update([
        'name' => 'SAMLING 03 Nonaktif',
        'is_active' => false,
    ]);

    $this->artisan('db:seed', ['--class' => LaravelCloudLoketAndSuperadminSeeder::class, '--no-interaction' => true])
        ->expectsOutputToContain('Akun Superadmin sudah ada; data akun tidak diubah.')
        ->doesntExpectOutputToContain('Password awal Superadmin')
        ->assertSuccessful();

    $superadmin->refresh();

    $this->assertDatabaseCount('lokets', 6);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseHas('lokets', [
        'code' => 'SAMLING-03',
        'name' => 'SAMLING 03 Nonaktif',
        'is_active' => false,
    ]);

    expect(Hash::check('changed-in-production', $superadmin->password))->toBeTrue()
        ->and($superadmin->is_active)->toBeFalse();
});
