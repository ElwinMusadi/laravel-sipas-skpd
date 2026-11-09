<?php

namespace App\Actions\SkpdInventory;

use App\BapStatus;
use App\Concerns\LocksSkpdInventory;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapUsageSegment;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteDraftBap
{
    use LocksSkpdInventory;

    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Bap $bap): void
    {
        DB::transaction(function () use ($actor, $bap): void {
            $this->lockInventory();

            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);

            if (! $actor->canManageDraftBap($lockedBap) || $lockedBap->status !== BapStatus::Draft) {
                throw ValidationException::withMessages([
                    'bap' => 'Hanya draft BAP pada Loket Anda yang dapat dihapus.',
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

            if ($lockedBap->verifications()->lockForUpdate()->exists()
                || $lockedBap->clarificationRequests()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'bap' => 'BAP yang sudah memiliki riwayat verifikasi atau klarifikasi tidak dapat dihapus.',
                ]);
            }

            /** @var Collection<int, BapCancellation> $cancellations */
            $cancellations = BapCancellation::query()
                ->where('bap_id', $lockedBap->id)
                ->orderBy('numerator')
                ->lockForUpdate()
                ->get();

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
                'cancellations' => $cancellations->map(fn (BapCancellation $cancellation): array => [
                    'numerator' => $cancellation->numerator,
                    'reason' => $cancellation->reason->value,
                    'description' => $cancellation->description,
                ])->all(),
            ];

            BapCancellation::query()->where('bap_id', $lockedBap->id)->delete();
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
}
