<?php

use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Database\Seeders\LaravelCloudLoketAndSuperadminSeeder;
use Illuminate\Support\Facades\Hash;

test('Laravel Cloud Loket and Superadmin seeder is idempotent and assigns the MPP Loket', function () {
    $this->seed(LaravelCloudLoketAndSuperadminSeeder::class);
    $this->seed(LaravelCloudLoketAndSuperadminSeeder::class);

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

    expect($superadmin->name)->toBe('Elwin Bessiesura, S.Kom')
        ->and($superadmin->nip)->toBe('199707162025061002')
        ->and($superadmin->email)->toBe('elwinmusadi@gmail.com')
        ->and($superadmin->role)->toBe(UserRole::Superadmin)
        ->and($superadmin->loket_id)->toBe($mpp->id)
        ->and($superadmin->is_active)->toBeTrue()
        ->and(Hash::check('password', $superadmin->password))->toBeTrue();

    $this->assertDatabaseCount('users', 1);
});
