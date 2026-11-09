<?php

namespace Database\Seeders;

use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds the approved Laravel Cloud Loket master data and Superadmin account.
 *
 * This seeder is intentionally separate from DatabaseSeeder. It is idempotent and
 * create-only: missing Lokets are created by code and the Superadmin is created by
 * username, but existing records are never modified. Production edits such as a
 * changed password, a deactivated account, or a renamed or inactive Loket survive
 * every rerun.
 */
class LaravelCloudLoketAndSuperadminSeeder extends Seeder
{
    private const SUPERADMIN_USERNAME = 'elwinmusadi16';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lokets = [];

        foreach ($this->loketDefinitions() as $definition) {
            $lokets[$definition['code']] = Loket::query()->firstOrCreate(
                ['code' => $definition['code']],
                $definition,
            );
        }

        if (User::query()->where('username', self::SUPERADMIN_USERNAME)->exists()) {
            $this->command->info('Akun Superadmin sudah ada; data akun tidak diubah.');

            return;
        }

        $initialPassword = Str::random(24);

        $superadmin = new User;
        $superadmin->forceFill([
            'username' => self::SUPERADMIN_USERNAME,
            'name' => 'Elwin Bessiesura, S.Kom',
            'nip' => '199707162025061002',
            'email' => 'elwinmusadi@gmail.com',
            'password' => Hash::make($initialPassword),
            'role' => UserRole::Superadmin,
            'loket_id' => $lokets['MPP']->id,
            'is_active' => true,
        ])->save();

        $this->command->warn("Password awal Superadmin: {$initialPassword}");
        $this->command->warn('Simpan password ini sekarang dan segera ganti setelah login pertama.');
    }

    /**
     * @return list<array{code: string, name: string, description: string, is_active: bool}>
     */
    private function loketDefinitions(): array
    {
        return [
            [
                'code' => 'SAMSAT-KANTOR',
                'name' => 'Kantor SAMSAT Kupang',
                'description' => 'Loket Pelayanan SAMSAT di kantor.',
                'is_active' => true,
            ],
            [
                'code' => 'SAMLING-01',
                'name' => 'SAMLING 01',
                'description' => 'Loket Pelayanan SAMSAT keliling.',
                'is_active' => true,
            ],
            [
                'code' => 'SAMSAT-CORNER',
                'name' => 'SAMSAT Corner',
                'description' => 'Loket Pelayanan SAMSAT Corner.',
                'is_active' => true,
            ],
            [
                'code' => 'MPP',
                'name' => 'Mall Pelayanan Publik',
                'description' => 'Loket Pelayanan di Mall Pelayanan Publik.',
                'is_active' => true,
            ],
            [
                'code' => 'SAMLING-02',
                'name' => 'SAMLING 02',
                'description' => 'Loket Pelayanan SAMSAT Keliling',
                'is_active' => true,
            ],
            [
                'code' => 'SAMLING-03',
                'name' => 'SAMLING 03',
                'description' => 'Loket Pelayanan SAMSAT Keliling',
                'is_active' => true,
            ],
        ];
    }
}
