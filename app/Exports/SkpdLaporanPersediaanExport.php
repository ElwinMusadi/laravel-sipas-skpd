<?php

namespace App\Exports;

use App\SkpdLaporanPersediaanQuery;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

final class SkpdLaporanPersediaanExport implements Export, WithMultipleSheets
{
    public function __construct(private readonly SkpdLaporanPersediaanQuery $report) {}

    /**
     * @return array<int, Export>
     */
    public function sheets(): array
    {
        return [
            $this->ringkasanSheet(),
            new SkpdLaporanPersediaanBoxSheet($this->report),
            $this->loketRecapSheet(),
        ];
    }

    private function ringkasanSheet(): LaporanSistemArraySheet
    {
        $summary = $this->report->summary();
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Laporan Persediaan SKPD'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            ['Posisi per', $this->report->cutoffLabel()],
            ['Ringkasan', 'Nilai'],
            ['Jumlah Box', $summary['total_boxes']],
            ['Total Set', $summary['total_sets']],
            ['Dialokasikan ke Loket', $summary['allocated_quantity']],
            ['Menunggu Handover', $summary['pending_quantity']],
            ['Terpakai', $summary['used_quantity']],
            ['Sisa di Pusat', $summary['central_remaining']],
            ['Sisa di Loket', $summary['loket_remaining']],
            [null],
            ['Keterangan', 'Alokasi yang ditarik ke pusat dihitung dengan jumlah saat ini, sehingga periode sebelum penarikan menampilkan angka yang sudah berkurang.'],
        ];

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
        $rows = [
            ['SIPAS-SKPD'],
            ['Laporan Sistem — Persediaan per Loket'],
            ['Periode', $this->report->periodLabel()],
            ['Loket', $this->report->selectedLoketName() ?? 'Semua Loket'],
            ['Posisi per', $this->report->cutoffLabel()],
            ['Loket', 'Diterima', 'Menunggu Handover', 'Terpakai', 'Sisa di Loket'],
        ];

        foreach ($this->report->loketRecaps() as $recap) {
            $rows[] = [
                $recap['loket'],
                $recap['received_quantity'],
                $recap['pending_quantity'],
                $recap['used_quantity'],
                $recap['remaining_quantity'],
            ];
        }

        return new LaporanSistemArraySheet(
            'Per Loket',
            $rows,
            ['A' => 32, 'B' => 14, 'C' => 20, 'D' => 14, 'E' => 16],
            headerRow: 6,
            filterable: true,
        );
    }
}
