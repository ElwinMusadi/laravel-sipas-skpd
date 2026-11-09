<?php

namespace App\Models;

use App\DocumentOfficialRole;
use Carbon\CarbonInterface;
use Database\Factories\DocumentOfficialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property int $id
 * @property DocumentOfficialRole $role
 * @property string $name
 * @property string|null $nip
 * @property string|null $rank
 * @property string $position
 * @property CarbonInterface $effective_from
 * @property int|null $created_by
 */
#[Fillable(['role', 'name', 'nip', 'rank', 'position', 'effective_from', 'created_by'])]
class DocumentOfficial extends Model
{
    /** @use HasFactory<DocumentOfficialFactory> */
    use HasFactory;

    /**
     * The official in office for each signature role on the given date: per role,
     * the entry with the latest effective date on or before it.
     *
     * @return array<string, DocumentOfficial> Keyed by role value; roles without an entry are absent.
     */
    public static function effectiveOn(CarbonInterface $date): array
    {
        /** @var Collection<int, DocumentOfficial> $officials */
        $officials = self::query()
            ->whereDate('effective_from', '<=', $date->toDateString())
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get();

        return $officials
            ->unique(fn (DocumentOfficial $official): string => $official->role->value)
            ->keyBy(fn (DocumentOfficial $official): string => $official->role->value)
            ->all();
    }

    /**
     * Get the Superadmin who recorded this entry.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the audit entries for this official.
     *
     * @return MorphMany<AuditLog, $this>
     */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => DocumentOfficialRole::class,
            'effective_from' => 'date',
        ];
    }
}
