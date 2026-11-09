<?php

namespace App;

use App\Models\BapCancellation;
use App\Support\LaporanPeriod;
use Illuminate\Database\Eloquent\Builder;

/**
 * Read model of Batal/Rusak Nomerator recorded on completed BAPs whose service
 * date falls in the selected month, following the Laporan Pemakaian principle.
 */
final class SkpdLaporanBatalRusakQuery
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
        return $this->period->filename('laporan-batal-rusak-skpd', 'pdf');
    }

    public function excelFilename(): string
    {
        return $this->period->filename('laporan-batal-rusak-skpd', 'xlsx');
    }

    /**
     * @return Builder<BapCancellation>
     */
    public function detailQuery(): Builder
    {
        return $this->cancellationQuery()
            ->select('bap_cancellations.*')
            ->with(['bap:id,document_number,loket_id,service_date', 'bap.loket:id,name'])
            ->orderByDesc('baps.service_date')
            ->orderByDesc('baps.id')
            ->orderBy('bap_cancellations.numerator');
    }

    /**
     * @return array{total: int, reasons: list<array{reason: string, label: string, total: int}>}
     */
    public function summary(): array
    {
        $totals = $this->cancellationQuery()
            ->toBase()
            ->select('bap_cancellations.reason')
            ->selectRaw('count(*) as total')
            ->groupBy('bap_cancellations.reason')
            ->pluck('total', 'reason');

        $reasons = array_map(fn (BapCancellationReason $reason): array => [
            'reason' => $reason->value,
            'label' => $reason->label(),
            'total' => (int) ($totals[$reason->value] ?? 0),
        ], BapCancellationReason::cases());

        return [
            'total' => array_sum(array_column($reasons, 'total')),
            'reasons' => $reasons,
        ];
    }

    /**
     * @return list<array{loket_id: int, loket: string, total: int, reasons: array<string, int>}>
     */
    public function loketRecaps(): array
    {
        $rows = $this->cancellationQuery()
            ->toBase()
            ->join('lokets', 'lokets.id', '=', 'baps.loket_id')
            ->select('baps.loket_id', 'lokets.name as loket', 'bap_cancellations.reason')
            ->selectRaw('count(*) as total')
            ->groupBy('baps.loket_id', 'lokets.name', 'bap_cancellations.reason')
            ->orderBy('lokets.name')
            ->orderBy('baps.loket_id')
            ->get();
        $emptyReasons = array_fill_keys(
            array_map(fn (BapCancellationReason $reason): string => $reason->value, BapCancellationReason::cases()),
            0,
        );
        $recaps = [];

        foreach ($rows as $row) {
            $loketId = (int) $row->loket_id;
            $recaps[$loketId] ??= [
                'loket_id' => $loketId,
                'loket' => (string) $row->loket,
                'total' => 0,
                'reasons' => $emptyReasons,
            ];
            $recaps[$loketId]['reasons'][(string) $row->reason] = (int) $row->total;
            $recaps[$loketId]['total'] += (int) $row->total;
        }

        return array_values($recaps);
    }

    /**
     * @return Builder<BapCancellation>
     */
    private function cancellationQuery(): Builder
    {
        $query = BapCancellation::query()
            ->join('baps', 'baps.id', '=', 'bap_cancellations.bap_id')
            ->where('baps.status', BapStatus::Completed->value)
            ->whereDate('baps.service_date', '>=', $this->period->startDate())
            ->whereDate('baps.service_date', '<=', $this->period->endDate());

        if ($this->period->loketId !== null) {
            $query->where('baps.loket_id', $this->period->loketId);
        }

        return $query;
    }
}
