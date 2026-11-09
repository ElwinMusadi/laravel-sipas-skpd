<?php

namespace App\Http\Controllers;

use App\Actions\SkpdVerification\OpenBapClarification;
use App\Actions\SkpdVerification\ReviewBapClarification;
use App\Actions\SkpdVerification\SubmitBapClarificationResponse;
use App\BapClarificationResolutionOutcome;
use App\BapClarificationStatus;
use App\BapVerificationStage;
use App\Http\Requests\SkpdVerification\ReviewBapClarificationRequest;
use App\Http\Requests\SkpdVerification\StoreBapClarificationResponseRequest;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResponse;
use App\Models\BapVerificationDiscrepancy;
use App\Models\User;
use App\UserRole;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBapClarificationController extends Controller
{
    public function index(Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('view-bap-clarifications');

        $clarifications = BapClarificationRequest::query()
            ->with([
                'bap:id,document_number,loket_id,service_date,status',
                'bap.loket:id,name',
                'verification:id,stage',
                'verification.discrepancies:id,bap_verification_id,type,expected_value,actual_value,difference,notes',
                'requester:id,name',
            ])
            ->when(! $actor->isGlobalAdministrator() && $actor->role === UserRole::PetugasLoket, function ($query) use ($actor): void {
                $query
                    ->whereHas('bap', fn ($bapQuery) => $bapQuery->where('loket_id', $actor->loket_id))
                    ->whereIn('status', [
                        BapClarificationStatus::WaitingResponse,
                        BapClarificationStatus::Reopened,
                    ]);
            })
            ->when(! $actor->isGlobalAdministrator() && $actor->role !== UserRole::PetugasLoket, function ($query) use ($actor): void {
                $stage = $actor->role === UserRole::PetugasPenetapan
                    ? BapVerificationStage::Phase1
                    : BapVerificationStage::Phase2;

                $query
                    ->whereHas('verification', fn ($verificationQuery) => $verificationQuery->where('stage', $stage))
                    ->where('status', BapClarificationStatus::Responded);
            })
            ->latest('created_at')
            ->latest('id')
            ->paginate(15)
            ->through(fn (BapClarificationRequest $clarification): array => $this->queueData($clarification))
            ->withQueryString();

        return Inertia::render('bap-clarifications/index', [
            'clarifications' => $clarifications,
            'queue' => $this->queueDataFor($actor),
        ]);
    }

    public function show(BapClarificationRequest $clarification, Request $request): Response
    {
        $actor = $this->actor($request);

        $clarification->load([
            'bap:id,document_number,loket_id,service_date,status,numerator_start,numerator_end,total_usage,online_usage_count',
            'bap.loket:id,name',
            'verification:id,bap_id,verifier_id,stage,attempt,started_at,completed_at,result',
            'verification.verifier:id,name',
            'verification.discrepancies' => fn (Relation $query): Relation => $query->orderBy('type'),
            'requester:id,name',
            'openedBy:id,name',
            'responses' => fn (Relation $query): Relation => $query
                ->with(['respondent:id,name', 'resolution.resolver:id,name'])
                ->orderBy('round'),
            'bap.auditLogs' => fn (Relation $query): Relation => $query
                ->with('actor:id,name')
                ->where('event', 'like', 'bap_clarification.%')
                ->orderBy('created_at'),
        ]);

        Gate::authorize('view-bap-clarification', $clarification);

        return Inertia::render('bap-clarifications/show', [
            'clarification' => $this->detailData($clarification),
            'can' => [
                'open' => $actor->can('open-bap-clarification', $clarification),
                'respond' => $actor->can('respond-bap-clarification', $clarification)
                    && $clarification->status->canReceiveResponse(),
                'review' => $actor->can('review-bap-clarification', $clarification)
                    && $clarification->status === BapClarificationStatus::Responded,
            ],
        ]);
    }

    public function open(
        BapClarificationRequest $clarification,
        Request $request,
        OpenBapClarification $openClarification,
    ): RedirectResponse {
        $openClarification->handle($this->actor($request), $clarification);

        return to_route('bap-clarifications.show', $clarification);
    }

    public function storeResponse(
        StoreBapClarificationResponseRequest $request,
        BapClarificationRequest $clarification,
        SubmitBapClarificationResponse $submitResponse,
    ): RedirectResponse {
        $submitResponse->handle(
            $this->actor($request),
            $clarification,
            (string) $request->validated('response'),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Tanggapan klarifikasi telah dikirim dan menunggu tinjauan verifier.',
        ]);

        return to_route('bap-clarifications.show', $clarification);
    }

    public function review(
        ReviewBapClarificationRequest $request,
        BapClarificationRequest $clarification,
        ReviewBapClarification $reviewClarification,
    ): RedirectResponse {
        $outcome = BapClarificationResolutionOutcome::from((string) $request->validated('outcome'));
        $resolution = $reviewClarification->handle(
            $this->actor($request),
            $clarification,
            $outcome,
            (string) $request->validated('notes'),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => match ($resolution->outcome) {
                BapClarificationResolutionOutcome::Resolved => 'Penyelesaian diterima. BAP masuk antrean verifikasi ulang sesuai tahap sumbernya.',
                BapClarificationResolutionOutcome::Reopened => 'Klarifikasi dibuka kembali dan menunggu tanggapan Loket.',
                BapClarificationResolutionOutcome::ReturnedForCorrection => 'BAP dikembalikan ke Loket sebagai draft untuk dikoreksi. Setelah diajukan ulang, BAP diverifikasi kembali mulai Tahap 1.',
            },
        ]);

        return to_route('bap-clarifications.show', $clarification);
    }

    /**
     * @return array{id: int, bap_id: int, service_date: string, loket: string, stage: string, stage_label: string, status: string, status_label: string, requested_by: string, requested_at: string, waiting_since: string, discrepancy_count: int, summary: string}
     */
    private function queueData(BapClarificationRequest $clarification): array
    {
        $firstDiscrepancy = $clarification->verification->discrepancies->first();

        return [
            'id' => $clarification->id,
            'bap_id' => $clarification->bap_id,
            'bap_document_number' => $clarification->bap->document_number,
            'service_date' => $clarification->bap->service_date->toDateString(),
            'loket' => $clarification->bap->loket->name,
            'stage' => $clarification->verification->stage->value,
            'stage_label' => $clarification->verification->stage->label(),
            'status' => $clarification->status->value,
            'status_label' => $this->statusLabel($clarification->status),
            'requested_by' => $clarification->requester->name,
            'requested_at' => $clarification->created_at->toIso8601String(),
            'waiting_since' => $clarification->created_at->toIso8601String(),
            'discrepancy_count' => $clarification->verification->discrepancies->count(),
            'summary' => $firstDiscrepancy instanceof BapVerificationDiscrepancy
                ? "{$firstDiscrepancy->type->label()}: {$firstDiscrepancy->expected_value} → {$firstDiscrepancy->actual_value}"
                : 'Selisih pemeriksaan perlu ditindaklanjuti.',
        ];
    }

    /**
     * @return array{title: string, description: string, opens_for_loket: bool}
     */
    private function queueDataFor(User $actor): array
    {
        if ($actor->isGlobalAdministrator()) {
            return [
                'title' => 'Klarifikasi Global',
                'description' => 'Tinjau seluruh klarifikasi lintas Loket dan tahap tanpa mengubah data sumber BAP.',
                'opens_for_loket' => false,
            ];
        }

        return match ($actor->role) {
            UserRole::PetugasLoket => [
                'title' => 'Klarifikasi Saya',
                'description' => 'Tanggapi selisih BAP yang terkait dengan Loket Anda. Tidak ada perubahan pada data sumber BAP.',
                'opens_for_loket' => true,
            ],
            UserRole::PetugasPenetapan => [
                'title' => 'Klarifikasi Tahap 1',
                'description' => 'Tinjau tanggapan Loket untuk selisih yang ditemukan pada Verifikasi Tahap 1.',
                'opens_for_loket' => false,
            ],
            UserRole::PetugasVerifikasi => [
                'title' => 'Klarifikasi Tahap 2',
                'description' => 'Tinjau tanggapan Loket untuk selisih yang ditemukan pada Verifikasi Tahap 2.',
                'opens_for_loket' => false,
            ],
            default => abort(403),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function detailData(BapClarificationRequest $clarification): array
    {
        return [
            'id' => $clarification->id,
            'status' => $clarification->status->value,
            'status_label' => $this->statusLabel($clarification->status),
            'request' => [
                'message' => $clarification->notes,
                'requested_by' => $clarification->requester->name,
                'requested_at' => $clarification->created_at->toIso8601String(),
                'opened_by' => $clarification->openedBy?->name,
                'opened_at' => $clarification->opened_at?->toIso8601String(),
            ],
            'bap' => [
                'id' => $clarification->bap_id,
                'document_number' => $clarification->bap->document_number,
                'loket' => $clarification->bap->loket->name,
                'service_date' => $clarification->bap->service_date->toDateString(),
                'status' => $clarification->bap->status->value,
                'numerator_start' => $clarification->bap->numerator_start,
                'numerator_end' => $clarification->bap->numerator_end,
                'total_usage' => $clarification->bap->total_usage,
                'online_usage_count' => $clarification->bap->online_usage_count,
            ],
            'verification' => [
                'id' => $clarification->bap_verification_id,
                'stage' => $clarification->verification->stage->value,
                'stage_label' => $clarification->verification->stage->label(),
                'attempt' => $clarification->verification->attempt,
                'verifier' => $clarification->verification->verifier->name,
                'completed_at' => $clarification->verification->completed_at?->toIso8601String(),
                'discrepancies' => $clarification->verification->discrepancies
                    ->map(fn (BapVerificationDiscrepancy $discrepancy): array => [
                        'type' => $discrepancy->type->value,
                        'label' => $discrepancy->type->label(),
                        'expected_value' => $discrepancy->expected_value,
                        'actual_value' => $discrepancy->actual_value,
                        'difference' => $discrepancy->difference,
                        'notes' => $discrepancy->notes,
                    ])
                    ->values()
                    ->all(),
            ],
            'responses' => $clarification->responses
                ->map(fn (BapClarificationResponse $response): array => [
                    'id' => $response->id,
                    'round' => $response->round,
                    'response' => $response->response,
                    'responded_by' => $response->respondent->name,
                    'responded_at' => $response->responded_at->toIso8601String(),
                    'resolution' => $response->resolution === null ? null : [
                        'outcome' => $response->resolution->outcome->value,
                        'outcome_label' => $response->resolution->outcome->label(),
                        'notes' => $response->resolution->notes,
                        'resolved_by' => $response->resolution->resolver->name,
                        'resolved_at' => $response->resolution->resolved_at->toIso8601String(),
                    ],
                ])
                ->values()
                ->all(),
            'history' => $clarification->bap->auditLogs
                ->map(fn ($audit): array => [
                    'id' => $audit->id,
                    'event' => $this->auditLabel($audit->event),
                    'actor' => $audit->actor_id === null ? 'Sistem' : $audit->actor->name,
                    'created_at' => $audit->created_at->toIso8601String(),
                ])
                ->values()
                ->all(),
        ];
    }

    private function statusLabel(BapClarificationStatus $status): string
    {
        return match ($status) {
            BapClarificationStatus::WaitingResponse => 'Menunggu Tanggapan',
            BapClarificationStatus::Responded => 'Menunggu Tinjauan',
            BapClarificationStatus::Resolved => 'Selesai',
            BapClarificationStatus::Reopened => 'Perlu Klarifikasi Ulang',
        };
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'bap_clarification.requested' => 'Permintaan klarifikasi dibuat',
            'bap_clarification.opened' => 'Klarifikasi dibuka oleh Loket',
            'bap_clarification.response_submitted' => 'Tanggapan Loket dikirim',
            'bap_clarification.reviewed' => 'Tanggapan ditinjau verifier',
            'bap_clarification.resolved' => 'Klarifikasi diselesaikan',
            'bap_clarification.reopened' => 'Klarifikasi dibuka kembali',
            'bap_clarification.reverification_requested' => 'Verifikasi ulang diminta',
            'bap_clarification.returned_for_correction' => 'BAP dikembalikan untuk koreksi',
            default => 'Aktivitas klarifikasi',
        };
    }
}
