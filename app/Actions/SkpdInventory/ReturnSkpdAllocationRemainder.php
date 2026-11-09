<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\BapUsageSegment;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Withdraws the unused tail of an accepted allocation back to central storage.
 *
 * Usage inside an allocation is sequential, so the unused part is everything after
 * the last numerator recorded by any BAP (drafts included). A partly used
 * allocation shrinks to its used range and becomes completed; an unused one keeps
 * its range for history and becomes returned. Either way the freed range is no
 * longer covered by an active allocation and can be allocated again.
 */
class ReturnSkpdAllocationRemainder
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, SkpdAllocation $allocation, string $reason): SkpdAllocation
    {
        if (! in_array($actor->role, [UserRole::BendaharaBarang, UserRole::Superadmin], true)) {
            throw ValidationException::withMessages([
                'allocation' => 'Hanya Bendahara Barang yang dapat mengembalikan sisa alokasi ke pusat.',
            ]);
        }

        return DB::transaction(function () use ($actor, $allocation, $reason): SkpdAllocation {
            $this->lockInventory();

            $lockedAllocation = SkpdAllocation::query()->lockForUpdate()->findOrFail($allocation->id);

            if ($lockedAllocation->status !== SkpdAllocationStatus::Accepted) {
                throw ValidationException::withMessages([
                    'allocation' => 'Hanya alokasi berstatus Diterima yang sisanya dapat dikembalikan ke pusat.',
                ]);
            }

            $lastUsedNumerator = BapUsageSegment::query()
                ->where('skpd_allocation_id', $lockedAllocation->id)
                ->lockForUpdate()
                ->max('numerator_end');
            $lastUsedNumerator = $lastUsedNumerator === null ? null : (int) $lastUsedNumerator;

            if ($lastUsedNumerator !== null && $lastUsedNumerator >= $lockedAllocation->numerator_end) {
                throw ValidationException::withMessages([
                    'allocation' => 'Alokasi ini tidak memiliki sisa Nomerator yang dapat dikembalikan.',
                ]);
            }

            $returnedStart = $lastUsedNumerator === null ? $lockedAllocation->numerator_start : $lastUsedNumerator + 1;
            $returnedEnd = $lockedAllocation->numerator_end;
            $oldValues = [
                'numerator_start' => $lockedAllocation->numerator_start,
                'numerator_end' => $lockedAllocation->numerator_end,
                'quantity' => $lockedAllocation->quantity,
                'status' => $lockedAllocation->status->value,
            ];

            if ($lastUsedNumerator === null) {
                $lockedAllocation->update(['status' => SkpdAllocationStatus::Returned]);
            } else {
                $keptQuantity = $lastUsedNumerator - $lockedAllocation->numerator_start + 1;
                $usedQuantity = (int) BapUsageSegment::query()
                    ->where('skpd_allocation_id', $lockedAllocation->id)
                    ->sum('quantity');

                $lockedAllocation->update([
                    'numerator_end' => $lastUsedNumerator,
                    'quantity' => $keptQuantity,
                    'status' => $usedQuantity === $keptQuantity
                        ? SkpdAllocationStatus::Completed
                        : SkpdAllocationStatus::Accepted,
                ]);
            }

            $this->audit->handle($actor, $lockedAllocation, 'skpd_allocation.remainder_returned', $oldValues, [
                'numerator_start' => $lockedAllocation->numerator_start,
                'numerator_end' => $lockedAllocation->numerator_end,
                'quantity' => $lockedAllocation->quantity,
                'status' => $lockedAllocation->status->value,
                'returned_numerator_start' => $returnedStart,
                'returned_numerator_end' => $returnedEnd,
                'returned_quantity' => $returnedEnd - $returnedStart + 1,
                'reason' => $reason,
            ]);

            return $lockedAllocation;
        }, attempts: 3);
    }
}
