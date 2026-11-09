<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * A Laporan Sistem sheet built from prepared rows: the application name on row 1,
 * the report title on row 2, and a header row styled like the other report sheets.
 */
final class LaporanSistemArraySheet implements FromArray, ShouldAutoSize, WithColumnWidths, WithEvents, WithStrictNullComparison, WithStyles, WithTitle
{
    /**
     * @param  array<int, array<int, int|string|null>>  $rows
     * @param  array<string, int>  $columnWidths
     * @param  list<int>  $italicRows
     */
    public function __construct(
        private readonly string $title,
        private readonly array $rows,
        private readonly array $columnWidths,
        private readonly int $headerRow,
        private readonly bool $filterable = false,
        private readonly array $italicRows = [],
    ) {}

    /**
     * @return array<int, array<int, int|string|null>>
     */
    public function array(): array
    {
        return $this->rows;
    }

    /**
     * @return array<string, int>
     */
    public function columnWidths(): array
    {
        return $this->columnWidths;
    }

    /**
     * @return array<string, callable>
     */
    public function registerEvents(): array
    {
        if (! $this->filterable) {
            return [];
        }

        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $sheet = $event->sheet->getDelegate();
                $sheet->freezePane('A'.($this->headerRow + 1));
                $sheet->setAutoFilter('A'.$this->headerRow.':'.$sheet->getHighestColumn().$sheet->getHighestRow());
            },
        ];
    }

    /**
     * @return array<int|string, array<string, mixed>>
     */
    public function styles(Worksheet $sheet): array
    {
        $styles = [
            1 => ['font' => ['bold' => true, 'size' => 14]],
            2 => ['font' => ['bold' => true, 'size' => 12]],
            $this->headerRow => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'color' => ['rgb' => 'F3E8C3']]],
        ];

        foreach ($this->italicRows as $row) {
            $styles[$row] = ['font' => ['italic' => true]];
        }

        return $styles;
    }

    public function title(): string
    {
        return $this->title;
    }
}
