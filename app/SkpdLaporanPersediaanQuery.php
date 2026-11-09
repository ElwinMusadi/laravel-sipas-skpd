<?php

namespace App;

use App\Models\BapUsageSegment;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Support\BusinessDate;
use App\Support\LaporanPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Read model of the Bukti SKPD stock position per Box and per Loket at the cut-off
 * of the selected month: the end of that month in WITA, or the current WITA time
 * while the month has not ended yet.
 *
 * The position is rebuilt from the allocation and BAP records, all aggregated in SQL:
 * - a Box counts once it was received (received_at) on or before the cut-off;
 * - "dialokasikan ke Loket" sums accepted or completed allocations accepted on or before the cut-off;
 * - "menunggu handover" sums allocations created on or before the cut-off that are still pending
 *   or were accepted only after the cut-off;
 * - "terpakai" sums the usage segments of non-draft BAPs with a service date on or before the cut-off.
 *
 * Allocations carry no history of their quantity or status. Cancelled allocations are left out
 * entirely, and withdrawn allocations are reconstructed with their current quantity: a returned
 * allocation is left out and a partially used allocation that was shrunk to its used range counts
 * only that range. Months before a withdrawal therefore show the reduced figure.
 *
 * With a Loket filter, allocation and usage columns only include that Loket and only Boxes holding
 * an allocation for it are listed, so the central columns then only reflect that Loket.
 */
final class SkpdLaporanPersediaanQuery
{
    private readonly CarbonImmutable $cutoff;

    public function __construct(private readonly LaporanPeriod $period)
    {
        $endOfMonth = $period->end();
        $now = BusinessDate::now();

        $this->cutoff = $endOfMonth->lessThan($now) ? $endOfMonth : $now;
    }

    /**
     * @return array{month: int, year: int, loket: int|null}
     */
    public function filters(): array
    {
        return $this->period->filters();
    }

    public function periodLabel(): string
    {
        return $this->period->label();
    }

    public function selectedLoketName(): ?string
    {
        return $this->period->selectedLoketName();
    }

    public function pdfFilename(): string
    {
        return $this->period->filename('laporan-persediaan-skpd', 'pdf');
    }

    public function excelFilename(): string
    {
        return $this->period->filename('laporan-persediaan-skpd', 'xlsx');
    }

    /**
     * Get the cut-off moment in WITA.
     */
    public function cutoff(): CarbonImmutable
    {
        return $this->cutoff;
    }

    public function isEndOfMonthPosition(): bool
    {
        return $this->cutoff->equalTo($this->period->end());
    }

    public function cutoffLabel(): string
    {
        $cutoff = $this->cutoff();

        return $this->isEndOfMonthPosition()
            ? LaporanPeriod::formatDate($cutoff)
            : LaporanPeriod::formatDate($cutoff).', '.$cutoff->format('H:i').' WITA';
    }

    /**
     * @return Builder<SkpdBox>
     */
    public function boxQuery(): Builder
    {
        $query = SkpdBox::query()
            ->select([
                'skpd_boxes.id',
                'skpd_boxes.box_number',
                'skpd_boxes.numerator_start',
                'skpd_boxes.numerator_end',
                'skpd_boxes.total_sets',
                'skpd_boxes.received_at',
            ])
            ->selectSub($this->allocatedQuantity('skpd_box_id', 'skpd_boxes.id'), 'allocated_quantity')
            ->selectSub($this->pendingQuantity('skpd_box_id', 'skpd_boxes.id'), 'pending_quantity')
            ->selectSub($this->usedQuantity('skpd_box_id', 'skpd_boxes.id'), 'used_quantity')
            ->where('skpd_boxes.received_at', '<=', $this->storedCutoff());

        if ($this->period->loketId !== null) {
            $query->whereHas('allocations', fn (Builder $allocations): Builder => $allocations
                ->where('loket_id', $this->period->loketId)
                ->where('created_at', '<=', $this->storedCutoff())
                ->whereIn('status', [
                    SkpdAllocationStatus::Pending->value,
                    SkpdAllocationStatus::Accepted->value,
                    SkpdAllocationStatus::Completed->value,
                ]));
        }

        return $query;
    }

    /**
     * @return Builder<SkpdBox>
     */
    public function detailQuery(): Builder
    {
        return $this->boxQuery()
            ->orderBy('skpd_boxes.numerator_start')
            ->orderBy('skpd_boxes.id');
    }

    /**
     * @return array{id: int, box_number: string, numerator_start: int, numerator_end: int, total_sets: int, allocated_quantity: int, pending_quantity: int, used_quantity: int, central_remaining: int, loket_remaining: int}
     */
    public static function boxData(SkpdBox $box): array
    {
        $allocated = (int) $box->getAttribute('allocated_quantity');
        $pending = (int) $box->getAttribute('pending_quantity');
        $used = (int) $box->getAttribute('used_quantity');

        return [
            'id' => $box->id,
            'box_number' => $box->box_number,
            'numerator_start' => $box->numerator_start,
            'numerator_end' => $box->numerator_end,
            'total_sets' => $box->total_sets,
            'allocated_quantity' => $allocated,
            'pending_quantity' => $pending,
            'used_quantity' => $used,
            'central_remaining' => $box->total_sets - $allocated - $pending,
            'loket_remaining' => $allocated - $used,
        ];
    }

    /**
     * @return array{total_boxes: int, total_sets: int, allocated_quantity: int, pending_quantity: int, used_quantity: int, central_remaining: int, loket_remaining: int}
     */
    public function summary(): array
    {
        $totals = DB::query()
            ->fromSub($this->boxQuery(), 'box_stock')
            ->selectRaw('count(*) as total_boxes')
            ->selectRaw('coalesce(sum(total_sets), 0) as total_sets')
            ->selectRaw('coalesce(sum(allocated_quantity), 0) as allocated_quantity')
            ->selectRaw('coalesce(sum(pending_quantity), 0) as pending_quantity')
            ->selectRaw('coalesce(sum(used_quantity), 0) as used_quantity')
            ->first();
        $totalSets = (int) ($totals->total_sets ?? 0);
        $allocated = (int) ($totals->allocated_quantity ?? 0);
        $pending = (int) ($totals->pending_quantity ?? 0);
        $used = (int) ($totals->used_quantity ?? 0);

        return [
            'total_boxes' => (int) ($totals->total_boxes ?? 0),
            'total_sets' => $totalSets,
            'allocated_quantity' => $allocated,
            'pending_quantity' => $pending,
            'used_quantity' => $used,
            'central_remaining' => $totalSets - $allocated - $pending,
            'loket_remaining' => $allocated - $used,
        ];
    }

    /**
     * @return list<array{loket_id: int, loket: string, received_quantity: int, pending_quantity: int, used_quantity: int, remaining_quantity: int}>
     */
    public function loketRecaps(): array
    {
        $query = Loket::query()
            ->select(['lokets.id', 'lokets.name'])
            ->selectSub($this->allocatedQuantity('loket_id', 'lokets.id'), 'received_quantity')
            ->selectSub($this->pendingQuantity('loket_id', 'lokets.id'), 'pending_quantity')
            ->selectSub($this->usedQuantity('loket_id', 'lokets.id'), 'used_quantity')
            ->orderBy('lokets.name')
            ->orderBy('lokets.id');

        if ($this->period->loketId !== null) {
            $query->whereKey($this->period->loketId);
        }

        return array_values($query
            ->toBase()
            ->get()
            ->map(fn (object $recap): array => [
                'loket_id' => (int) $recap->id,
                'loket' => (string) $recap->name,
                'received_quantity' => (int) $recap->received_quantity,
                'pending_quantity' => (int) $recap->pending_quantity,
                'used_quantity' => (int) $recap->used_quantity,
                'remaining_quantity' => (int) $recap->received_quantity - (int) $recap->used_quantity,
            ])
            ->filter(fn (array $recap): bool => $recap['received_quantity'] > 0
                || $recap['pending_quantity'] > 0
                || $recap['used_quantity'] > 0)
            ->values()
            ->all());
    }

    /**
     * Sum allocations held by a Loket at the cut-off, correlated to the outer row.
     *
     * @return Builder<SkpdAllocation>
     */
    private function allocatedQuantity(string $foreignKey, string $ownerKey): Builder
    {
        return $this->allocationScope()
            ->selectRaw('coalesce(sum(skpd_allocations.quantity), 0)')
            ->whereColumn('skpd_allocations.'.$foreignKey, $ownerKey)
            ->whereIn('skpd_allocations.status', [
                SkpdAllocationStatus::Accepted->value,
                SkpdAllocationStatus::Completed->value,
            ])
            ->where('skpd_allocations.accepted_at', '<=', $this->storedCutoff());
    }

    /**
     * Sum allocations awaiting handover at the cut-off, correlated to the outer row.
     *
     * @return Builder<SkpdAllocation>
     */
    private function pendingQuantity(string $foreignKey, string $ownerKey): Builder
    {
        return $this->allocationScope()
            ->selectRaw('coalesce(sum(skpd_allocations.quantity), 0)')
            ->whereColumn('skpd_allocations.'.$foreignKey, $ownerKey)
            ->where('skpd_allocations.created_at', '<=', $this->storedCutoff())
            ->where(fn (Builder $pending): Builder => $pending
                ->where('skpd_allocations.status', SkpdAllocationStatus::Pending->value)
                ->orWhere(fn (Builder $acceptedLater): Builder => $acceptedLater
                    ->whereIn('skpd_allocations.status', [
                        SkpdAllocationStatus::Accepted->value,
                        SkpdAllocationStatus::Completed->value,
                    ])
                    ->where('skpd_allocations.accepted_at', '>', $this->storedCutoff())));
    }

    /**
     * Sum usage of non-draft BAPs up to the cut-off date, correlated to the outer row.
     *
     * @return Builder<BapUsageSegment>
     */
    private function usedQuantity(string $foreignKey, string $ownerKey): Builder
    {
        $query = BapUsageSegment::query()
            ->selectRaw('coalesce(sum(bap_usage_segments.quantity), 0)')
            ->join('skpd_allocations', 'skpd_allocations.id', '=', 'bap_usage_segments.skpd_allocation_id')
            ->join('baps', 'baps.id', '=', 'bap_usage_segments.bap_id')
            ->whereColumn('skpd_allocations.'.$foreignKey, $ownerKey)
            ->where('baps.status', '!=', BapStatus::Draft->value)
            ->whereDate('baps.service_date', '<=', $this->cutoff()->toDateString());

        if ($this->period->loketId !== null) {
            $query->where('skpd_allocations.loket_id', $this->period->loketId);
        }

        return $query;
    }

    /**
     * @return Builder<SkpdAllocation>
     */
    private function allocationScope(): Builder
    {
        $query = SkpdAllocation::query();

        if ($this->period->loketId !== null) {
            $query->where('skpd_allocations.loket_id', $this->period->loketId);
        }

        return $query;
    }

    private function storedCutoff(): CarbonImmutable
    {
        return LaporanPeriod::storedTime($this->cutoff());
    }
}
