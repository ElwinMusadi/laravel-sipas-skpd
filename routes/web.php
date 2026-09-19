<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LoketController;
use App\Http\Controllers\SkpdAllocationController;
use App\Http\Controllers\SkpdBapAdministrativeReceiptController;
use App\Http\Controllers\SkpdBapCancellationController;
use App\Http\Controllers\SkpdBapClarificationController;
use App\Http\Controllers\SkpdBapController;
use App\Http\Controllers\SkpdBapVerificationController;
use App\Http\Controllers\SkpdBoxController;
use App\Http\Controllers\SkpdBukuKendaliController;
use App\Http\Controllers\SkpdInventoryController;
use App\Http\Controllers\SkpdLaporanPemakaianController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::middleware('can:view-bap-cancellations')
        ->prefix('bap-cancellations')
        ->name('bap-cancellations.')
        ->group(function (): void {
            Route::get('/', [SkpdBapCancellationController::class, 'index'])->name('index');
            Route::get('{bapCancellation}', [SkpdBapCancellationController::class, 'show'])->name('show');
        });

    Route::middleware('can:view-bap-administrations')
        ->prefix('bap-administrations')
        ->name('bap-administrations.')
        ->group(function (): void {
            Route::get('/', [SkpdBapAdministrativeReceiptController::class, 'index'])->name('index');
            Route::get('{bap}', [SkpdBapAdministrativeReceiptController::class, 'show'])->name('show');
            Route::post('{bap}/receive', [SkpdBapAdministrativeReceiptController::class, 'receive'])
                ->middleware('can:receive-bap-administratively,bap')
                ->name('receive');
        });

    Route::get('buku-kendali', [SkpdBukuKendaliController::class, 'index'])
        ->middleware('can:view-buku-kendali')
        ->name('buku-kendali.index');

    Route::middleware('can:view-laporan-pemakaian')
        ->prefix('laporan/pemakaian')
        ->name('laporan-pemakaian.')
        ->group(function (): void {
            Route::get('/', [SkpdLaporanPemakaianController::class, 'index'])->name('index');
            Route::get('pdf', [SkpdLaporanPemakaianController::class, 'pdf'])->name('pdf');
            Route::get('excel', [SkpdLaporanPemakaianController::class, 'excel'])->name('excel');
        });

    Route::middleware('can:view-bap-clarifications')
        ->prefix('bap-clarifications')
        ->name('bap-clarifications.')
        ->group(function (): void {
            Route::get('/', [SkpdBapClarificationController::class, 'index'])->name('index');
            Route::get('{clarification}', [SkpdBapClarificationController::class, 'show'])->name('show');
            Route::post('{clarification}/open', [SkpdBapClarificationController::class, 'open'])
                ->middleware('can:open-bap-clarification,clarification')
                ->name('open');
            Route::post('{clarification}/responses', [SkpdBapClarificationController::class, 'storeResponse'])
                ->middleware('can:respond-bap-clarification,clarification')
                ->name('responses.store');
            Route::post('{clarification}/review', [SkpdBapClarificationController::class, 'review'])
                ->middleware('can:review-bap-clarification,clarification')
                ->name('review');
        });

    Route::middleware('can:view-baps')
        ->prefix('baps')
        ->name('baps.')
        ->group(function (): void {
            Route::get('/', [SkpdBapController::class, 'index'])->name('index');
            Route::get('create', [SkpdBapController::class, 'create'])
                ->middleware('can:create-bap')
                ->name('create');
            Route::post('/', [SkpdBapController::class, 'store'])
                ->middleware('can:create-bap')
                ->name('store');
            Route::get('{bap}/pdf', [SkpdBapController::class, 'pdf'])
                ->middleware('can:view-bap,bap')
                ->name('pdf');
            Route::get('{bap}', [SkpdBapController::class, 'show'])->name('show');
            Route::get('{bap}/edit', [SkpdBapController::class, 'edit'])->name('edit');
            Route::put('{bap}', [SkpdBapController::class, 'update'])->name('update');
            Route::post('{bap}/submit', [SkpdBapController::class, 'submit'])->name('submit');
            Route::delete('{bap}', [SkpdBapController::class, 'destroy'])
                ->middleware('can:delete-bap,bap')
                ->name('destroy');
        });

    Route::middleware('can:view-bap-verifications-phase-1')
        ->prefix('bap-verifications')
        ->name('bap-verifications.')
        ->group(function (): void {
            Route::get('/', [SkpdBapVerificationController::class, 'index'])->name('index');
            Route::get('{bap}', [SkpdBapVerificationController::class, 'show'])->name('show');
            Route::post('{bap}/start', [SkpdBapVerificationController::class, 'start'])
                ->middleware('can:start-bap-verification-phase-1,bap')
                ->name('start');
            Route::post('{bap}/complete', [SkpdBapVerificationController::class, 'complete'])
                ->middleware('can:complete-bap-verification-phase-1')
                ->name('complete');
        });

    Route::middleware('can:view-bap-verifications-phase-2')
        ->prefix('bap-verifications-phase-2')
        ->name('bap-verifications-phase-2.')
        ->group(function (): void {
            Route::get('/', [SkpdBapVerificationController::class, 'indexPhase2'])->name('index');
            Route::get('{bap}', [SkpdBapVerificationController::class, 'showPhase2'])->name('show');
            Route::post('{bap}/start', [SkpdBapVerificationController::class, 'startPhase2'])
                ->middleware('can:start-bap-verification-phase-2,bap')
                ->name('start');
            Route::post('{bap}/complete', [SkpdBapVerificationController::class, 'completePhase2'])
                ->middleware('can:complete-bap-verification-phase-2')
                ->name('complete');
        });
});

Route::middleware(['auth', 'active', 'can:manage-users'])
    ->prefix('users')
    ->name('users.')
    ->group(function (): void {
        Route::get('/', [UserManagementController::class, 'index'])->name('index');
        Route::get('create', [UserManagementController::class, 'create'])->name('create');
        Route::post('/', [UserManagementController::class, 'store'])->name('store');
        Route::get('{user}', [UserManagementController::class, 'show'])->name('show');
        Route::get('{user}/edit', [UserManagementController::class, 'edit'])->name('edit');
        Route::put('{user}', [UserManagementController::class, 'update'])->name('update');
        Route::post('{user}/reset-password', [UserManagementController::class, 'resetPassword'])->name('reset-password');
    });

Route::middleware(['auth', 'active', 'can:view-skpd-inventory'])
    ->prefix('skpd')
    ->name('skpd.')
    ->group(function (): void {
        Route::get('inventory', SkpdInventoryController::class)->name('inventory.index');

        Route::middleware('can:view-central-skpd-inventory')->group(function (): void {
            Route::resource('boxes', SkpdBoxController::class)
                ->only(['index', 'create', 'store', 'show', 'edit', 'update', 'destroy']);
        });

        Route::get('allocations', [SkpdAllocationController::class, 'index'])->name('allocations.index');
        Route::get('allocations/create', [SkpdAllocationController::class, 'create'])
            ->middleware('can:manage-skpd-inventory')
            ->name('allocations.create');
        Route::post('allocations', [SkpdAllocationController::class, 'store'])
            ->middleware('can:manage-skpd-inventory')
            ->name('allocations.store');
        Route::get('allocations/{skpdAllocation}/edit', [SkpdAllocationController::class, 'edit'])->name('allocations.edit');
        Route::patch('allocations/{skpdAllocation}', [SkpdAllocationController::class, 'update'])->name('allocations.update');
        Route::get('allocations/{skpdAllocation}', [SkpdAllocationController::class, 'show'])->name('allocations.show');
        Route::post('allocations/{skpdAllocation}/accept', [SkpdAllocationController::class, 'accept'])->name('allocations.accept');
        Route::post('allocations/{skpdAllocation}/cancel', [SkpdAllocationController::class, 'cancel'])->name('allocations.cancel');
    });

Route::middleware(['auth', 'active', 'can:manage-lokets'])
    ->resource('lokets', LoketController::class);

require __DIR__.'/settings.php';
