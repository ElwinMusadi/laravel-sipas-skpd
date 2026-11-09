<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptSkpdAllocation
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, SkpdAllocation $allocation): SkpdAllocation
    {
        return DB::transaction(function () use ($actor, $allocation): SkpdAllocation {
            $this->lockInventory();

            $lockedAllocation = SkpdAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($lockedAllocation->status !== SkpdAllocationStatus::Pending) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya alokasi berstatus pending yang dapat diterima.',
                ]);
            }

            if (! $actor->canOperateAtLoket($lockedAllocation->loket_id)) {
                throw ValidationException::withMessages([
                    'loket_id' => 'Alokasi hanya dapat diterima oleh Petugas Loket yang dituju.',
                ]);
            }

            $lockedAllocation->fill([
                'status' => SkpdAllocationStatus::Accepted,
                'accepted_by' => $actor->id,
                'accepted_at' => now(),
            ])->save();

            $this->audit->handle($actor, $lockedAllocation, 'skpd_allocation.accepted', [
                'status' => SkpdAllocationStatus::Pending->value,
            ], [
                'status' => $lockedAllocation->status->value,
                'accepted_by' => $lockedAllocation->accepted_by,
                'accepted_at' => $lockedAllocation->accepted_at?->toISOString(),
            ]);

            return $lockedAllocation;
        }, attempts: 3);
    }
}
