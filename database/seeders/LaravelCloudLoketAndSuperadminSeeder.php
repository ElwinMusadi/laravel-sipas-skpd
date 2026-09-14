<?php

namespace Database\Seeders;

use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the approved Laravel Cloud Loket master data and Superadmin account.
 *
 * This seeder is intentionally separate from DatabaseSeeder. It is idempotent:
 * Lokets are synchronized by code and the user is synchronized by username.
 */
class LaravelCloudLoketAndSuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lokets = [];

        foreach ($this->loketDefinitions() as $definition) {
            $lokets[$definition['code']] = Loket::query()->updateOrCreate(
                ['code' => $definition['code']],
                $definition,
            );
        }

        $superadmin = User::query()->firstOrNew([
            'username' => 'elwinmusadi16',
        ]);

        $superadmin->forceFill([
            'name' => 'Elwin Bessiesura, S.Kom',
            'nip' => '199707162025061002',
            'email' => 'elwinmusadi@gmail.com',
            'password' => Hash::make('password'),
            'role' => UserRole::Superadmin,
            'loket_id' => $lokets['MPP']->id,
            'is_active' => true,
        ])->save();
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
