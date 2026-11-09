<?php

namespace App\Models;

use App\BapClarificationResolutionOutcome;
use Carbon\CarbonInterface;
use Database\Factories\BapClarificationResolutionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $bap_clarification_request_id
 * @property int $bap_clarification_response_id
 * @property int $resolved_by
 * @property BapClarificationResolutionOutcome $outcome
 * @property string $notes
 * @property CarbonInterface $resolved_at
 */
#[Fillable(['bap_clarification_request_id', 'bap_clarification_response_id', 'resolved_by', 'outcome', 'notes', 'resolved_at'])]
class BapClarificationResolution extends Model
{
    /** @use HasFactory<BapClarificationResolutionFactory> */
    use HasFactory;

    /**
     * Get the clarification request receiving this decision.
     *
     * @return BelongsTo<BapClarificationRequest, $this>
     */
    public function clarificationRequest(): BelongsTo
    {
        return $this->belongsTo(BapClarificationRequest::class, 'bap_clarification_request_id');
    }

    /**
     * Get the response reviewed by this decision.
     *
     * @return BelongsTo<BapClarificationResponse, $this>
     */
    public function response(): BelongsTo
    {
        return $this->belongsTo(BapClarificationResponse::class, 'bap_clarification_response_id');
    }

    /**
     * Get the stage-specific verifier who reviewed the response.
     *
     * @return BelongsTo<User, $this>
     */
    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'outcome' => BapClarificationResolutionOutcome::class,
            'resolved_at' => 'datetime',
        ];
    }
}
