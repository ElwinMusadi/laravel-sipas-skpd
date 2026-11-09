<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\SkpdBox;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateSkpdBox
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, SkpdBox $box, string $boxNumber, string $centralStorageLocation, CarbonImmutable $receivedAt): SkpdBox
    {
        $boxNumber = strtoupper(trim($boxNumber));
        $centralStorageLocation = trim($centralStorageLocation);

        return DB::transaction(function () use ($actor, $box, $boxNumber, $centralStorageLocation, $receivedAt): SkpdBox {
            $this->lockInventory();

            $lockedBox = SkpdBox::query()->lockForUpdate()->findOrFail($box->id);

            if (SkpdBox::query()
                ->where('box_number', $boxNumber)
                ->whereKeyNot($lockedBox->id)
                ->lockForUpdate()
                ->exists()) {
                throw ValidationException::withMessages([
                    'box_number' => 'Nomor box sudah terdaftar.',
                ]);
            }

            $oldValues = $this->values($lockedBox);

            $lockedBox->update([
                'box_number' => $boxNumber,
                'central_storage_location' => $centralStorageLocation,
                'received_at' => $receivedAt,
            ]);

            $this->audit->handle($actor, $lockedBox, 'skpd_box.updated', $oldValues, $this->values($lockedBox));

            return $lockedBox;
        }, attempts: 3);
    }

    /**
     * @return array{box_number: string, central_storage_location: string, received_at: string}
     */
    private function values(SkpdBox $box): array
    {
        return [
            'box_number' => $box->box_number,
            'central_storage_location' => $box->central_storage_location,
            'received_at' => $box->received_at->toDateString(),
        ];
    }
}
