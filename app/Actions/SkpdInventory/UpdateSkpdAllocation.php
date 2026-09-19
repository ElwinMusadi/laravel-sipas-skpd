<?php

namespace App\Actions\SkpdInventory;

use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateSkpdAllocation
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(
        User $actor,
        SkpdAllocation $allocation,
        Loket $loket,
        CarbonInterface $allocationDate,
        int $numeratorStart,
        int $numeratorEnd,
    ): SkpdAllocation {
        $this->validateRange($numeratorStart, $numeratorEnd);

        return DB::transaction(function () use ($actor, $allocation, $loket, $allocationDate, $numeratorStart, $numeratorEnd): SkpdAllocation {
            $this->lockInventory();

            $lockedAllocation = SkpdAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($lockedAllocation->status !== SkpdAllocationStatus::Pending) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya alokasi pending yang dapat diubah.',
                ]);
            }

            if (! $actor->canManageSkpdAllocation($lockedAllocation)) {
                throw ValidationException::withMessages([
                    'allocation' => 'Hanya pembuat alokasi yang dapat mengubah handover pending.',
                ]);
            }

            $lockedBox = SkpdBox::query()
                ->lockForUpdate()
                ->findOrFail($lockedAllocation->skpd_box_id);

            $lockedLoket = Loket::query()
                ->lockForUpdate()
                ->findOrFail($loket->id);

            if (! $lockedLoket->is_active) {
                throw ValidationException::withMessages([
                    'loket_id' => 'Loket tidak aktif dan tidak dapat menerima alokasi baru.',
                ]);
            }

            if ($numeratorStart < $lockedBox->numerator_start || $numeratorEnd > $lockedBox->numerator_end) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Range alokasi harus berada di dalam range box.',
                ]);
            }

            $activeStatuses = [
                SkpdAllocationStatus::Pending->value,
                SkpdAllocationStatus::Accepted->value,
                SkpdAllocationStatus::Completed->value,
            ];

            $differentLoketExists = SkpdAllocation::query()
                ->where('skpd_box_id', $lockedBox->id)
                ->whereIn('status', $activeStatuses)
                ->whereKeyNot($lockedAllocation->id)
                ->where('loket_id', '!=', $lockedLoket->id)
                ->lockForUpdate()
                ->exists();

            if ($differentLoketExists) {
                throw ValidationException::withMessages([
                    'loket_id' => 'Satu box hanya dapat dialokasikan kepada satu Loket.',
                ]);
            }

            $hasOverlap = SkpdAllocation::query()
                ->where('skpd_box_id', $lockedBox->id)
                ->whereIn('status', $activeStatuses)
                ->whereKeyNot($lockedAllocation->id)
                ->where('numerator_start', '<=', $numeratorEnd)
                ->where('numerator_end', '>=', $numeratorStart)
                ->lockForUpdate()
                ->exists();

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Range alokasi tumpang tindih dengan alokasi aktif.',
                ]);
            }

            $before = [
                'loket_id' => $lockedAllocation->loket_id,
                'allocation_date' => $lockedAllocation->allocation_date?->toDateString(),
                'numerator_start' => $lockedAllocation->numerator_start,
                'numerator_end' => $lockedAllocation->numerator_end,
                'quantity' => $lockedAllocation->quantity,
                'status' => $lockedAllocation->status->value,
            ];

            $lockedAllocation->update([
                'loket_id' => $lockedLoket->id,
                'allocation_date' => $allocationDate->toDateString(),
                'numerator_start' => $numeratorStart,
                'numerator_end' => $numeratorEnd,
                'quantity' => $numeratorEnd - $numeratorStart + 1,
            ]);

            $this->audit->handle($actor, $lockedAllocation, 'skpd_allocation.updated', $before, [
                'loket_id' => $lockedAllocation->loket_id,
                'allocation_date' => $lockedAllocation->allocation_date?->toDateString(),
                'numerator_start' => $lockedAllocation->numerator_start,
                'numerator_end' => $lockedAllocation->numerator_end,
                'quantity' => $lockedAllocation->quantity,
                'status' => $lockedAllocation->status->value,
            ]);

            return $lockedAllocation;
        }, attempts: 3);
    }

    private function lockInventory(): void
    {
        $lock = DB::table('skpd_inventory_locks')
            ->where('id', 1)
            ->lockForUpdate()
            ->first();

        if ($lock === null) {
            throw new \LogicException('Kunci transaksi inventaris SKPD tidak tersedia.');
        }
    }

    private function validateRange(int $numeratorStart, int $numeratorEnd): void
    {
        if ($numeratorStart < 1 || $numeratorEnd > 9_999_999 || $numeratorEnd < $numeratorStart) {
            throw ValidationException::withMessages([
                'numerator_start' => 'Range nomerator harus berada pada 0000001–9999999 dan berurutan.',
            ]);
        }
    }
}
