<?php

namespace App\Actions\SkpdVerification;

use App\Actions\SkpdInventory\RecordDomainAudit;
use App\BapVerificationStage;
use App\BapVerificationStatus;
use App\Models\Bap;
use App\Models\BapVerification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reassigns an in-progress verification to another verifier of the same stage so a
 * BAP is not stuck when the original verifier is unavailable. Only the verifier is
 * reassigned; the attempt, its start time, and the BAP source data stay unchanged.
 */
class TakeOverBapVerification
{
    public function __construct(private readonly RecordDomainAudit $audit) {}

    public function handle(User $actor, Bap $bap, BapVerificationStage $stage): BapVerification
    {
        return DB::transaction(function () use ($actor, $bap, $stage): BapVerification {
            $lockedBap = Bap::query()->lockForUpdate()->findOrFail($bap->id);

            if (! $actor->canVerifyStage($stage)) {
                throw ValidationException::withMessages([
                    'bap' => "{$stage->label()} hanya dapat diambil alih oleh {$stage->verifierRole()->label()}.",
                ]);
            }

            $verification = BapVerification::query()
                ->where('bap_id', $lockedBap->id)
                ->where('stage', $stage)
                ->where('status', BapVerificationStatus::InProgress)
                ->latest('attempt')
                ->lockForUpdate()
                ->first();

            if ($verification === null || $lockedBap->status !== $stage->inProgressBapStatus()) {
                throw ValidationException::withMessages([
                    'status' => "Tidak ada {$stage->label()} yang sedang berlangsung untuk BAP ini.",
                ]);
            }

            if ($verification->verifier_id === $actor->id) {
                throw ValidationException::withMessages([
                    'bap' => 'Pemeriksaan ini sudah ditangani oleh Anda.',
                ]);
            }

            $previousVerifierId = $verification->verifier_id;
            $verification->update(['verifier_id' => $actor->id]);

            $this->audit->handle($actor, $lockedBap, $stage->auditPrefix().'_taken_over', [
                'verification_id' => $verification->id,
                'verifier_id' => $previousVerifierId,
            ], [
                'verification_id' => $verification->id,
                'attempt' => $verification->attempt,
                'verifier_id' => $actor->id,
            ]);

            return $verification;
        }, attempts: 3);
    }
}
