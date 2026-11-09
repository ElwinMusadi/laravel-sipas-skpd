<?php

namespace App\Http\Controllers;

use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\BapVerificationStatus;
use App\Models\Bap;
use App\Models\BapClarificationRequest;
use App\Models\BapVerification;
use App\Models\User;
use App\Support\BusinessDate;
use App\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display BAP-derived work for the current user's authorized scope.
     */
    public function __invoke(Request $request): Response
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        $bapQuery = Bap::query();

        if (! $actor->can('view-all-baps')) {
            $bapQuery->where('loket_id', $actor->loket_id);
        }

        $todayCount = (clone $bapQuery)
            ->whereDate('service_date', BusinessDate::today())
            ->count();

        if ($actor->role === UserRole::PetugasPenetapan) {
            return Inertia::render('dashboard', [
                'dashboard' => $this->phaseOneDashboard($actor, $bapQuery, $todayCount),
            ]);
        }

        if ($actor->role === UserRole::PetugasVerifikasi) {
            return Inertia::render('dashboard', [
                'dashboard' => $this->phaseTwoDashboard($actor, $bapQuery, $todayCount),
            ]);
        }

        if ($actor->role === UserRole::PetugasLoket) {
            return Inertia::render('dashboard', [
                'dashboard' => $this->loketDashboard($actor, $bapQuery, $todayCount),
            ]);
        }

        if ($actor->role === UserRole::BendaharaBarang) {
            return Inertia::render('dashboard', [
                'dashboard' => $this->bendaharaBarangDashboard($bapQuery, $todayCount),
            ]);
        }

        $waitingCount = (clone $bapQuery)
            ->whereIn('status', [BapStatus::Submitted->value, BapStatus::UnderVerification->value])
            ->count();

        return Inertia::render('dashboard', [
            'dashboard' => [
                'metrics' => [
                    [
                        'id' => 'today',
                        'label' => 'BAP Hari Ini',
                        'value' => $todayCount,
                        'description' => 'BAP pada tanggal pelayanan hari ini',
                    ],
                    [
                        'id' => 'waiting',
                        'label' => 'Menunggu Verifikasi',
                        'value' => $waitingCount,
                        'description' => 'BAP yang telah diajukan',
                    ],
                ],
                'workItems' => [
                    [
                        'id' => 'waiting',
                        'title' => 'BAP menunggu verifikasi',
                        'count' => $waitingCount,
                        'status' => 'waiting',
                        'description' => $actor->can('view-all-baps')
                            ? 'BAP yang siap masuk workflow verifikasi berikutnya.'
                            : 'BAP Loket Anda yang telah diajukan.',
                        'href' => route('baps.index'),
                    ],
                ],
                'recentBaps' => (clone $bapQuery)
                    ->with(['loket:id,name'])
                    ->orderByDesc('service_date')
                    ->orderByDesc('id')
                    ->limit(5)
                    ->get()
                    ->map(fn (Bap $bap): array => [
                        'id' => $bap->id,
                        'documentNumber' => $bap->document_number,
                        'loket' => $bap->loket->name,
                        'serviceDate' => $bap->service_date->toDateString(),
                        'submittedAt' => $bap->submitted_at?->toIso8601String(),
                        'status' => $bap->status->value,
                    ])
                    ->all(),
            ],
        ]);
    }

    /**
     * @param  Builder<Bap>  $bapQuery
     * @return array<string, mixed>
     */
    private function phaseOneDashboard(User $actor, Builder $bapQuery, int $todayCount): array
    {
        $verificationQuery = BapVerification::query()
            ->where('stage', BapVerificationStage::Phase1->value)
            ->where('verifier_id', $actor->id);
        $waitingCount = (clone $bapQuery)
            ->whereIn('status', [BapStatus::Submitted->value, BapStatus::WaitingReverificationPhase1->value])
            ->count();
        $reverificationCount = (clone $bapQuery)
            ->where('status', BapStatus::WaitingReverificationPhase1->value)
            ->count();
        $clarificationReviewCount = BapClarificationRequest::query()
            ->where('status', BapClarificationStatus::Responded)
            ->whereHas('verification', fn (Builder $query): Builder => $query->where('stage', BapVerificationStage::Phase1))
            ->count();
        $inProgressCount = (clone $verificationQuery)
            ->where('status', BapVerificationStatus::InProgress->value)
            ->count();
        $completedCount = (clone $verificationQuery)
            ->where('result', BapVerificationResult::Passed->value)
            ->count();

        return [
            'metrics' => [
                [
                    'id' => 'today',
                    'label' => 'BAP Hari Ini',
                    'value' => $todayCount,
                    'description' => 'BAP pada tanggal pelayanan hari ini',
                ],
                [
                    'id' => 'waiting',
                    'label' => 'Menunggu Verifikasi Tahap 1',
                    'value' => $waitingCount,
                    'description' => 'BAP submitted yang siap diperiksa',
                ],
                [
                    'id' => 'in_progress',
                    'label' => 'Sedang Diverifikasi',
                    'value' => $inProgressCount,
                    'description' => 'Pemeriksaan fisik yang Anda mulai',
                ],
                [
                    'id' => 'discrepancy',
                    'label' => 'Klarifikasi Menunggu Tinjauan',
                    'value' => $clarificationReviewCount,
                    'description' => 'Tanggapan Loket untuk selisih Tahap 1',
                ],
            ],
            'workItems' => [
                [
                    'id' => 'waiting-phase-1',
                    'title' => 'BAP menunggu Verifikasi Tahap 1',
                    'count' => $waitingCount,
                    'status' => 'waiting',
                    'description' => 'Mulai pemeriksaan dari antrean verifikasi.',
                    'href' => route('bap-verifications.index'),
                ],
                [
                    'id' => 'in-progress-phase-1',
                    'title' => 'Pemeriksaan fisik berlangsung',
                    'count' => $inProgressCount,
                    'status' => 'in_progress',
                    'description' => 'Selesaikan checklist yang Anda mulai.',
                    'href' => route('bap-verifications.index'),
                ],
                [
                    'id' => 'clarification-review-phase-1',
                    'title' => 'Klarifikasi Tahap 1 menunggu review',
                    'count' => $clarificationReviewCount,
                    'status' => 'discrepancy',
                    'description' => 'Tinjau tanggapan Loket tanpa mengubah finding asli.',
                    'href' => route('bap-clarifications.index'),
                ],
                [
                    'id' => 'reverification-phase-1',
                    'title' => 'Verifikasi ulang Tahap 1',
                    'count' => $reverificationCount,
                    'status' => 'waiting',
                    'description' => 'Klarifikasi selesai dan siap diperiksa ulang.',
                    'href' => route('bap-verifications.index'),
                ],
                [
                    'id' => 'completed-phase-1',
                    'title' => 'Lulus Verifikasi Tahap 1',
                    'count' => $completedCount,
                    'status' => 'completed',
                    'description' => 'BAP telah diteruskan ke antrean Tahap 2.',
                    'href' => route('baps.index', ['status' => BapStatus::WaitingVerificationPhase2->value]),
                ],
            ],
            'recentBaps' => $this->recentBaps($bapQuery),
        ];
    }

    /**
     * @param  Builder<Bap>  $bapQuery
     * @return array<string, mixed>
     */
    private function phaseTwoDashboard(User $actor, Builder $bapQuery, int $todayCount): array
    {
        $verificationQuery = BapVerification::query()
            ->where('stage', BapVerificationStage::Phase2->value)
            ->where('verifier_id', $actor->id);
        $waitingCount = (clone $bapQuery)
            ->whereIn('status', [BapStatus::WaitingVerificationPhase2->value, BapStatus::WaitingReverificationPhase2->value])
            ->count();
        $reverificationCount = (clone $bapQuery)
            ->where('status', BapStatus::WaitingReverificationPhase2->value)
            ->count();
        $clarificationReviewCount = BapClarificationRequest::query()
            ->where('status', BapClarificationStatus::Responded)
            ->whereHas('verification', fn (Builder $query): Builder => $query->where('stage', BapVerificationStage::Phase2))
            ->count();
        $inProgressCount = (clone $verificationQuery)
            ->where('status', BapVerificationStatus::InProgress->value)
            ->count();
        $completedCount = (clone $verificationQuery)
            ->where('result', BapVerificationResult::Passed->value)
            ->count();

        return [
            'metrics' => [
                [
                    'id' => 'today',
                    'label' => 'BAP Hari Ini',
                    'value' => $todayCount,
                    'description' => 'BAP pada tanggal pelayanan hari ini',
                ],
                [
                    'id' => 'waiting',
                    'label' => 'Menunggu Verifikasi Tahap 2',
                    'value' => $waitingCount,
                    'description' => 'BAP yang lulus Verifikasi Tahap 1',
                ],
                [
                    'id' => 'in_progress',
                    'label' => 'Sedang Diverifikasi Tahap 2',
                    'value' => $inProgressCount,
                    'description' => 'Pemeriksaan fisik yang Anda mulai',
                ],
                [
                    'id' => 'discrepancy',
                    'label' => 'Klarifikasi Menunggu Tinjauan',
                    'value' => $clarificationReviewCount,
                    'description' => 'Tanggapan Loket untuk selisih Tahap 2',
                ],
            ],
            'workItems' => [
                [
                    'id' => 'waiting-phase-2',
                    'title' => 'BAP menunggu Verifikasi Tahap 2',
                    'count' => $waitingCount,
                    'status' => 'waiting',
                    'description' => 'Buka hasil Tahap 1 sebelum memulai pemeriksaan fisik.',
                    'href' => route('bap-verifications-phase-2.index'),
                ],
                [
                    'id' => 'in-progress-phase-2',
                    'title' => 'Pemeriksaan fisik berlangsung',
                    'count' => $inProgressCount,
                    'status' => 'in_progress',
                    'description' => 'Selesaikan checklist yang Anda mulai.',
                    'href' => route('bap-verifications-phase-2.index'),
                ],
                [
                    'id' => 'clarification-review-phase-2',
                    'title' => 'Klarifikasi Tahap 2 menunggu review',
                    'count' => $clarificationReviewCount,
                    'status' => 'discrepancy',
                    'description' => 'Tinjau tanggapan Loket tanpa mengubah finding asli.',
                    'href' => route('bap-clarifications.index'),
                ],
                [
                    'id' => 'reverification-phase-2',
                    'title' => 'Verifikasi ulang Tahap 2',
                    'count' => $reverificationCount,
                    'status' => 'waiting',
                    'description' => 'Klarifikasi selesai dan siap diperiksa ulang.',
                    'href' => route('bap-verifications-phase-2.index'),
                ],
                [
                    'id' => 'completed-phase-2',
                    'title' => 'Lulus Verifikasi Tahap 2',
                    'count' => $completedCount,
                    'status' => 'completed',
                    'description' => 'BAP siap menjadi input proses Bendahara Barang berikutnya.',
                    'href' => route('baps.index', ['status' => BapStatus::VerifiedPhase2->value]),
                ],
            ],
            'recentBaps' => $this->recentBaps($bapQuery),
        ];
    }

    /**
     * @param  Builder<Bap>  $bapQuery
     * @return array<string, mixed>
     */
    private function loketDashboard(User $actor, Builder $bapQuery, int $todayCount): array
    {
        $waitingCount = (clone $bapQuery)
            ->whereIn('status', [BapStatus::Submitted->value, BapStatus::UnderVerification->value])
            ->count();
        $clarificationCount = BapClarificationRequest::query()
            ->whereIn('status', [BapClarificationStatus::WaitingResponse, BapClarificationStatus::Reopened])
            ->whereHas('bap', fn (Builder $query): Builder => $query->where('loket_id', $actor->loket_id))
            ->count();
        $reverificationCount = (clone $bapQuery)
            ->whereIn('status', [BapStatus::WaitingReverificationPhase1->value, BapStatus::WaitingReverificationPhase2->value])
            ->count();

        return [
            'metrics' => [
                [
                    'id' => 'today',
                    'label' => 'BAP Hari Ini',
                    'value' => $todayCount,
                    'description' => 'BAP pada tanggal pelayanan hari ini',
                ],
                [
                    'id' => 'waiting',
                    'label' => 'BAP Menunggu Verifikasi',
                    'value' => $waitingCount,
                    'description' => 'BAP Anda yang sedang pada Verifikasi Tahap 1',
                ],
                [
                    'id' => 'discrepancy',
                    'label' => 'Perlu Tindak Lanjut',
                    'value' => $clarificationCount,
                    'description' => 'BAP yang memerlukan klarifikasi',
                ],
            ],
            'workItems' => [
                [
                    'id' => 'waiting',
                    'title' => 'BAP menunggu verifikasi',
                    'count' => $waitingCount,
                    'status' => 'waiting',
                    'description' => 'BAP telah diajukan dan bersifat read-only.',
                    'href' => route('baps.index'),
                ],
                [
                    'id' => 'clarification',
                    'title' => 'Klarifikasi perlu ditanggapi',
                    'count' => $clarificationCount,
                    'status' => 'discrepancy',
                    'description' => 'Berikan penjelasan tanpa mengubah data BAP atau selisih.',
                    'href' => route('bap-clarifications.index'),
                ],
                [
                    'id' => 'reverification',
                    'title' => 'BAP menunggu verifikasi ulang',
                    'count' => $reverificationCount,
                    'status' => 'waiting',
                    'description' => 'Penyelesaian klarifikasi telah diterima dan diperiksa ulang oleh verifier terkait.',
                    'href' => route('baps.index'),
                ],
            ],
            'recentBaps' => $this->recentBaps($bapQuery),
        ];
    }

    /**
     * @param  Builder<Bap>  $bapQuery
     * @return array<string, mixed>
     */
    private function bendaharaBarangDashboard(Builder $bapQuery, int $todayCount): array
    {
        $waitingReceiptCount = (clone $bapQuery)
            ->where('status', BapStatus::VerifiedPhase2->value)
            ->count();
        $completedCount = (clone $bapQuery)
            ->where('status', BapStatus::Completed->value)
            ->count();

        return [
            'metrics' => [
                [
                    'id' => 'today',
                    'label' => 'BAP Hari Ini',
                    'value' => $todayCount,
                    'description' => 'BAP pada tanggal pelayanan hari ini',
                ],
                [
                    'id' => 'waiting',
                    'label' => 'Menunggu Penerimaan',
                    'value' => $waitingReceiptCount,
                    'description' => 'BAP yang lulus Verifikasi Tahap 2',
                ],
            ],
            'workItems' => [
                [
                    'id' => 'waiting-administrative-receipt',
                    'title' => 'BAP menunggu penerimaan',
                    'count' => $waitingReceiptCount,
                    'status' => 'waiting',
                    'description' => 'Periksa ringkasan dan terima BAP yang telah lulus seluruh verifikasi.',
                    'href' => route('bap-administrations.index'),
                ],
                [
                    'id' => 'completed-administrative-receipt',
                    'title' => 'BAP selesai administratif',
                    'count' => $completedCount,
                    'status' => 'completed',
                    'description' => 'Lihat BAP yang telah diterima secara read-only.',
                    'href' => route('bap-administrations.index', ['status' => 'completed']),
                ],
            ],
            'recentBaps' => $this->recentBaps($bapQuery),
        ];
    }

    /**
     * @param  Builder<Bap>  $bapQuery
     * @return list<array{id: int, documentNumber: string, loket: string, serviceDate: string, submittedAt: string|null, status: string}>
     */
    private function recentBaps(Builder $bapQuery): array
    {
        return array_values((clone $bapQuery)
            ->with(['loket:id,name'])
            ->orderByDesc('service_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Bap $bap): array => [
                'id' => $bap->id,
                'documentNumber' => $bap->document_number,
                'loket' => $bap->loket->name,
                'serviceDate' => $bap->service_date->toDateString(),
                'submittedAt' => $bap->submitted_at?->toIso8601String(),
                'status' => $bap->status->value,
            ])
            ->values()
            ->all());
    }
}
