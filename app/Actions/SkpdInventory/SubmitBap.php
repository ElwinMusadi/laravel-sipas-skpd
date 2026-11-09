<?php

namespace App\Actions\SkpdInventory;

use App\BapStatus;
use App\Concerns\LocksSkpdInventory;
use App\Models\Bap;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitBap
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Bap $bap): Bap
    {
        return DB::transaction(function () use ($actor, $bap): Bap {
            $this->lockInventory();

            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);

            if (! $actor->canOperateAtLoket($lockedBap->loket_id)) {
                throw ValidationException::withMessages([
                    'loket_id' => 'BAP hanya dapat diajukan oleh Petugas Loket pemilik BAP.',
                ]);
            }

            if ($lockedBap->status !== BapStatus::Draft) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya BAP draft yang dapat diajukan.',
                ]);
            }

            $lockedBap->transitionTo(BapStatus::Submitted);
            $lockedBap->submitted_at = now();
            $lockedBap->save();

            $this->audit->handle($actor, $lockedBap, 'bap.submitted', [
                'status' => BapStatus::Draft->value,
            ], [
                'status' => $lockedBap->status->value,
                'submitted_at' => $lockedBap->submitted_at->toISOString(),
            ]);

            return $lockedBap;
        }, attempts: 3);
    }
}
