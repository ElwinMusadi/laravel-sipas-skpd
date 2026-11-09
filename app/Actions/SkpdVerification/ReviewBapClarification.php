<?php

namespace App\Actions\SkpdVerification;

use App\Actions\SkpdInventory\RecordDomainAudit;
use App\BapClarificationResolutionOutcome;
use App\BapClarificationStatus;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResolution;
use App\Models\BapClarificationResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewBapClarification
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(
        User $actor,
        BapClarificationRequest $clarification,
        BapClarificationResolutionOutcome $outcome,
        string $notes,
    ): BapClarificationResolution {
        return DB::transaction(function () use ($actor, $clarification, $outcome, $notes): BapClarificationResolution {
            $lockedClarification = BapClarificationRequest::query()
                ->with('verification')
                ->lockForUpdate()
                ->findOrFail($clarification->id);
            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($lockedClarification->bap_id);
            $stage = $lockedClarification->verification->stage;

            if (! $actor->canVerifyStage($stage)) {
                throw ValidationException::withMessages([
                    'clarification' => "Hanya {$stage->verifierRole()->label()} yang dapat meninjau klarifikasi {$stage->label()}.",
                ]);
            }

            if ($lockedBap->status !== BapStatus::NeedsClarification || $lockedClarification->status !== BapClarificationStatus::Responded) {
                throw ValidationException::withMessages([
                    'status' => 'Klarifikasi ini sudah tidak berada pada state yang dapat ditinjau.',
                ]);
            }

            $response = BapClarificationResponse::query()
                ->where('bap_clarification_request_id', $lockedClarification->id)
                ->with('resolution')
                ->lockForUpdate()
                ->latest('round')
                ->firstOrFail();

            if ($response->resolution !== null) {
                throw ValidationException::withMessages([
                    'status' => 'Tanggapan klarifikasi ini sudah ditinjau.',
                ]);
            }

            $resolvedAt = now();
            $resolution = BapClarificationResolution::create([
                'bap_clarification_request_id' => $lockedClarification->id,
                'bap_clarification_response_id' => $response->id,
                'resolved_by' => $actor->id,
                'outcome' => $outcome,
                'notes' => trim($notes),
                'resolved_at' => $resolvedAt,
            ]);
            $previousStatus = $lockedClarification->status;
            $lockedClarification->status = $outcome === BapClarificationResolutionOutcome::Reopened
                ? BapClarificationStatus::Reopened
                : BapClarificationStatus::Resolved;
            $lockedClarification->save();

            $this->audit->handle($actor, $lockedBap, 'bap_clarification.reviewed', [
                'clarification_id' => $lockedClarification->id,
                'status' => $previousStatus->value,
            ], [
                'clarification_id' => $lockedClarification->id,
                'response_id' => $response->id,
                'resolution_id' => $resolution->id,
                'outcome' => $outcome->value,
                'status' => $lockedClarification->status->value,
                'resolved_at' => $resolvedAt->toISOString(),
            ]);

            if ($outcome === BapClarificationResolutionOutcome::Reopened) {
                $this->audit->handle($actor, $lockedBap, 'bap_clarification.reopened', null, [
                    'clarification_id' => $lockedClarification->id,
                    'response_id' => $response->id,
                    'resolution_id' => $resolution->id,
                    'status' => $lockedClarification->status->value,
                ]);

                return $resolution;
            }

            if ($outcome === BapClarificationResolutionOutcome::ReturnedForCorrection) {
                $lockedBap->transitionTo(BapStatus::Draft);
                $lockedBap->submitted_at = null;
                $lockedBap->save();

                $this->audit->handle($actor, $lockedBap, 'bap_clarification.returned_for_correction', [
                    'status' => BapStatus::NeedsClarification->value,
                ], [
                    'clarification_id' => $lockedClarification->id,
                    'response_id' => $response->id,
                    'resolution_id' => $resolution->id,
                    'stage' => $stage->value,
                    'status' => $lockedBap->status->value,
                ]);

                return $resolution;
            }

            $lockedBap->transitionTo($stage->reverificationBapStatus());
            $lockedBap->save();

            $this->audit->handle($actor, $lockedBap, 'bap_clarification.resolved', null, [
                'clarification_id' => $lockedClarification->id,
                'response_id' => $response->id,
                'resolution_id' => $resolution->id,
                'status' => $lockedClarification->status->value,
            ]);
            $this->audit->handle($actor, $lockedBap, 'bap_clarification.reverification_requested', [
                'status' => BapStatus::NeedsClarification->value,
            ], [
                'clarification_id' => $lockedClarification->id,
                'stage' => $stage->value,
                'status' => $lockedBap->status->value,
            ]);

            return $resolution;
        }, attempts: 3);
    }
}
