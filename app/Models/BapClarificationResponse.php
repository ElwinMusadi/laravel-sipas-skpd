<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\BapClarificationResponseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $bap_clarification_request_id
 * @property int $round
 * @property int $responded_by
 * @property string $response
 * @property CarbonInterface $responded_at
 */
#[Fillable(['bap_clarification_request_id', 'round', 'responded_by', 'response', 'responded_at'])]
class BapClarificationResponse extends Model
{
    /** @use HasFactory<BapClarificationResponseFactory> */
    use HasFactory;

    /**
     * Get the clarification request receiving this response.
     *
     * @return BelongsTo<BapClarificationRequest, $this>
     */
    public function clarificationRequest(): BelongsTo
    {
        return $this->belongsTo(BapClarificationRequest::class, 'bap_clarification_request_id');
    }

    /**
     * Get the Petugas Loket who submitted the response.
     *
     * @return BelongsTo<User, $this>
     */
    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    /**
     * Get the reviewer decision for this response when it exists.
     *
     * @return HasOne<BapClarificationResolution, $this>
     */
    public function resolution(): HasOne
    {
        return $this->hasOne(BapClarificationResolution::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }
}
