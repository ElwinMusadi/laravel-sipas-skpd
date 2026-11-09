<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\Loket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateLoket
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Loket $loket, string $code, string $name, ?string $description, bool $isActive): Loket
    {
        $code = strtoupper(trim($code));
        $name = trim($name);
        $description = filled($description) ? trim($description) : null;

        return DB::transaction(function () use ($actor, $loket, $code, $name, $description, $isActive): Loket {
            $this->lockInventory();

            $lockedLoket = Loket::query()->lockForUpdate()->findOrFail($loket->id);

            if (Loket::query()
                ->where('code', $code)
                ->whereKeyNot($lockedLoket->id)
                ->lockForUpdate()
                ->exists()) {
                throw ValidationException::withMessages([
                    'code' => 'Kode Loket sudah digunakan.',
                ]);
            }

            if (! $isActive && $lockedLoket->users()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'is_active' => 'Loket yang masih memiliki pengguna yang ditugaskan tidak dapat dinonaktifkan.',
                ]);
            }

            $oldValues = $this->values($lockedLoket);

            $lockedLoket->update([
                'code' => $code,
                'name' => $name,
                'description' => $description,
                'is_active' => $isActive,
            ]);

            $event = $oldValues['is_active'] === $lockedLoket->is_active
                ? 'loket.updated'
                : ($lockedLoket->is_active ? 'loket.activated' : 'loket.deactivated');

            $this->audit->handle($actor, $lockedLoket, $event, $oldValues, $this->values($lockedLoket));

            return $lockedLoket;
        }, attempts: 3);
    }

    /**
     * @return array{code: string, name: string, description: string|null, is_active: bool}
     */
    private function values(Loket $loket): array
    {
        return [
            'code' => $loket->code,
            'name' => $loket->name,
            'description' => $loket->description,
            'is_active' => $loket->is_active,
        ];
    }
}
