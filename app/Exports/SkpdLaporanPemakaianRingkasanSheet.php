<?php

namespace App\Exports;

use App\SkpdLaporanPemakaianQuery;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class SkpdLaporanPemakaianRingkasanSheet implements FromArray, ShouldAutoSize, WithColumnWidths, WithStrictNullComparison, WithStyles, WithTitle
{
    public function __construct(private readonly SkpdLaporanPemakaianQuery $report) {}

    /**
     * @return array<int, array<int, int|string|null>>
     */
    public function array(): array
    {
        $summary = $this->report->summary();

        return [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Laporan Pemakaian SKPD'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            [null],
            ['Ringkasan', 'Nilai'],
            ['Total BAP', $summary['total_baps']],
            ['SKPD Terpakai', $summary['total_usage']],
            ['Online', $summary['total_online']],
            ['Batal/Rusak', $summary['total_cancellations']],
            [null],
            ['Keterangan', 'Batal/Rusak dan Online termasuk dalam total SKPD terpakai.'],
        ];
    }

    /**
     * @return array<string, int>
     */
    public function columnWidths(): array
    {
        return [
            'A' => 28,
            'B' => 52,
        ];
    }

    /**
     * @return array<int|string, array<string, mixed>>
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14]],
            2 => ['font' => ['bold' => true, 'size' => 12]],
            6 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'color' => ['rgb' => 'F3E8C3']]],
            12 => ['font' => ['italic' => true]],
        ];
    }

    public function title(): string
    {
        return 'Ringkasan';
    }
}
