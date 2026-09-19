<?php

namespace App\Actions\SkpdVerification;

use App\Actions\SkpdInventory\RecordDomainAudit;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\BapVerificationStatus;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapVerification;
use App\Models\BapVerificationChecklistItem;
use App\Models\BapVerificationDiscrepancy;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteBapVerification
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    /**
     * @param  array{
     *     result: string,
     *     notes?: string|null,
     *     checklist: list<array{
     *         type: string,
     *         is_attested: bool|int|string,
     *         actual_quantity?: int|string|null,
     *         actual_numerator_start?: int|string|null,
     *         actual_numerator_end?: int|string|null
     *     }>,
     *     discrepancies?: list<array{type: string, notes: string}>
     * }  $attributes
     */
    public function handle(
        User $actor,
        Bap $bap,
        BapVerificationStage $stage,
        array $attributes,
    ): BapVerification {
        return DB::transaction(function () use ($actor, $bap, $stage, $attributes): BapVerification {
            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);
            $verification = BapVerification::query()
                ->where('bap_id', $lockedBap->id)
                ->where('stage', $stage)
                ->where('status', BapVerificationStatus::InProgress)
                ->latest('attempt')
                ->lockForUpdate()
                ->first();

            if ($verification === null || $lockedBap->status !== $stage->inProgressBapStatus()) {
                throw ValidationException::withMessages([
                    'status' => 'BAP tidak berada pada status verifikasi yang sedang berlangsung.',
                ]);
            }

            if (! $actor->canVerifyStage($stage) || $verification->verifier_id !== $actor->id) {
                throw ValidationException::withMessages([
                    'bap' => "Hanya verifier {$stage->label()} yang memulai pemeriksaan ini dapat menyelesaikannya.",
                ]);
            }

            if ($verification->status !== BapVerificationStatus::InProgress) {
                throw ValidationException::withMessages([
                    'status' => 'Verifikasi ini sudah tidak berada pada state yang dapat diselesaikan.',
                ]);
            }

            $result = BapVerificationResult::from($attributes['result']);
            $discrepancyNotes = $this->discrepancyNotesByType($attributes['discrepancies'] ?? []);
            $findings = [];

            foreach (BapVerificationChecklistType::cases() as $type) {
                $input = $this->checklistInput($attributes['checklist'], $type);
                $finding = $this->recordChecklistItem($verification, $lockedBap, $type, $input);

                if (! $finding['matches']) {
                    $findings[$type->value] = $finding;
                }
            }

            $this->validateResult($result, $findings, $discrepancyNotes);

            $verification->update([
                'status' => BapVerificationStatus::Completed,
                'result' => $result,
                'notes' => filled($attributes['notes'] ?? null) ? trim((string) $attributes['notes']) : null,
                'completed_at' => now(),
            ]);

            $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_checklist_completed', null, [
                'verification_id' => $verification->id,
                'checklist_count' => count(BapVerificationChecklistType::cases()),
                'result' => $result->value,
            ]);

            if ($result === BapVerificationResult::Passed) {
                $lockedBap->transitionTo($stage->passedBapStatus());
                $lockedBap->save();

                $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_passed', [
                    'status' => $stage->inProgressBapStatus()->value,
                ], [
                    'verification_id' => $verification->id,
                    'status' => $lockedBap->status->value,
                ]);
            } else {
                foreach ($findings as $type => $finding) {
                    BapVerificationDiscrepancy::create([
                        'bap_verification_id' => $verification->id,
                        'bap_verification_checklist_item_id' => $finding['checklist_item']->id,
                        'type' => $type,
                        'expected_value' => $finding['expected_value'],
                        'actual_value' => $finding['actual_value'],
                        'difference' => $finding['difference'],
                        'notes' => trim($discrepancyNotes[$type]),
                    ]);
                }

                $lockedBap->transitionTo(BapStatus::NeedsClarification);
                $lockedBap->save();

                $clarification = BapClarificationRequest::create([
                    'bap_id' => $lockedBap->id,
                    'bap_verification_id' => $verification->id,
                    'requested_by' => $actor->id,
                    'status' => BapClarificationStatus::WaitingResponse,
                    'notes' => filled($attributes['notes'] ?? null) ? trim((string) $attributes['notes']) : null,
                ]);

                $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_discrepancy_recorded', [
                    'status' => $stage->inProgressBapStatus()->value,
                ], [
                    'verification_id' => $verification->id,
                    'discrepancy_count' => count($findings),
                ]);
                $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_sent_to_clarification', null, [
                    'verification_id' => $verification->id,
                    'status' => $lockedBap->status->value,
                ]);
                $this->audit->handle($actor, $lockedBap, 'bap_clarification.requested', null, [
                    'clarification_id' => $clarification->id,
                    'verification_id' => $verification->id,
                    'stage' => $stage->value,
                    'status' => BapClarificationStatus::WaitingResponse->value,
                ]);
            }

            $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_completed', null, [
                'verification_id' => $verification->id,
                'attempt' => $verification->attempt,
                'result' => $result->value,
                'completed_at' => $verification->completed_at?->toISOString(),
            ]);

            if ($verification->attempt > 1) {
                $this->audit->handle($actor, $lockedBap, 'bap_clarification.reverification_completed', null, [
                    'verification_id' => $verification->id,
                    'stage' => $stage->value,
                    'attempt' => $verification->attempt,
                    'result' => $result->value,
                    'completed_at' => $verification->completed_at?->toISOString(),
                ]);
            }

            return $verification;
        }, attempts: 3);
    }

    /**
     * @param  list<array{type: string, notes: string}>  $discrepancies
     * @return array<string, string>
     */
    private function discrepancyNotesByType(array $discrepancies): array
    {
        $notes = [];

        foreach ($discrepancies as $discrepancy) {
            $notes[$discrepancy['type']] = $discrepancy['notes'];
        }

        return $notes;
    }

    /**
     * @param  list<array{
     *     type: string,
     *     is_attested: bool|int|string,
     *     actual_quantity?: int|string|null,
     *     actual_numerator_start?: int|string|null,
     *     actual_numerator_end?: int|string|null
     * }>  $checklist
     * @return array{
     *     type: string,
     *     is_attested: bool|int|string,
     *     actual_quantity?: int|string|null,
     *     actual_numerator_start?: int|string|null,
     *     actual_numerator_end?: int|string|null
     * }
     */
    private function checklistInput(array $checklist, BapVerificationChecklistType $type): array
    {
        foreach ($checklist as $item) {
            if ($item['type'] === $type->value) {
                return $item;
            }
        }

        throw ValidationException::withMessages([
            'checklist' => "Item pemeriksaan {$type->label()} wajib diisi.",
        ]);
    }

    /**
     * @param  array{
     *     type: string,
     *     is_attested: bool|int|string,
     *     actual_quantity?: int|string|null,
     *     actual_numerator_start?: int|string|null,
     *     actual_numerator_end?: int|string|null
     * }  $input
     * @return array{
     *     checklist_item: BapVerificationChecklistItem,
     *     matches: bool,
     *     expected_value: string,
     *     actual_value: string,
     *     difference: int
     * }
     */
    private function recordChecklistItem(
        BapVerification $verification,
        Bap $bap,
        BapVerificationChecklistType $type,
        array $input,
    ): array {
        if (! filter_var($input['is_attested'], FILTER_VALIDATE_BOOL)) {
            throw ValidationException::withMessages([
                'checklist' => "Pemeriksaan {$type->label()} harus diattestasi oleh verifier.",
            ]);
        }

        $expectedQuantity = $this->expectedQuantity($bap, $type);

        if ($type->usesNumeratorRange()) {
            $actualStart = (int) ($input['actual_numerator_start'] ?? -1);
            $actualEnd = (int) ($input['actual_numerator_end'] ?? -1);

            if ($actualStart < 0 || $actualEnd < $actualStart) {
                throw ValidationException::withMessages([
                    'checklist' => 'Range nomerator fisik tidak valid.',
                ]);
            }

            $actualQuantity = $actualEnd - $actualStart + 1;
            $difference = $actualQuantity - $expectedQuantity;
            $matches = $actualStart === $bap->numerator_start && $actualEnd === $bap->numerator_end;
            $checklistItem = BapVerificationChecklistItem::create([
                'bap_verification_id' => $verification->id,
                'type' => $type,
                'is_attested' => true,
                'expected_quantity' => $expectedQuantity,
                'actual_quantity' => $actualQuantity,
                'quantity_difference' => $difference,
                'expected_numerator_start' => $bap->numerator_start,
                'expected_numerator_end' => $bap->numerator_end,
                'actual_numerator_start' => $actualStart,
                'actual_numerator_end' => $actualEnd,
            ]);

            return [
                'checklist_item' => $checklistItem,
                'matches' => $matches,
                'expected_value' => $this->formatRange($bap->numerator_start, $bap->numerator_end),
                'actual_value' => $this->formatRange($actualStart, $actualEnd),
                'difference' => $difference,
            ];
        }

        $actualQuantity = (int) ($input['actual_quantity'] ?? -1);

        if ($actualQuantity < 0) {
            throw ValidationException::withMessages([
                'checklist' => "Nilai fisik {$type->label()} tidak valid.",
            ]);
        }

        $difference = $actualQuantity - $expectedQuantity;
        $checklistItem = BapVerificationChecklistItem::create([
            'bap_verification_id' => $verification->id,
            'type' => $type,
            'is_attested' => true,
            'expected_quantity' => $expectedQuantity,
            'actual_quantity' => $actualQuantity,
            'quantity_difference' => $difference,
        ]);

        return [
            'checklist_item' => $checklistItem,
            'matches' => $difference === 0,
            'expected_value' => (string) $expectedQuantity,
            'actual_value' => (string) $actualQuantity,
            'difference' => $difference,
        ];
    }

    private function expectedQuantity(Bap $bap, BapVerificationChecklistType $type): int
    {
        return match ($type) {
            BapVerificationChecklistType::UsageQuantity,
            BapVerificationChecklistType::Numerator,
            BapVerificationChecklistType::TindisanSets => $bap->total_usage,
            BapVerificationChecklistType::Cancellation => $bap->cancellations()->count(),
            BapVerificationChecklistType::Online => $bap->online_usage_count,
        };
    }

    /**
     * @param  array<string, array{
     *     checklist_item: BapVerificationChecklistItem,
     *     matches: bool,
     *     expected_value: string,
     *     actual_value: string,
     *     difference: int
     * }>  $findings
     * @param  array<string, string>  $discrepancyNotes
     */
    private function validateResult(
        BapVerificationResult $result,
        array $findings,
        array $discrepancyNotes,
    ): void {
        if ($result === BapVerificationResult::Passed && $findings !== []) {
            throw ValidationException::withMessages([
                'result' => 'Hasil lulus tidak dapat dipilih ketika masih ada nilai fisik yang berbeda dari sistem.',
            ]);
        }

        if ($result === BapVerificationResult::Discrepancy && $findings === []) {
            throw ValidationException::withMessages([
                'result' => 'Hasil ada selisih hanya dapat dipilih ketika ditemukan perbedaan nilai fisik.',
            ]);
        }

        if ($result === BapVerificationResult::Discrepancy) {
            $findingTypes = array_keys($findings);
            $noteTypes = array_keys($discrepancyNotes);
            sort($findingTypes);
            sort($noteTypes);

            if ($findingTypes !== $noteTypes) {
                throw ValidationException::withMessages([
                    'discrepancies' => 'Setiap selisih wajib memiliki catatan verifier, dan hanya selisih yang ditemukan yang dapat dicatat.',
                ]);
            }
        }
    }

    private function formatRange(int $start, int $end): string
    {
        return sprintf('%07d–%07d', $start, $end);
    }
}
