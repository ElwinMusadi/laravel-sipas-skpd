<?php

namespace App\Exports;

use App\BapCancellationReason;
use App\SkpdLaporanBatalRusakQuery;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

final class SkpdLaporanBatalRusakExport implements Export, WithMultipleSheets
{
    public function __construct(private readonly SkpdLaporanBatalRusakQuery $report) {}

    /**
     * @return array<int, Export>
     */
    public function sheets(): array
    {
        return [
            $this->ringkasanSheet(),
            $this->loketRecapSheet(),
            new SkpdLaporanBatalRusakDetailSheet($this->report),
        ];
    }

    private function ringkasanSheet(): LaporanSistemArraySheet
    {
        $summary = $this->report->summary();
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Laporan Batal/Rusak SKPD'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            [null],
            ['Ringkasan', 'Nilai'],
            ['Total Batal/Rusak', $summary['total']],
        ];

        foreach ($summary['reasons'] as $reason) {
            $rows[] = [$reason['label'], $reason['total']];
        }

        $rows[] = [null];
        $rows[] = ['Keterangan', 'Hanya Nomerator Batal/Rusak pada BAP yang telah selesai administratif.'];

        return new LaporanSistemArraySheet(
            'Ringkasan',
            $rows,
            ['A' => 28, 'B' => 64],
            headerRow: 6,
            italicRows: [count($rows)],
        );
    }

    private function loketRecapSheet(): LaporanSistemArraySheet
    {
        $reasons = BapCancellationReason::cases();
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Rekap Batal/Rusak per Loket'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            [null],
            [
                'Loket',
                ...array_map(fn (BapCancellationReason $reason): string => $reason->label(), $reasons),
                'Total',
            ],
        ];

        foreach ($this->report->loketRecaps() as $recap) {
            $rows[] = [
                $recap['loket'],
                ...array_map(fn (BapCancellationReason $reason): int => $recap['reasons'][$reason->value] ?? 0, $reasons),
                $recap['total'],
            ];
        }

        return new LaporanSistemArraySheet(
            'Rekap Loket',
            $rows,
            ['A' => 32, 'B' => 12, 'C' => 12, 'D' => 16, 'E' => 16, 'F' => 14, 'G' => 12],
            headerRow: 6,
            filterable: true,
        );
    }
}
