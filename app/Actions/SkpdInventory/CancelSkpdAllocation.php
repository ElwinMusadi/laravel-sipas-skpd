<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelSkpdAllocation
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
                    'status' => 'Hanya alokasi pending yang dapat dibatalkan.',
                ]);
            }

            if (! $actor->canManageSkpdAllocation($lockedAllocation)) {
                throw ValidationException::withMessages([
                    'allocation' => 'Hanya pembuat alokasi yang dapat membatalkan handover pending.',
                ]);
            }

            $lockedAllocation->update(['status' => SkpdAllocationStatus::Cancelled]);

            $this->audit->handle($actor, $lockedAllocation, 'skpd_allocation.cancelled', [
                'status' => SkpdAllocationStatus::Pending->value,
            ], [
                'status' => $lockedAllocation->status->value,
            ]);

            return $lockedAllocation;
        }, attempts: 3);
    }
}
