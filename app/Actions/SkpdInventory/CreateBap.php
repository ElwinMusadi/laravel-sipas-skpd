<?php

namespace App\Actions\SkpdInventory;

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapUsageSegment;
use App\Models\Loket;
use App\Models\User;
use App\SkpdAllocationStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateBap
{
    public function __construct(
        private readonly RecordDomainAudit $audit,
        private readonly GenerateBapDocumentNumber $generateDocumentNumber,
        private readonly SynchronizeBapCancellations $syncCancellations,
        private readonly BapAllocationSequence $allocationSequence,
    ) {}

    /**
     * @param  list<array{numerator: int, reason: BapCancellationReason, description: string|null}>  $cancellations
     */
    public function handle(
        User $actor,
        Loket $loket,
        CarbonInterface $serviceDate,
        int $numeratorStart,
        int $numeratorEnd,
        int $onlineUsageCount = 0,
        int $cancellationCount = 0,
        array $cancellations = [],
    ): Bap {
        $this->validateRange($numeratorStart, $numeratorEnd);

        $totalUsage = $numeratorEnd - $numeratorStart + 1;

        if ($onlineUsageCount < 0 || $onlineUsageCount > $totalUsage) {
            throw ValidationException::withMessages([
                'online_usage_count' => 'Jumlah SKPD online harus berada di antara 0 dan total pemakaian.',
            ]);
        }

        if (! $actor->canOperateAtLoket($loket->id)) {
            throw ValidationException::withMessages([
                'loket_id' => 'BAP hanya dapat dibuat oleh Petugas Loket yang dituju.',
            ]);
        }

        return DB::transaction(function () use ($actor, $loket, $serviceDate, $numeratorStart, $numeratorEnd, $onlineUsageCount, $totalUsage, $cancellationCount, $cancellations): Bap {
            $this->lockInventory();
            $lockedLoket = Loket::query()->lockForUpdate()->findOrFail($loket->id);

            if (! $lockedLoket->is_active) {
                throw ValidationException::withMessages([
                    'loket_id' => 'Loket tidak aktif dan tidak dapat membuat BAP baru.',
                ]);
            }

            /** @var Collection<int, Bap> $existingBaps */
            $existingBaps = Bap::query()
                ->where('loket_id', $lockedLoket->id)
                ->orderBy('service_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $serviceDateString = $serviceDate->toDateString();
            $documentNumber = $this->generateDocumentNumber->handle($lockedLoket, now());

            if ($existingBaps->contains(fn (Bap $bap): bool => $bap->service_date->toDateString() === $serviceDateString)) {
                throw ValidationException::withMessages([
                    'service_date' => 'Loket hanya dapat memiliki satu BAP pada satu hari pelayanan.',
                ]);
            }

            $allocations = $this->allocationSequence->receivedAllocations($lockedLoket->id, lockForUpdate: true);

            if ($allocations->isEmpty()) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Loket belum memiliki alokasi SKPD yang telah diterima.',
                ]);
            }

            $latestBap = $existingBaps->last();

            if ($latestBap !== null && $serviceDate->lessThan($latestBap->service_date)) {
                throw ValidationException::withMessages([
                    'service_date' => 'Tanggal pelayanan tidak boleh lebih awal dari BAP Loket terakhir.',
                ]);
            }

            $expectedStart = $this->allocationSequence->expectedStart($allocations, $latestBap);

            if ($expectedStart === null) {
                throw ValidationException::withMessages([
                    'numerator_start' => 'Tidak ada sisa Nomerator pada alokasi Loket yang telah diterima.',
                ]);
            }

            if ($numeratorStart !== $expectedStart) {
                throw ValidationException::withMessages([
                    'numerator_start' => "Nomerator awal harus {$expectedStart} agar urutan tetap berkelanjutan.",
                ]);
            }

            $segments = $this->allocationSequence->segmentsForRange($allocations, $numeratorStart, $numeratorEnd, lockForUpdate: true);

            if ($segments === []) {
                throw ValidationException::withMessages([
                    'numerator_end' => 'Range Nomerator BAP harus berada dalam urutan alokasi Loket yang telah diterima, tanpa celah atau tumpang tindih pemakaian.',
                ]);
            }

            $bap = Bap::create([
                'document_number' => $documentNumber,
                'loket_id' => $lockedLoket->id,
                'service_date' => $serviceDateString,
                'numerator_start' => $numeratorStart,
                'numerator_end' => $numeratorEnd,
                'total_usage' => $totalUsage,
                'online_usage_count' => $onlineUsageCount,
                'status' => BapStatus::Draft,
                'created_by' => $actor->id,
            ]);

            foreach ($segments as $segment) {
                BapUsageSegment::create([
                    'bap_id' => $bap->id,
                    ...$segment,
                ]);
            }

            $this->audit->handle($actor, $bap, 'bap_usage_segments.created', null, [
                'segments' => $segments,
                'total_usage' => $totalUsage,
            ]);

            foreach (array_unique(array_column($segments, 'skpd_allocation_id')) as $allocationId) {
                $allocation = $allocations->firstWhere('id', $allocationId);

                if ($allocation !== null && (int) $allocation->usageSegments()->sum('quantity') === $allocation->quantity) {
                    $allocation->update(['status' => SkpdAllocationStatus::Completed]);
                }
            }

            $this->audit->handle($actor, $bap, 'bap.created', null, [
                'document_number' => $bap->document_number,
                'loket_id' => $bap->loket_id,
                'service_date' => $bap->service_date->toDateString(),
                'numerator_start' => $bap->numerator_start,
                'numerator_end' => $bap->numerator_end,
                'total_usage' => $bap->total_usage,
                'online_usage_count' => $bap->online_usage_count,
                'status' => $bap->status->value,
            ]);

            $this->syncCancellations->handle($actor, $bap, $cancellationCount, $cancellations);

            return $bap;
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
