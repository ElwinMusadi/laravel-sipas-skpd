<?php

namespace App\Actions\SkpdInventory;

use App\BapStatus;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResolution;
use App\Models\BapClarificationResponse;
use App\Models\BapUsageSegment;
use App\Models\BapVerification;
use App\Models\BapVerificationChecklistItem;
use App\Models\BapVerificationDiscrepancy;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HardDeleteCompletedBap
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Bap $bap, string $reason): void
    {
        if ($actor->role !== UserRole::Superadmin) {
            throw ValidationException::withMessages([
                'bap' => 'Hanya Superadmin yang dapat melakukan penghapusan permanen BAP.',
            ]);
        }

        DB::transaction(function () use ($actor, $bap, $reason): void {
            $this->lockInventory();

            $lockedLoket = Loket::query()->lockForUpdate()->findOrFail($bap->loket_id);

            /** @var Collection<int, Bap> $loketBaps */
            $loketBaps = Bap::query()
                ->where('loket_id', $lockedLoket->id)
                ->orderBy('numerator_end')
                ->lockForUpdate()
                ->get();

            $lockedBap = $loketBaps->firstWhere('id', $bap->id);

            if ($lockedBap === null) {
                throw ValidationException::withMessages([
                    'bap' => 'BAP tidak ditemukan pada Loket yang bersangkutan.',
                ]);
            }

            if ($lockedBap->status !== BapStatus::Completed) {
                throw ValidationException::withMessages([
                    'bap' => 'Hanya BAP berstatus completed yang dapat dihapus secara permanen.',
                ]);
            }

            $isTail = $loketBaps->last()?->is($lockedBap) ?? false;

            if (! $isTail) {
                throw ValidationException::withMessages([
                    'bap' => 'Hanya BAP paling akhir pada Loket (tail) yang dapat dihapus secara permanen untuk menjaga kontinuitas nomerator.',
                ]);
            }

            /** @var Collection<int, BapUsageSegment> $segments */
            $segments = BapUsageSegment::query()
                ->where('bap_id', $lockedBap->id)
                ->lockForUpdate()
                ->get();

            $allocationIds = $segments->pluck('skpd_allocation_id')->unique()->values();

            /** @var Collection<int, SkpdAllocation> $allocations */
            $allocations = SkpdAllocation::query()
                ->whereKey($allocationIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            /** @var Collection<int, BapVerification> $verifications */
            $verifications = BapVerification::query()
                ->where('bap_id', $lockedBap->id)
                ->lockForUpdate()
                ->get();

            $verificationIds = $verifications->pluck('id')->all();

            /** @var Collection<int, BapClarificationRequest> $clarifications */
            $clarifications = BapClarificationRequest::query()
                ->where('bap_id', $lockedBap->id)
                ->lockForUpdate()
                ->get();

            $clarificationIds = $clarifications->pluck('id')->all();

            $allocationImpact = $allocations
                ->map(fn (SkpdAllocation $allocation): array => [
                    'id' => $allocation->id,
                    'status_before' => $allocation->status->value,
                    'used_quantity_before' => (int) BapUsageSegment::query()
                        ->where('skpd_allocation_id', $allocation->id)
                        ->sum('quantity'),
                    'released_quantity' => (int) $segments
                        ->where('skpd_allocation_id', $allocation->id)
                        ->sum('quantity'),
                ])
                ->values()
                ->all();
            $cancellationsCount = $lockedBap->cancellations()->count();
            $checklistItemsCount = BapVerificationChecklistItem::query()
                ->whereIn('bap_verification_id', $verificationIds)
                ->count();
            $discrepanciesCount = BapVerificationDiscrepancy::query()
                ->whereIn('bap_verification_id', $verificationIds)
                ->count();
            $responsesCount = BapClarificationResponse::query()
                ->whereIn('bap_clarification_request_id', $clarificationIds)
                ->count();
            $resolutionsCount = BapClarificationResolution::query()
                ->whereIn('bap_clarification_request_id', $clarificationIds)
                ->count();

            $oldValues = [
                'id' => $lockedBap->id,
                'document_number' => $lockedBap->document_number,
                'loket_id' => $lockedBap->loket_id,
                'loket_name' => $lockedLoket->name,
                'service_date' => $lockedBap->service_date->toDateString(),
                'numerator_start' => $lockedBap->numerator_start,
                'numerator_end' => $lockedBap->numerator_end,
                'total_usage' => $lockedBap->total_usage,
                'online_usage_count' => $lockedBap->online_usage_count,
                'status' => $lockedBap->status->value,
                'created_by' => $lockedBap->created_by,
                'received_by' => $lockedBap->received_by,
                'received_at' => $lockedBap->received_at?->toIso8601String(),
                'segments_count' => $segments->count(),
                'cancellations_count' => $cancellationsCount,
                'verifications_count' => $verifications->count(),
                'verification_checklist_items_count' => $checklistItemsCount,
                'verification_discrepancies_count' => $discrepanciesCount,
                'clarifications_count' => $clarifications->count(),
                'clarification_responses_count' => $responsesCount,
                'clarification_resolutions_count' => $resolutionsCount,
                'allocation_impact' => $allocationImpact,
                'hard_delete_reason' => $reason,
            ];

            if ($clarificationIds !== []) {
                $responseIds = BapClarificationResponse::query()
                    ->whereIn('bap_clarification_request_id', $clarificationIds)
                    ->pluck('id')
                    ->all();

                if ($responseIds !== []) {
                    BapClarificationResolution::query()
                        ->whereIn('bap_clarification_response_id', $responseIds)
                        ->delete();

                    BapClarificationResponse::query()
                        ->whereIn('id', $responseIds)
                        ->delete();
                }

                BapClarificationResolution::query()
                    ->whereIn('bap_clarification_request_id', $clarificationIds)
                    ->delete();

                BapClarificationRequest::query()
                    ->whereIn('id', $clarificationIds)
                    ->delete();
            }

            if ($verificationIds !== []) {
                BapVerificationDiscrepancy::query()
                    ->whereIn('bap_verification_id', $verificationIds)
                    ->delete();

                BapVerificationChecklistItem::query()
                    ->whereIn('bap_verification_id', $verificationIds)
                    ->delete();

                BapVerification::query()
                    ->whereIn('id', $verificationIds)
                    ->delete();
            }

            $lockedBap->cancellations()->delete();
            BapUsageSegment::query()->where('bap_id', $lockedBap->id)->delete();

            foreach ($allocations as $index => $allocation) {
                $remainingUsage = (int) BapUsageSegment::query()
                    ->where('skpd_allocation_id', $allocation->id)
                    ->sum('quantity');

                $allocation->update([
                    'status' => $remainingUsage === $allocation->quantity
                        ? SkpdAllocationStatus::Completed
                        : SkpdAllocationStatus::Accepted,
                ]);

                $oldValues['allocation_impact'][$index]['status_after'] = $allocation->status->value;
                $oldValues['allocation_impact'][$index]['used_quantity_after'] = $remainingUsage;
            }

            $this->audit->handle($actor, $lockedBap, 'bap.hard_deleted', $oldValues);
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
