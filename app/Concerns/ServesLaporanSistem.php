<?php

namespace App\Concerns;

use App\Models\Loket;
use App\Support\BusinessDate;
use App\Support\LaporanPeriod;
use Illuminate\Http\Request;

/**
 * Shared request handling for the read-only Laporan Sistem controllers.
 */
trait ServesLaporanSistem
{
    private function laporanPeriod(Request $request): LaporanPeriod
    {
        $filters = $request->validate([
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'between:2000,9999'],
            'loket' => ['nullable', 'integer', 'exists:lokets,id'],
        ]);

        return new LaporanPeriod(
            isset($filters['month']) ? (int) $filters['month'] : BusinessDate::now()->month,
            isset($filters['year']) ? (int) $filters['year'] : BusinessDate::now()->year,
            isset($filters['loket']) ? (int) $filters['loket'] : null,
        );
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function loketOptions(): array
    {
        return array_values(Loket::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Loket $loket): array => [
                'id' => $loket->id,
                'name' => $loket->name,
            ])
            ->all());
    }

    private function logoDataUri(): ?string
    {
        $path = public_path('images/logo-pemprov-ntt.png');

        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode($contents);
    }
}
