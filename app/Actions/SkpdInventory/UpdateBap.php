<?php

namespace App\Actions\SkpdInventory;

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\User;
use App\SkpdAllocationStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateBap
{
    public function __construct(
        private readonly RecordDomainAudit $audit,
        private readonly SynchronizeBapCancellations $syncCancellations,
        private readonly BapAllocationSequence $allocationSequence,
    ) {}

    /**
     * @param  list<array{numerator: int, reason: BapCancellationReason, description: string|null}>  $cancellations
     */
    public function handle(
        User $actor,
        Bap $bap,
        CarbonInterface $serviceDate,
        int $numeratorStart,
        int $numeratorEnd,
        int $onlineUsageCount,
        int $cancellationCount = 0,
        array $cancellations = [],
    ): Bap {
        $this->validateRange($numeratorStart, $numeratorEnd);

        $totalUsage = $numeratorEnd - $numeratorStart + 1;

        if ($onlineUsageCount < 0 || $onlineUsageCount > $totalUsage) {
            throw ValidationException::withMessages([
                'online_usage_count' => 'Jumlah SKPD online harus berada di antara 0 dan total pemakaian.',
            ]);
        }

        return DB::transaction(function () use ($actor, $bap, $serviceDate, $numeratorStart, $numeratorEnd, $onlineUsageCount, $totalUsage, $cancellationCount, $cancellations): Bap {
            $this->lockInventory();

            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);

            if (! $actor->canManageDraftBap($lockedBap)) {
                throw ValidationException::withMessages([
                    'loket_id' => 'Hanya pembuat BAP pada Loket yang sama yang dapat memperbarui draft.',
                ]);
            }

            if ($lockedBap->status !== BapStatus::Draft) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya BAP draft yang dapat diperbarui.',
                ]);
            }

            /** @var Collection<int, Bap> $otherBaps */
            $otherBaps = Bap::query()
                ->where('loket_id', $lockedBap->loket_id)
                ->whereKeyNot($lockedBap->id)
                ->orderBy('service_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($otherBaps->contains(fn (Bap $existingBap): bool => $existingBap->service_date->toDateString() === $serviceDate->toDateString())) {
                throw ValidationException::withMessages([
                    'service_date' => 'Loket hanya dapat memiliki satu BAP pada satu hari pelayanan.',
                ]);
            }

            $isTailDraft = ! $otherBaps->contains(function (Bap $existingBap) use ($lockedBap): bool {
                if ($existingBap->service_date->greaterThan($lockedBap->service_date)) {
                    return true;
                }

                return $existingBap->service_date->equalTo($lockedBap->service_date) && $existingBap->id > $lockedBap->id;
            });

            if (! $isTailDraft) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'BAP draft tidak dapat diubah setelah terdapat BAP Loket berikutnya.',
                ]);
            }

            $allocations = $this->allocationSequence->receivedAllocations(
                $lockedBap->loket_id,
                excludedBapId: $lockedBap->id,
                lockForUpdate: true,
            );

            if ($allocations->isEmpty()) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Loket belum memiliki alokasi SKPD yang telah diterima.',
                ]);
            }

            $previousBap = $otherBaps
                ->filter(function (Bap $existingBap) use ($lockedBap): bool {
                    if ($existingBap->service_date->lessThan($lockedBap->service_date)) {
                        return true;
                    }

                    return $existingBap->service_date->equalTo($lockedBap->service_date) && $existingBap->id < $lockedBap->id;
                })
                ->last();

            if ($previousBap !== null && $serviceDate->lessThan($previousBap->service_date)) {
                throw ValidationException::withMessages([
                    'service_date' => 'Tanggal pelayanan tidak boleh lebih awal dari BAP Loket sebelumnya.',
                ]);
            }

            $expectedStart = $this->allocationSequence->expectedStart($allocations, $previousBap);

            if ($expectedStart === null) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Tidak ada sisa Nomerator pada alokasi Loket yang telah diterima.',
                ]);
            }

            if ($numeratorStart !== $expectedStart) {
                throw ValidationException::withMessages([
                    'numerator_start' => "Nomerator awal harus {$expectedStart} agar urutan tetap berkelanjutan.",
                ]);
            }

            $segments = $this->allocationSequence->segmentsForRange(
                $allocations,
                $numeratorStart,
                $numeratorEnd,
                excludedBapId: $lockedBap->id,
                lockForUpdate: true,
            );

            if ($segments === []) {
                throw ValidationException::withMessages([
                    'numerator_end' => 'Range Nomerator BAP harus berada dalam urutan alokasi Loket yang telah diterima, tanpa celah atau tumpang tindih pemakaian.',
                ]);
            }

            $oldValues = [
                'service_date' => $lockedBap->service_date->toDateString(),
                'numerator_start' => $lockedBap->numerator_start,
                'numerator_end' => $lockedBap->numerator_end,
                'total_usage' => $lockedBap->total_usage,
                'online_usage_count' => $lockedBap->online_usage_count,
            ];
            $oldSegments = $lockedBap->usageSegments()
                ->lockForUpdate()
                ->get(['skpd_allocation_id', 'numerator_start', 'numerator_end', 'quantity'])
                ->map(fn (BapUsageSegment $segment): array => [
                    'skpd_allocation_id' => $segment->skpd_allocation_id,
                    'numerator_start' => $segment->numerator_start,
                    'numerator_end' => $segment->numerator_end,
                    'quantity' => $segment->quantity,
                ])
                ->all();
            $affectedAllocationIds = array_unique([
                ...array_column($oldSegments, 'skpd_allocation_id'),
                ...array_column($segments, 'skpd_allocation_id'),
            ]);

            $lockedBap->usageSegments()->delete();
            $lockedBap->update([
                'service_date' => $serviceDate->toDateString(),
                'numerator_start' => $numeratorStart,
                'numerator_end' => $numeratorEnd,
                'total_usage' => $totalUsage,
                'online_usage_count' => $onlineUsageCount,
            ]);

            foreach ($segments as $segment) {
                BapUsageSegment::create([
                    'bap_id' => $lockedBap->id,
                    ...$segment,
                ]);
            }

            foreach ($allocations->whereIn('id', $affectedAllocationIds) as $allocation) {
                $status = (int) $allocation->usageSegments()->sum('quantity') === $allocation->quantity
                    ? SkpdAllocationStatus::Completed
                    : SkpdAllocationStatus::Accepted;

                $allocation->update(['status' => $status]);
            }

            $newValues = [
                'service_date' => $lockedBap->service_date->toDateString(),
                'numerator_start' => $lockedBap->numerator_start,
                'numerator_end' => $lockedBap->numerator_end,
                'total_usage' => $lockedBap->total_usage,
                'online_usage_count' => $lockedBap->online_usage_count,
            ];

            $this->audit->handle($actor, $lockedBap, 'bap.updated', $oldValues, $newValues);
            $this->audit->handle($actor, $lockedBap, 'bap_usage_segments.updated', [
                'segments' => $oldSegments,
            ], [
                'segments' => $segments,
                'total_usage' => $totalUsage,
            ]);

            // Synchronise cancellation child rows inside the same transaction.
            // This also fixes the orphan-cancellation gap when the range is narrowed.
            $this->syncCancellations->handle($actor, $lockedBap, $cancellationCount, $cancellations);

            return $lockedBap;
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
