<?php

namespace App\Actions\SkpdInventory;

use App\BapStatus;
use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteDraftBap
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Bap $bap): void
    {
        DB::transaction(function () use ($actor, $bap): void {
            $this->lockInventory();

            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);

            if (! $actor->canManageDraftBap($lockedBap) || $lockedBap->status !== BapStatus::Draft) {
                throw ValidationException::withMessages([
                    'bap' => 'Hanya BAP draft milik petugas yang berwenang yang dapat dihapus.',
                ]);
            }

            $hasLaterBap = Bap::query()
                ->where('loket_id', $lockedBap->loket_id)
                ->whereKeyNot($lockedBap->id)
                ->where(function ($query) use ($lockedBap): void {
                    $query
                        ->whereDate('service_date', '>', $lockedBap->service_date)
                        ->orWhere(function ($query) use ($lockedBap): void {
                            $query
                                ->whereDate('service_date', $lockedBap->service_date)
                                ->where('id', '>', $lockedBap->id);
                        });
                })
                ->lockForUpdate()
                ->exists();

            if ($hasLaterBap) {
                throw ValidationException::withMessages([
                    'bap' => 'Draft BAP tidak dapat dihapus karena sudah ada BAP Loket berikutnya. Hapus dimulai dari BAP paling akhir agar urutan Nomerator tidak berlubang.',
                ]);
            }

            if ($lockedBap->cancellations()->lockForUpdate()->exists()
                || $lockedBap->verifications()->lockForUpdate()->exists()
                || $lockedBap->clarificationRequests()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'bap' => 'BAP yang sudah memiliki catatan pembatalan, verifikasi, atau klarifikasi tidak dapat dihapus.',
                ]);
            }

            $segments = BapUsageSegment::query()
                ->where('bap_id', $lockedBap->id)
                ->lockForUpdate()
                ->get();

            $allocationIds = $segments->pluck('skpd_allocation_id')->unique()->values();
            $allocations = SkpdAllocation::query()
                ->whereKey($allocationIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $oldValues = [
                'loket_id' => $lockedBap->loket_id,
                'service_date' => $lockedBap->service_date->toDateString(),
                'numerator_start' => $lockedBap->numerator_start,
                'numerator_end' => $lockedBap->numerator_end,
                'total_usage' => $lockedBap->total_usage,
                'online_usage_count' => $lockedBap->online_usage_count,
                'status' => $lockedBap->status->value,
                'segments' => $segments->map(fn (BapUsageSegment $segment): array => [
                    'skpd_allocation_id' => $segment->skpd_allocation_id,
                    'numerator_start' => $segment->numerator_start,
                    'numerator_end' => $segment->numerator_end,
                    'quantity' => $segment->quantity,
                ])->all(),
            ];

            BapUsageSegment::query()->where('bap_id', $lockedBap->id)->delete();

            foreach ($allocations as $allocation) {
                $remainingUsage = (int) BapUsageSegment::query()
                    ->where('skpd_allocation_id', $allocation->id)
                    ->sum('quantity');

                $allocation->update([
                    'status' => $remainingUsage === $allocation->quantity
                        ? SkpdAllocationStatus::Completed
                        : SkpdAllocationStatus::Accepted,
                ]);
            }

            $this->audit->handle($actor, $lockedBap, 'bap.deleted', $oldValues);
            $lockedBap->delete();
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
}
