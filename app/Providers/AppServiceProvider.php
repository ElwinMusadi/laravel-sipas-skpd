<?php

namespace App\Providers;

use App\BapStatus;
use App\BapVerificationStage;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
  /**
   * Register any application services.
   */
  public function register(): void
  {
    //
  }

  /**
   * Bootstrap any application services.
   */
  public function boot(): void
  {
    $this->configureDefaults();
    $this->configureAuthorization();
  }

  /**
   * Configure default behaviors for production-ready applications.
   */
  protected function configureDefaults(): void
  {
    Date::use(CarbonImmutable::class);

    DB::prohibitDestructiveCommands(
      app()->isProduction(),
    );

    // Password::defaults(
    //   fn(): ?Password => app()->isProduction()
    //     ? Password::min(12)
    //     ->mixedCase()
    //     ->letters()
    //     ->numbers()
    //     ->symbols()
    //     ->uncompromised()
    //     : null,
    // );

    Password::defaults(
      fn(): Password => Password::min(8),
    );
  }

  /**
   * Configure server-side authorization for Phase 03 administration.
   */
  protected function configureAuthorization(): void
  {
    Gate::before(function (User $user): ?bool {
      return $user->isGlobalAdministrator() ? true : null;
    });

    Gate::define('manage-users', fn(User $user): bool => $user->role === UserRole::Superadmin);

    Gate::define('manage-lokets', fn(User $user): bool => $user->role === UserRole::Superadmin);

    Gate::define('view-skpd-inventory', fn(User $user): bool => in_array($user->role, [
      UserRole::Superadmin,
      UserRole::BendaharaBarang,
      UserRole::PetugasLoket,
    ], true));

    Gate::define('view-central-skpd-inventory', fn(User $user): bool => in_array($user->role, [
      UserRole::Superadmin,
      UserRole::BendaharaBarang,
    ], true));

    Gate::define('manage-skpd-inventory', fn(User $user): bool => $user->role === UserRole::BendaharaBarang);

    Gate::define('view-skpd-allocation', fn(User $user, SkpdAllocation $allocation): bool => $user->role === UserRole::Superadmin
      || $user->role === UserRole::BendaharaBarang
      || ($user->role === UserRole::PetugasLoket && $user->loket_id === $allocation->loket_id));

    Gate::define('accept-skpd-allocation', fn(User $user, SkpdAllocation $allocation): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id === $allocation->loket_id
      && $allocation->status === SkpdAllocationStatus::Pending);

    Gate::define('update-skpd-allocation', fn(User $user, SkpdAllocation $allocation): bool => $user->role === UserRole::BendaharaBarang
      && $user->id === $allocation->created_by
      && $allocation->status === SkpdAllocationStatus::Pending);

    Gate::define('cancel-skpd-allocation', fn(User $user, SkpdAllocation $allocation): bool => $user->role === UserRole::BendaharaBarang
      && $user->id === $allocation->created_by
      && $allocation->status === SkpdAllocationStatus::Pending);

    Gate::define('view-baps', fn(User $user): bool => $user->role === UserRole::PetugasLoket
      || $this->canViewAllBaps($user));

    Gate::define('view-all-baps', fn(User $user): bool => $this->canViewAllBaps($user));

    Gate::define('view-bap', fn(User $user, Bap $bap): bool => $this->canViewBap($user, $bap));

    Gate::define('create-bap', fn(User $user): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id !== null);

    Gate::define('update-bap', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id === $bap->loket_id
      && $user->id === $bap->created_by
      && $bap->status === BapStatus::Draft);

    Gate::define('delete-bap', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id === $bap->loket_id
      && $user->id === $bap->created_by
      && $bap->status === BapStatus::Draft);

    Gate::define('submit-bap', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id === $bap->loket_id
      && $bap->status === BapStatus::Draft);

    Gate::define('view-bap-cancellations', fn(User $user): bool => $user->can('view-baps'));

    Gate::define('view-bap-cancellation', fn(User $user, BapCancellation $cancellation): bool => $this->canViewBap($user, $cancellation->bap));

    Gate::define('create-bap-cancellation', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id === $bap->loket_id
      && $user->id === $bap->created_by
      && $bap->status === BapStatus::Draft);

    Gate::define('create-bap-cancellations', fn(User $user): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id !== null);

    Gate::define('view-bap-verifications-phase-1', fn(User $user): bool => $user->role === UserRole::PetugasPenetapan);

    Gate::define('start-bap-verification-phase-1', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasPenetapan
      && BapVerificationStage::Phase1->canStartFrom($bap->status));

    Gate::define('complete-bap-verification-phase-1', fn(User $user): bool => $user->role === UserRole::PetugasPenetapan);

    Gate::define('view-bap-verifications-phase-2', fn(User $user): bool => $user->role === UserRole::PetugasVerifikasi);

    Gate::define('start-bap-verification-phase-2', fn(User $user, Bap $bap): bool => $user->role === UserRole::PetugasVerifikasi
      && BapVerificationStage::Phase2->canStartFrom($bap->status));

    Gate::define('complete-bap-verification-phase-2', fn(User $user): bool => $user->role === UserRole::PetugasVerifikasi);

    Gate::define('view-bap-administrations', fn(User $user): bool => $user->role === UserRole::BendaharaBarang);

    Gate::define('view-buku-kendali', fn(User $user): bool => $user->role === UserRole::BendaharaBarang);

    Gate::define('view-laporan-pemakaian', fn(User $user): bool => in_array($user->role, [
      UserRole::BendaharaBarang,
      UserRole::KepalaUptd,
    ], true));

    Gate::define('view-bap-administration', fn(User $user, Bap $bap): bool => $user->role === UserRole::BendaharaBarang
      && in_array($bap->status, [BapStatus::VerifiedPhase2, BapStatus::Completed], true));

    Gate::define('receive-bap-administratively', fn(User $user, Bap $bap): bool => $user->role === UserRole::BendaharaBarang
      && $bap->status === BapStatus::VerifiedPhase2);

    Gate::define('view-bap-clarifications', fn(User $user): bool => in_array($user->role, [
      UserRole::PetugasLoket,
      UserRole::PetugasPenetapan,
      UserRole::PetugasVerifikasi,
    ], true) && ($user->role !== UserRole::PetugasLoket || $user->loket_id !== null));

    Gate::define('view-bap-clarification', function (User $user, BapClarificationRequest $clarification): bool {
      if ($user->role === UserRole::PetugasLoket) {
        return $user->loket_id !== null && $user->loket_id === $clarification->bap->loket_id;
      }

      return match ($user->role) {
        UserRole::PetugasPenetapan => $clarification->verification->stage === BapVerificationStage::Phase1,
        UserRole::PetugasVerifikasi => $clarification->verification->stage === BapVerificationStage::Phase2,
        default => false,
      };
    });

    Gate::define('open-bap-clarification', fn(User $user, BapClarificationRequest $clarification): bool => $user->role === UserRole::PetugasLoket
      && $user->loket_id !== null
      && $user->loket_id === $clarification->bap->loket_id);

    Gate::define('respond-bap-clarification', fn(User $user, BapClarificationRequest $clarification): bool => $user->can('open-bap-clarification', $clarification));

    Gate::define('review-bap-clarification', fn(User $user, BapClarificationRequest $clarification): bool => match ($clarification->verification->stage) {
      BapVerificationStage::Phase1 => $user->role === UserRole::PetugasPenetapan,
      BapVerificationStage::Phase2 => $user->role === UserRole::PetugasVerifikasi,
    });
  }

  private function canViewBap(User $user, Bap $bap): bool
  {
    return $this->canViewAllBaps($user)
      || ($user->role === UserRole::PetugasLoket && $user->loket_id === $bap->loket_id);
  }

  private function canViewAllBaps(User $user): bool
  {
    return in_array($user->role, [
      UserRole::Superadmin,
      UserRole::BendaharaBarang,
      UserRole::PetugasPenetapan,
      UserRole::KasiePenetapan,
      UserRole::PetugasVerifikasi,
      UserRole::KasieVerifikasi,
      UserRole::KepalaUptd,
    ], true);
  }
}
