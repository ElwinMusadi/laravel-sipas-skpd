<?php

namespace App\Exports;

use App\Models\SkpdAllocation;
use App\SkpdLaporanDistribusiQuery;
use App\Support\LaporanPeriod;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class SkpdLaporanDistribusiDetailSheet implements FromQuery, ShouldAutoSize, WithColumnFormatting, WithEvents, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(private readonly SkpdLaporanDistribusiQuery $report) {}

    /**
     * @return Builder<SkpdAllocation>
     */
    public function query(): Builder
    {
        return $this->report->detailQuery();
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return [
            'Tanggal Alokasi',
            'Box',
            'Loket',
            'Nomerator Awal',
            'Nomerator Akhir',
            'Jumlah Set',
            'Status',
            'Dibuat Oleh',
            'Diterima Oleh',
            'Waktu Diterima (WITA)',
        ];
    }

    /**
     * @return list<int|string>
     */
    public function map(mixed $row): array
    {
        assert($row instanceof SkpdAllocation);

        return [
            SkpdLaporanDistribusiQuery::allocationDate($row),
            $row->skpdBox->box_number,
            $row->loket->name,
            sprintf('%07d', $row->numerator_start),
            sprintf('%07d', $row->numerator_end),
            $row->quantity,
            $row->status->label(),
            $row->creator->name,
            $row->acceptor->name ?? '',
            LaporanPeriod::businessTime($row->accepted_at)?->format('Y-m-d H:i') ?? '',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        return [
            'D' => NumberFormat::FORMAT_TEXT,
            'E' => NumberFormat::FORMAT_TEXT,
        ];
    }

    /**
     * @return array<string, callable>
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $sheet = $event->sheet->getDelegate();
                $sheet->freezePane('A2');
                $sheet->setAutoFilter('A1:J'.$sheet->getHighestRow());
            },
        ];
    }

    /**
     * @return array<int|string, array<string, mixed>>
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'color' => ['rgb' => 'F3E8C3']]],
        ];
    }

    public function title(): string
    {
        return 'Detail';
    }
}
