<?php

namespace App\Actions\SkpdInventory;

use App\Models\SkpdBox;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterSkpdBox
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(
        User $actor,
        string $boxNumber,
        int $numeratorStart,
        int $numeratorEnd,
        CarbonInterface $receivedAt,
        string $centralStorageLocation = 'Bendahara Barang',
    ): SkpdBox {
        $this->validateRange($numeratorStart, $numeratorEnd);

        $boxNumber = mb_strtoupper(trim($boxNumber));
        $centralStorageLocation = trim($centralStorageLocation);

        if ($boxNumber === '') {
            throw ValidationException::withMessages([
                'box_number' => 'Nomor box wajib diisi.',
            ]);
        }

        if ($centralStorageLocation === '') {
            throw ValidationException::withMessages([
                'central_storage_location' => 'Lokasi fisik penyimpanan pusat wajib diisi.',
            ]);
        }

        return DB::transaction(function () use ($actor, $boxNumber, $numeratorStart, $numeratorEnd, $receivedAt, $centralStorageLocation): SkpdBox {
            $this->lockInventory();

            if (SkpdBox::query()->where('box_number', $boxNumber)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'box_number' => 'Nomor box sudah terdaftar.',
                ]);
            }

            $hasOverlap = SkpdBox::query()
                ->where('numerator_start', '<=', $numeratorEnd)
                ->where('numerator_end', '>=', $numeratorStart)
                ->lockForUpdate()
                ->exists();

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Range box tumpang tindih dengan box yang sudah terdaftar.',
                ]);
            }

            $box = SkpdBox::create([
                'box_number' => $boxNumber,
                'numerator_start' => $numeratorStart,
                'numerator_end' => $numeratorEnd,
                'total_sets' => $numeratorEnd - $numeratorStart + 1,
                'central_storage_location' => $centralStorageLocation,
                'created_by' => $actor->id,
                'received_at' => $receivedAt,
            ]);

            $this->audit->handle($actor, $box, 'skpd_box.registered', null, [
                'box_number' => $box->box_number,
                'numerator_start' => $box->numerator_start,
                'numerator_end' => $box->numerator_end,
                'total_sets' => $box->total_sets,
                'central_storage_location' => $box->central_storage_location,
            ]);

            return $box;
        }, attempts: 3);
    }

    private function lockInventory(): void
    {
        $lock = DB::table('skpd_inventory_locks')
            ->where('id', 1)
            ->lockForUpdate()
            ->first();

        if ($lock === null) {
            throw new \LogicException('Kunci transaksi inventaris SKPD tidak tersedia.');
        }
    }

    private function validateRange(int $numeratorStart, int $numeratorEnd): void
    {
        if ($numeratorStart < 1 || $numeratorEnd > 9_999_999 || $numeratorEnd < $numeratorStart) {
            throw ValidationException::withMessages([
                'numerator_start' => 'Range nomerator harus berada pada 0000001–9999999 dan berurutan.',
            ]);
        }
    }
}
