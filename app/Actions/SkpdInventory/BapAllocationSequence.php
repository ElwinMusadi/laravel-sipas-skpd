<?php

namespace App\Actions\SkpdInventory;

use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\SkpdAllocation;
use App\SkpdAllocationStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\Relation;

class BapAllocationSequence
{
    /**
     * Received order is independent of numerator order. Undated allocations sort
     * last using a portable CASE expression; accepted_at must not be null.
     *
     * @return Collection<int, SkpdAllocation>
     */
    public function receivedAllocations(int $loketId, ?int $excludedBapId = null, bool $lockForUpdate = false): Collection
    {
        $query = SkpdAllocation::query()
            ->where('loket_id', $loketId)
            ->whereIn('status', [SkpdAllocationStatus::Accepted->value, SkpdAllocationStatus::Completed->value])
            ->whereNotNull('accepted_by')
            ->whereNotNull('accepted_at')
            ->orderByRaw('CASE WHEN allocation_date IS NULL THEN 1 ELSE 0 END ASC')
            ->orderBy('allocation_date')
            ->orderBy('accepted_at')
            ->orderBy('id')
            ->with(['usageSegments' => function (Relation $query) use ($excludedBapId, $lockForUpdate): void {
                if ($excludedBapId !== null) {
                    $query->where('bap_id', '!=', $excludedBapId);
                }

                $query->orderBy('numerator_start')->orderBy('id');

                if ($lockForUpdate) {
                    $query->lockForUpdate();
                }
            }]);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->get();
    }

    public function remainingQuantity(SkpdAllocation $allocation): int
    {
        return $allocation->quantity - (int) $allocation->usageSegments->sum('quantity');
    }

    /**
     * @param  Collection<int, SkpdAllocation>  $allocations  Allocations in received order, with usage loaded.
     * @return Collection<int, SkpdAllocation>
     */
    public function eligibleAllocations(Collection $allocations): Collection
    {
        return $allocations
            ->filter(fn (SkpdAllocation $allocation): bool => $this->remainingQuantity($allocation) > 0)
            ->values();
    }

    /**
     * @param  Collection<int, SkpdAllocation>  $allocations
     */
    public function expectedStart(Collection $allocations, ?Bap $previousBap): ?int
    {
        foreach ($this->eligibleAllocations($allocations) as $allocation) {
            $firstUnused = $this->firstUnusedNumerator($allocation);

            if ($firstUnused === null) {
                continue;
            }

            if ($previousBap !== null
                && $previousBap->numerator_end >= $allocation->numerator_start
                && $previousBap->numerator_end < $allocation->numerator_end) {
                $nextNumerator = $previousBap->numerator_end + 1;

                if ($this->firstUnusedNumerator($allocation, $nextNumerator) === $nextNumerator) {
                    return $nextNumerator;
                }
            }

            return $firstUnused;
        }

        return null;
    }

    /**
     * Coverage walks numeric order, but crossing allocations must also respect
     * received priority and exhaust the preceding allocation's remaining usage.
     *
     * @param  Collection<int, SkpdAllocation>  $allocations
     * @return list<array{skpd_allocation_id: int, numerator_start: int, numerator_end: int, quantity: int}>
     */
    public function segmentsForRange(
        Collection $allocations,
        int $numeratorStart,
        int $numeratorEnd,
        ?int $excludedBapId = null,
        bool $lockForUpdate = false,
    ): array {
        $eligibleAllocations = $this->eligibleAllocations($allocations);

        if ($eligibleAllocations->isEmpty()) {
            return [];
        }

        $allocationIds = $allocations->pluck('id')->all();

        $usageQuery = BapUsageSegment::query()
            ->whereIn('skpd_allocation_id', $allocationIds)
            ->where('numerator_start', '<=', $numeratorEnd)
            ->where('numerator_end', '>=', $numeratorStart);

        if ($excludedBapId !== null) {
            $usageQuery->where('bap_id', '!=', $excludedBapId);
        }

        if ($lockForUpdate) {
            $usageQuery->lockForUpdate();
        }

        if ($usageQuery->exists()) {
            return [];
        }

        $priorityIndex = 0;
        $cursor = $numeratorStart;
        $segments = [];

        foreach ($allocations->sortBy([['numerator_start', 'asc'], ['id', 'asc']]) as $allocation) {
            if ($allocation->numerator_end < $cursor) {
                continue;
            }

            if ($allocation->numerator_start > $cursor
                || $eligibleAllocations->get($priorityIndex)?->id !== $allocation->id) {
                return [];
            }

            $segmentEnd = min($numeratorEnd, $allocation->numerator_end);
            $quantity = $segmentEnd - $cursor + 1;
            $remainingQuantity = $this->remainingQuantity($allocation);

            if ($quantity > $remainingQuantity) {
                return [];
            }

            $segments[] = [
                'skpd_allocation_id' => $allocation->id,
                'numerator_start' => $cursor,
                'numerator_end' => $segmentEnd,
                'quantity' => $quantity,
            ];

            $cursor = $segmentEnd + 1;

            if ($cursor > $numeratorEnd) {
                return $segments;
            }

            if ($quantity !== $remainingQuantity) {
                return [];
            }

            $priorityIndex++;
        }

        return [];
    }

    private function firstUnusedNumerator(SkpdAllocation $allocation, ?int $numeratorStart = null): ?int
    {
        $cursor = max($allocation->numerator_start, $numeratorStart ?? $allocation->numerator_start);

        foreach ($allocation->usageSegments as $segment) {
            if ($segment->numerator_end < $cursor) {
                continue;
            }

            if ($segment->numerator_start > $cursor) {
                break;
            }

            $cursor = $segment->numerator_end + 1;
        }

        return $cursor <= $allocation->numerator_end ? $cursor : null;
    }
}
