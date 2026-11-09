<?php

namespace App;

use App\Models\SkpdAllocation;
use App\Support\LaporanPeriod;
use Illuminate\Database\Eloquent\Builder;

/**
 * Read model of SKPD allocations from central storage to Loket whose allocation
 * date falls in the selected month. Allocations without an allocation date fall
 * back to their creation moment in WITA.
 *
 * "Didistribusikan" is the net distribution: pending, accepted, and completed
 * allocations. Cancelled allocations never left central storage and returned
 * allocations came back to it, so both are reported separately. A partially used
 * allocation that was withdrawn is stored shrunk to its used range and completed,
 * so it is counted with that reduced quantity.
 */
final class SkpdLaporanDistribusiQuery
{
    public function __construct(private readonly LaporanPeriod $period) {}

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
        return $this->period->filename('laporan-distribusi-skpd', 'pdf');
    }

    public function excelFilename(): string
    {
        return $this->period->filename('laporan-distribusi-skpd', 'xlsx');
    }

    /**
     * @return Builder<SkpdAllocation>
     */
    public function detailQuery(): Builder
    {
        return $this->allocationQuery()
            ->with(['skpdBox:id,box_number', 'loket:id,name', 'creator:id,name', 'acceptor:id,name'])
            ->orderByRaw('coalesce(date(skpd_allocations.allocation_date), date(skpd_allocations.created_at)) desc')
            ->orderByDesc('skpd_allocations.id');
    }

    /**
     * Get the business date of the allocation, falling back to its creation date in WITA.
     */
    public static function allocationDate(SkpdAllocation $allocation): string
    {
        return $allocation->allocation_date?->toDateString()
            ?? LaporanPeriod::businessTime($allocation->created_at)?->toDateString()
            ?? '';
    }

    /**
     * @return array{distributed_allocations: int, distributed_sets: int, received_sets: int, statuses: list<array{status: string, label: string, total_allocations: int, total_sets: int}>}
     */
    public function summary(): array
    {
        $totals = $this->allocationQuery()
            ->toBase()
            ->select('skpd_allocations.status')
            ->selectRaw('count(*) as total_allocations')
            ->selectRaw('coalesce(sum(skpd_allocations.quantity), 0) as total_sets')
            ->groupBy('skpd_allocations.status')
            ->get()
            ->keyBy('status');

        $statuses = array_map(fn (SkpdAllocationStatus $status): array => [
            'status' => $status->value,
            'label' => $status->label(),
            'total_allocations' => (int) ($totals[$status->value]->total_allocations ?? 0),
            'total_sets' => (int) ($totals[$status->value]->total_sets ?? 0),
        ], SkpdAllocationStatus::cases());
        $distributed = array_filter(
            $statuses,
            fn (array $status): bool => in_array($status['status'], self::distributedStatuses(), true),
        );
        $received = array_filter(
            $statuses,
            fn (array $status): bool => SkpdAllocationStatus::from($status['status'])->isHeldByLoket(),
        );

        return [
            'distributed_allocations' => array_sum(array_column($distributed, 'total_allocations')),
            'distributed_sets' => array_sum(array_column($distributed, 'total_sets')),
            'received_sets' => array_sum(array_column($received, 'total_sets')),
            'statuses' => $statuses,
        ];
    }

    /**
     * @return list<array{loket_id: int, loket: string, distributed_allocations: int, distributed_sets: int, pending_sets: int, received_sets: int, cancelled_sets: int, returned_sets: int}>
     */
    public function loketRecaps(): array
    {
        $distributed = self::distributedStatuses();
        $received = [SkpdAllocationStatus::Accepted->value, SkpdAllocationStatus::Completed->value];

        return array_values($this->allocationQuery()
            ->toBase()
            ->join('lokets', 'lokets.id', '=', 'skpd_allocations.loket_id')
            ->select('skpd_allocations.loket_id', 'lokets.name as loket')
            ->selectRaw('sum(case when skpd_allocations.status in (?, ?, ?) then 1 else 0 end) as distributed_allocations', $distributed)
            ->selectRaw('sum(case when skpd_allocations.status in (?, ?, ?) then skpd_allocations.quantity else 0 end) as distributed_sets', $distributed)
            ->selectRaw('sum(case when skpd_allocations.status = ? then skpd_allocations.quantity else 0 end) as pending_sets', [SkpdAllocationStatus::Pending->value])
            ->selectRaw('sum(case when skpd_allocations.status in (?, ?) then skpd_allocations.quantity else 0 end) as received_sets', $received)
            ->selectRaw('sum(case when skpd_allocations.status = ? then skpd_allocations.quantity else 0 end) as cancelled_sets', [SkpdAllocationStatus::Cancelled->value])
            ->selectRaw('sum(case when skpd_allocations.status = ? then skpd_allocations.quantity else 0 end) as returned_sets', [SkpdAllocationStatus::Returned->value])
            ->groupBy('skpd_allocations.loket_id', 'lokets.name')
            ->orderBy('lokets.name')
            ->orderBy('skpd_allocations.loket_id')
            ->get()
            ->map(fn (object $recap): array => [
                'loket_id' => (int) $recap->loket_id,
                'loket' => (string) $recap->loket,
                'distributed_allocations' => (int) $recap->distributed_allocations,
                'distributed_sets' => (int) $recap->distributed_sets,
                'pending_sets' => (int) $recap->pending_sets,
                'received_sets' => (int) $recap->received_sets,
                'cancelled_sets' => (int) $recap->cancelled_sets,
                'returned_sets' => (int) $recap->returned_sets,
            ])
            ->all());
    }

    /**
     * @return list<string>
     */
    private static function distributedStatuses(): array
    {
        return [
            SkpdAllocationStatus::Pending->value,
            SkpdAllocationStatus::Accepted->value,
            SkpdAllocationStatus::Completed->value,
        ];
    }

    /**
     * @return Builder<SkpdAllocation>
     */
    private function allocationQuery(): Builder
    {
        $query = SkpdAllocation::query()
            ->where(fn (Builder $period): Builder => $period
                ->where(fn (Builder $dated): Builder => $dated
                    ->whereNotNull('skpd_allocations.allocation_date')
                    ->whereDate('skpd_allocations.allocation_date', '>=', $this->period->startDate())
                    ->whereDate('skpd_allocations.allocation_date', '<=', $this->period->endDate()))
                ->orWhere(fn (Builder $undated): Builder => $undated
                    ->whereNull('skpd_allocations.allocation_date')
                    ->whereBetween('skpd_allocations.created_at', [
                        LaporanPeriod::storedTime($this->period->start()),
                        LaporanPeriod::storedTime($this->period->end()),
                    ])));

        if ($this->period->loketId !== null) {
            $query->where('skpd_allocations.loket_id', $this->period->loketId);
        }

        return $query;
    }
}
