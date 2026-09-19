<?php

namespace App\Actions\SkpdInventory;

use App\BapCancellationReason;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapUsageSegment;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Domain helper that synchronises the `bap_cancellations` child rows for a draft BAP
 * inside an already-open DB transaction and after the inventory lock has been acquired.
 *
 * Call only from CreateBap or UpdateBap — never directly from a controller.
 *
 * Contract:
 *  - Exactly $expectedCount child rows after the call, unless an exception is thrown.
 *  - All rows match the validated payload items.
 *  - Orphan rows (outside [numeratorStart, numeratorEnd]) are rejected on update via
 *    the incoming payload; callers ensure stale rows are not present by providing the
 *    complete final list.
 */
class SynchronizeBapCancellations
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    /**
     * @param  list<array{numerator: int, reason: BapCancellationReason, description: string|null}>  $items
     */
    public function handle(
        User $actor,
        Bap $bap,
        int $expectedCount,
        array $items,
    ): void {
        if (count($items) !== $expectedCount) {
            throw ValidationException::withMessages([
                'cancellation_count' => 'Jumlah SKPD Batal/Rusak harus sama dengan jumlah detail yang diisi.',
            ]);
        }

        if ($expectedCount === 0) {
            $this->purgeAll($actor, $bap);

            return;
        }

        $numeratorStart = $bap->numerator_start;
        $numeratorEnd = $bap->numerator_end;

        // Validate all numerators before touching the database
        $incomingNumerators = [];

        foreach ($items as $index => $item) {
            $numerator = $item['numerator'];

            if ($numerator < $numeratorStart || $numerator > $numeratorEnd) {
                throw ValidationException::withMessages([
                    "cancellations.{$index}.numerator" => "Nomerator {$numerator} berada di luar range BAP ({$numeratorStart}–{$numeratorEnd}).",
                ]);
            }

            if (! BapUsageSegment::query()
                ->where('bap_id', $bap->id)
                ->where('numerator_start', '<=', $numerator)
                ->where('numerator_end', '>=', $numerator)
                ->lockForUpdate()
                ->exists()
            ) {
                throw ValidationException::withMessages([
                    "cancellations.{$index}.numerator" => "Nomerator {$numerator} tidak tercatat sebagai pemakaian pada BAP ini.",
                ]);
            }

            if (in_array($numerator, $incomingNumerators, true)) {
                throw ValidationException::withMessages([
                    "cancellations.{$index}.numerator" => "Nomerator {$numerator} muncul lebih dari satu kali dalam detail Batal/Rusak.",
                ]);
            }

            $incomingNumerators[] = $numerator;

            if ($item['reason']->requiresDescription() && empty($item['description'])) {
                throw ValidationException::withMessages([
                    "cancellations.{$index}.description" => 'Keterangan wajib diisi untuk alasan "Isi Sendiri".',
                ]);
            }
        }

        // Load existing child rows for this BAP locked for update
        /** @var Collection<int, BapCancellation> $existing */
        $existing = BapCancellation::query()
            ->where('bap_id', $bap->id)
            ->lockForUpdate()
            ->get();

        $existingByNumerator = $existing->keyBy('numerator');

        // Check global uniqueness for numerators that are new (not already owned by this BAP)
        foreach ($incomingNumerators as $numerator) {
            if (! $existingByNumerator->has($numerator)) {
                if (BapCancellation::query()
                    ->where('numerator', $numerator)
                    ->lockForUpdate()
                    ->exists()
                ) {
                    throw ValidationException::withMessages([
                        'cancellations' => "Nomerator {$numerator} sudah pernah dicatat sebagai batal/rusak dan tidak dapat digunakan ulang.",
                    ]);
                }
            }
        }

        // Remove child rows whose numerator is no longer in the payload
        $toRemove = $existing->whereNotIn('numerator', $incomingNumerators);

        foreach ($toRemove as $orphan) {
            $this->audit->handle($actor, $bap, 'bap_cancellation.removed', [
                'numerator' => $orphan->numerator,
                'reason' => $orphan->reason->value,
                'description' => $orphan->description,
            ], null);
            $orphan->delete();
        }

        // Upsert: update existing, create new
        foreach ($items as $item) {
            $numerator = $item['numerator'];
            $reason = $item['reason'];
            $description = filled($item['description']) ? trim((string) $item['description']) : null;

            if ($existingByNumerator->has($numerator)) {
                /** @var BapCancellation $row */
                $row = $existingByNumerator->get($numerator);
                $before = ['reason' => $row->reason->value, 'description' => $row->description];
                $after = ['reason' => $reason->value, 'description' => $description];

                if ($before !== $after) {
                    $row->update(['reason' => $reason, 'description' => $description]);
                    $this->audit->handle($actor, $bap, 'bap_cancellation.updated', [
                        'numerator' => $numerator,
                        ...$before,
                    ], [
                        'numerator' => $numerator,
                        ...$after,
                    ]);
                }
            } else {
                BapCancellation::create([
                    'bap_id' => $bap->id,
                    'numerator' => $numerator,
                    'reason' => $reason,
                    'description' => $description,
                    'created_by' => $actor->id,
                ]);
                $this->audit->handle($actor, $bap, 'bap_cancellation.recorded', null, [
                    'numerator' => $numerator,
                    'reason' => $reason->value,
                    'description' => $description,
                ]);
            }
        }
    }

    private function purgeAll(User $actor, Bap $bap): void
    {
        /** @var Collection<int, BapCancellation> $existing */
        $existing = BapCancellation::query()
            ->where('bap_id', $bap->id)
            ->lockForUpdate()
            ->get();

        foreach ($existing as $orphan) {
            $this->audit->handle($actor, $bap, 'bap_cancellation.removed', [
                'numerator' => $orphan->numerator,
                'reason' => $orphan->reason->value,
                'description' => $orphan->description,
            ], null);
            $orphan->delete();
        }
    }
}
