<?php

namespace App\Actions\SkpdInventory;

use App\Concerns\LocksSkpdInventory;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteSkpdBox
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, SkpdBox $box): void
    {
        DB::transaction(function () use ($actor, $box): void {
            $this->lockInventory();

            $lockedBox = SkpdBox::query()->lockForUpdate()->findOrFail($box->id);

            if (SkpdAllocation::query()->where('skpd_box_id', $lockedBox->id)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'box' => 'Box yang telah memiliki alokasi atau riwayat penggunaan tidak dapat dihapus.',
                ]);
            }

            $values = [
                'box_number' => $lockedBox->box_number,
                'numerator_start' => $lockedBox->numerator_start,
                'numerator_end' => $lockedBox->numerator_end,
                'total_sets' => $lockedBox->total_sets,
                'central_storage_location' => $lockedBox->central_storage_location,
                'received_at' => $lockedBox->received_at->toDateString(),
            ];

            $this->audit->handle($actor, $lockedBox, 'skpd_box.deleted', $values);
            $lockedBox->delete();
        }, attempts: 3);
    }
}
