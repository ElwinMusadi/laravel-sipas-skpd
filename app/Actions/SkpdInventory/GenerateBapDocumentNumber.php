<?php

namespace App\Actions\SkpdInventory;

use App\Models\Bap;
use App\Models\Loket;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;

/**
 * Builds the BAP document number `PB/<KODE_LOKET>/<DD>/<MM>/<YYYY>` from the
 * service date. When that number is already taken (a second BAP on the same
 * service date, or a legacy number based on the creation date), the next free
 * suffix is appended: `-2`, `-3`, and so on.
 *
 * Callers must hold the shared inventory lock so two BAPs cannot claim the same
 * number concurrently; the unique index on `baps.document_number` is the last
 * line of defence.
 */
class GenerateBapDocumentNumber
{
    public function handle(Loket $loket, CarbonInterface $serviceDate, ?int $ignoredBapId = null): string
    {
        $baseNumber = sprintf(
            'PB/%s/%s',
            $this->loketCode($loket),
            $serviceDate->format('d/m/Y'),
        );

        $documentNumber = $baseNumber;
        $sequence = 1;

        while ($this->isTaken($documentNumber, $ignoredBapId)) {
            $sequence++;
            $documentNumber = "{$baseNumber}-{$sequence}";
        }

        return $documentNumber;
    }

    private function isTaken(string $documentNumber, ?int $ignoredBapId): bool
    {
        return Bap::query()
            ->where('document_number', $documentNumber)
            ->when($ignoredBapId !== null, fn ($query) => $query->whereKeyNot($ignoredBapId))
            ->exists();
    }

    private function loketCode(Loket $loket): string
    {
        return match ($loket->code) {
            'MPP' => 'MPP',
            'SAMSAT-KANTOR' => 'LOKET',
            default => Str::upper((string) preg_replace('/[^\pL\pN]/u', '', $loket->name)),
        };
    }
}
