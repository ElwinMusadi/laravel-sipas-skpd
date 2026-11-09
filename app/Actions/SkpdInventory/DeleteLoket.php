<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteLoket
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Loket $loket): void
    {
        DB::transaction(function () use ($actor, $loket): void {
            $this->lockInventory();

            $lockedLoket = Loket::query()->lockForUpdate()->findOrFail($loket->id);

            $isUsed = $lockedLoket->users()->lockForUpdate()->exists()
                || SkpdAllocation::query()->where('loket_id', $lockedLoket->id)->lockForUpdate()->exists()
                || Bap::query()->where('loket_id', $lockedLoket->id)->lockForUpdate()->exists();

            if ($isUsed) {
                throw ValidationException::withMessages([
                    'loket' => 'Loket yang telah memiliki pengguna, alokasi, atau BAP tidak dapat dihapus. Nonaktifkan Loket untuk menghentikan pemakaian baru.',
                ]);
            }

            $values = [
                'code' => $lockedLoket->code,
                'name' => $lockedLoket->name,
                'description' => $lockedLoket->description,
                'is_active' => $lockedLoket->is_active,
            ];

            $this->audit->handle($actor, $lockedLoket, 'loket.deleted', $values);
            $lockedLoket->delete();
        }, attempts: 3);
    }
}
