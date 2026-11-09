<?php

namespace App\Exports;

use App\SkpdLaporanDistribusiQuery;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

final class SkpdLaporanDistribusiExport implements Export, WithMultipleSheets
{
    public function __construct(private readonly SkpdLaporanDistribusiQuery $report) {}

    /**
     * @return array<int, Export>
     */
    public function sheets(): array
    {
        return [
            $this->ringkasanSheet(),
            $this->loketRecapSheet(),
            new SkpdLaporanDistribusiDetailSheet($this->report),
        ];
    }

    private function ringkasanSheet(): LaporanSistemArraySheet
    {
        $summary = $this->report->summary();
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Laporan Distribusi SKPD'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            [null],
            ['Status', 'Jumlah Alokasi', 'Jumlah Set'],
            ['Didistribusikan', $summary['distributed_allocations'], $summary['distributed_sets']],
        ];

        foreach ($summary['statuses'] as $status) {
            $rows[] = [$status['label'], $status['total_allocations'], $status['total_sets']];
        }

        $rows[] = [null];
        $rows[] = ['Keterangan', 'Didistribusikan = Menunggu handover + Diterima + Selesai digunakan. Dibatalkan dan Dikembalikan ke pusat tidak termasuk.'];

        return new LaporanSistemArraySheet(
            'Ringkasan',
            $rows,
            ['A' => 28, 'B' => 18, 'C' => 18],
            headerRow: 6,
            italicRows: [count($rows)],
        );
    }

    private function loketRecapSheet(): LaporanSistemArraySheet
    {
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Rekap Distribusi per Loket'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            [null],
            ['Loket', 'Alokasi', 'Set Didistribusikan', 'Menunggu Handover', 'Diterima Loket', 'Dibatalkan', 'Dikembalikan ke Pusat'],
        ];

        foreach ($this->report->loketRecaps() as $recap) {
            $rows[] = [
                $recap['loket'],
                $recap['distributed_allocations'],
                $recap['distributed_sets'],
                $recap['pending_sets'],
                $recap['received_sets'],
                $recap['cancelled_sets'],
                $recap['returned_sets'],
            ];
        }

        return new LaporanSistemArraySheet(
            'Rekap Loket',
            $rows,
            ['A' => 32, 'B' => 12, 'C' => 20, 'D' => 20, 'E' => 16, 'F' => 14, 'G' => 22],
            headerRow: 6,
            filterable: true,
        );
    }
}
