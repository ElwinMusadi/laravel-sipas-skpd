<?php

namespace App\Exports;

use App\Models\SkpdBox;
use App\SkpdLaporanPersediaanQuery;
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

final class SkpdLaporanPersediaanBoxSheet implements FromQuery, ShouldAutoSize, WithColumnFormatting, WithEvents, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(private readonly SkpdLaporanPersediaanQuery $report) {}

    /**
     * @return Builder<SkpdBox>
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
            'Box',
            'Nomerator Awal',
            'Nomerator Akhir',
            'Total Set',
            'Dialokasikan ke Loket',
            'Menunggu Handover',
            'Terpakai',
            'Sisa di Pusat',
            'Sisa di Loket',
        ];
    }

    /**
     * @return list<int|string>
     */
    public function map(mixed $row): array
    {
        assert($row instanceof SkpdBox);

        $box = SkpdLaporanPersediaanQuery::boxData($row);

        return [
            $box['box_number'],
            sprintf('%07d', $box['numerator_start']),
            sprintf('%07d', $box['numerator_end']),
            $box['total_sets'],
            $box['allocated_quantity'],
            $box['pending_quantity'],
            $box['used_quantity'],
            $box['central_remaining'],
            $box['loket_remaining'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT,
            'C' => NumberFormat::FORMAT_TEXT,
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
                $sheet->setAutoFilter('A1:I'.$sheet->getHighestRow());
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
        return 'Per Box';
    }
}
