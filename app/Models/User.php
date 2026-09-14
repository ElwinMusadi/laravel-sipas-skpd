<?php

namespace App\Models;

use App\BapVerificationStage;
use App\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string|null $nip
 * @property string $username
 * @property string|null $email
 * @property string $password
 * @property UserRole $role
 * @property int|null $loket_id
 * @property bool $is_active
 * @property Carbon|null $last_login_at
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['username', 'name', 'nip', 'password', 'role', 'loket_id', 'is_active'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Determine whether the user is the global SIPAS-SKPD administrator.
     */
    public function isGlobalAdministrator(): bool
    {
        return $this->role === UserRole::Superadmin;
    }

    /**
     * Determine whether the user may act for the specified Loket context.
     */
    public function canOperateAtLoket(int $loketId): bool
    {
        return $this->isGlobalAdministrator()
            || ($this->role === UserRole::PetugasLoket && $this->loket_id === $loketId);
    }

    /**
     * Determine whether the user may manage a draft BAP.
     */
    public function canManageDraftBap(Bap $bap): bool
    {
        return $this->isGlobalAdministrator()
            || ($this->canOperateAtLoket($bap->loket_id) && $this->id === $bap->created_by);
    }

    /**
     * Determine whether the user may manage a pending SKPD allocation.
     */
    public function canManageSkpdAllocation(SkpdAllocation $allocation): bool
    {
        return $this->isGlobalAdministrator()
            || $this->id === $allocation->created_by;
    }

    /**
     * Determine whether the user may perform a verification stage.
     */
    public function canVerifyStage(BapVerificationStage $stage): bool
    {
        return $this->isGlobalAdministrator() || $this->role === $stage->verifierRole();
    }

    /**
     * Determine whether the user may receive a BAP administratively.
     */
    public function canReceiveBapAdministratively(): bool
    {
        return $this->isGlobalAdministrator() || $this->role === UserRole::BendaharaBarang;
    }

    /**
     * Get the loket assigned to the user.
     *
     * @return BelongsTo<Loket, $this>
     */
    public function loket(): BelongsTo
    {
        return $this->belongsTo(Loket::class);
    }

    /**
     * Get SKPD boxes registered by the user.
     *
     * @return HasMany<SkpdBox, $this>
     */
    public function registeredSkpdBoxes(): HasMany
    {
        return $this->hasMany(SkpdBox::class, 'created_by');
    }

    /**
     * Get SKPD allocations created by the user.
     *
     * @return HasMany<SkpdAllocation, $this>
     */
    public function createdSkpdAllocations(): HasMany
    {
        return $this->hasMany(SkpdAllocation::class, 'created_by');
    }

    /**
     * Get SKPD allocations accepted by the user.
     *
     * @return HasMany<SkpdAllocation, $this>
     */
    public function acceptedSkpdAllocations(): HasMany
    {
        return $this->hasMany(SkpdAllocation::class, 'accepted_by');
    }

    /**
     * Get BAP records created by the user.
     *
     * @return HasMany<Bap, $this>
     */
    public function createdBaps(): HasMany
    {
        return $this->hasMany(Bap::class, 'created_by');
    }

    /**
     * Get BAP records received administratively by this Bendahara Barang.
     *
     * @return HasMany<Bap, $this>
     */
    public function administrativelyReceivedBaps(): HasMany
    {
        return $this->hasMany(Bap::class, 'received_by');
    }

    /**
     * Get BAP cancellation records created by the user.
     *
     * @return HasMany<BapCancellation, $this>
     */
    public function createdBapCancellations(): HasMany
    {
        return $this->hasMany(BapCancellation::class, 'created_by');
    }

    /**
     * Get BAP verification attempts performed by the user.
     *
     * @return HasMany<BapVerification, $this>
     */
    public function bapVerifications(): HasMany
    {
        return $this->hasMany(BapVerification::class, 'verifier_id');
    }

    /**
     * Get clarification requests submitted by the user.
     *
     * @return HasMany<BapClarificationRequest, $this>
     */
    public function requestedBapClarifications(): HasMany
    {
        return $this->hasMany(BapClarificationRequest::class, 'requested_by');
    }

    /**
     * Get clarification responses submitted by this Petugas Loket.
     *
     * @return HasMany<BapClarificationResponse, $this>
     */
    public function bapClarificationResponses(): HasMany
    {
        return $this->hasMany(BapClarificationResponse::class, 'responded_by');
    }

    /**
     * Get clarification review decisions made by this verifier.
     *
     * @return HasMany<BapClarificationResolution, $this>
     */
    public function resolvedBapClarifications(): HasMany
    {
        return $this->hasMany(BapClarificationResolution::class, 'resolved_by');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
