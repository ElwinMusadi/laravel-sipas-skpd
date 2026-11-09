<?php

namespace App\Exports;

use App\Models\BapCancellation;
use App\SkpdLaporanBatalRusakQuery;
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

final class SkpdLaporanBatalRusakDetailSheet implements FromQuery, ShouldAutoSize, WithColumnFormatting, WithEvents, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(private readonly SkpdLaporanBatalRusakQuery $report) {}

    /**
     * @return Builder<BapCancellation>
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
            'Tanggal Pelayanan',
            'Nomor Dokumen BAP',
            'Loket',
            'Nomerator',
            'Alasan',
            'Keterangan',
        ];
    }

    /**
     * @return list<string>
     */
    public function map(mixed $row): array
    {
        assert($row instanceof BapCancellation);

        return [
            $row->bap->service_date->toDateString(),
            $row->bap->document_number,
            $row->bap->loket->name,
            sprintf('%07d', $row->numerator),
            $row->reason->label(),
            $row->description ?? '',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        return [
            'D' => NumberFormat::FORMAT_TEXT,
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
                $sheet->setAutoFilter('A1:F'.$sheet->getHighestRow());
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
