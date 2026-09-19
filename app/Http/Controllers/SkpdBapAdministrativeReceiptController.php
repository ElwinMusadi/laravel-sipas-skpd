<?php

namespace App\Http\Controllers;

use App\Actions\SkpdVerification\ReceiveBapByBendaharaBarang;
use App\BapClarificationStatus;
use App\BapStatus;
use App\BapVerificationStage;
use App\Http\Requests\SkpdVerification\ReceiveBapAdministrativeReceiptRequest;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\BapClarificationRequest;
use App\Models\BapClarificationResponse;
use App\Models\BapVerification;
use App\Models\BapVerificationChecklistItem;
use App\Models\BapVerificationDiscrepancy;
use App\Models\Loket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBapAdministrativeReceiptController extends Controller
{
    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-bap-administrations');

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'service_date' => ['nullable', 'date_format:Y-m-d'],
            'loket' => ['nullable', 'integer'],
            'status' => ['nullable', 'in:waiting,completed'],
        ]);
        $isCompletedQueue = ($filters['status'] ?? 'waiting') === 'completed';

        $query = Bap::query()
            ->with([
                'loket:id,name',
                'verifications' => function (Relation $query): void {
                    $query
                        ->with('verifier:id,name')
                        ->whereIn('stage', [BapVerificationStage::Phase1, BapVerificationStage::Phase2])
                        ->orderBy('stage')
                        ->orderByDesc('attempt');
                },
                'receivedBy:id,name',
            ])
            ->withCount('cancellations')
            ->where('status', $isCompletedQueue ? BapStatus::Completed : BapStatus::VerifiedPhase2);

        if (filled($filters['service_date'] ?? null)) {
            $query->whereDate('service_date', $filters['service_date']);
        }

        if (filled($filters['loket'] ?? null)) {
            $query->where('loket_id', (int) $filters['loket']);
        }

        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $numericSearch = ltrim($search, '#');

            $query->where(function (Builder $query) use ($search, $numericSearch): void {
                $query->whereHas('loket', fn (Builder $loketQuery): Builder => $loketQuery->where('name', 'like', "%{$search}%"));

                if (ctype_digit($numericSearch)) {
                    $number = (int) $numericSearch;

                    $query
                        ->orWhere('id', $number)
                        ->orWhere(function (Builder $rangeQuery) use ($number): void {
                            $rangeQuery
                                ->where('numerator_start', '<=', $number)
                                ->where('numerator_end', '>=', $number);
                        });
                }
            });
        }

        return Inertia::render('bap-administrations/index', [
            'baps' => $query
                ->orderByDesc('service_date')
                ->orderByDesc('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Bap $bap): array => $this->queueData($bap, $isCompletedQueue)),
            'filters' => [
                'search' => $search,
                'service_date' => $filters['service_date'] ?? null,
                'loket' => isset($filters['loket']) ? (int) $filters['loket'] : null,
                'status' => $isCompletedQueue ? 'completed' : 'waiting',
            ],
            'lokets' => Loket::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Loket $loket): array => ['id' => $loket->id, 'name' => $loket->name])
                ->all(),
        ]);
    }

    public function show(Bap $bap, Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('view-bap-administration', $bap);

        $bap->load([
            'loket:id,name',
            'creator:id,name',
            'receivedBy:id,name',
            'usageSegments' => function (Relation $query): void {
                $query
                    ->with('skpdAllocation.skpdBox:id,box_number')
                    ->orderBy('numerator_start');
            },
            'cancellations' => function (Relation $query): void {
                $query
                    ->with('creator:id,name')
                    ->orderBy('numerator');
            },
            'verifications' => function (Relation $query): void {
                $query
                    ->with([
                        'verifier:id,name',
                        'checklistItems' => fn (Relation $checklistQuery): Relation => $checklistQuery->orderBy('type'),
                        'discrepancies' => fn (Relation $discrepancyQuery): Relation => $discrepancyQuery->orderBy('type'),
                        'clarificationRequest:id,bap_id,bap_verification_id,status,requested_by,opened_by,opened_at,notes,created_at',
                    ])
                    ->orderBy('stage')
                    ->orderBy('attempt');
            },
            'clarificationRequests' => function (Relation $query): void {
                $query
                    ->with([
                        'verification:id,bap_id,stage,attempt',
                        'requester:id,name',
                        'openedBy:id,name',
                        'responses' => fn (Relation $responseQuery): Relation => $responseQuery
                            ->with(['respondent:id,name', 'resolution.resolver:id,name'])
                            ->orderBy('round'),
                    ])
                    ->orderBy('created_at');
            },
            'auditLogs' => function (Relation $query): void {
                $query
                    ->with('actor:id,name')
                    ->orderBy('created_at')
                    ->orderBy('id');
            },
        ]);

        return Inertia::render('bap-administrations/show', [
            'bap' => $this->detailData($actor, $bap),
        ]);
    }

    public function receive(
        ReceiveBapAdministrativeReceiptRequest $request,
        Bap $bap,
        ReceiveBapByBendaharaBarang $receiveBap,
    ): RedirectResponse {
        Gate::authorize('receive-bap-administratively', $bap);

        $attributes = $request->validated();
        $receivedBap = $receiveBap->handle(
            $this->actor($request),
            $bap,
            isset($attributes['receipt_notes']) ? (string) $attributes['receipt_notes'] : null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'BAP telah diterima Bendahara Barang dan selesai secara administratif.',
        ]);

        return to_route('bap-administrations.show', $receivedBap);
    }

    /**
     * @return array<string, mixed>
     */
    private function queueData(Bap $bap, bool $isCompletedQueue): array
    {
        $phaseOne = $this->latestVerification($bap, BapVerificationStage::Phase1);
        $phaseTwo = $this->latestVerification($bap, BapVerificationStage::Phase2);

        return [
            'id' => $bap->id,
            'number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'loket' => $bap->loket->name,
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'total_usage' => $bap->total_usage,
            'online_usage_count' => $bap->online_usage_count,
            'cancellation_count' => $bap->cancellations_count,
            'phase_one' => $this->queueVerificationData($phaseOne),
            'phase_two' => $this->queueVerificationData($phaseTwo),
            'administrative_status' => $isCompletedQueue ? 'completed' : 'ready',
            'received_by' => $bap->receivedBy?->name,
            'received_at' => $bap->received_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailData(User $actor, Bap $bap): array
    {
        return [
            'id' => $bap->id,
            'number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'loket' => $bap->loket->name,
            'created_by' => $bap->creator->name,
            'created_at' => $bap->created_at->toIso8601String(),
            'submitted_at' => $bap->submitted_at?->toIso8601String(),
            'status' => $bap->status->value,
            'total_usage' => $bap->total_usage,
            'online_usage_count' => $bap->online_usage_count,
            'cancellation_count' => $bap->cancellations->count(),
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'receipt' => [
                'received_by' => $bap->receivedBy?->name,
                'received_at' => $bap->received_at?->toIso8601String(),
                'receipt_notes' => $bap->receipt_notes,
            ],
            'can' => [
                'receive' => $actor->can('receive-bap-administratively', $bap),
            ],
            'segments' => $bap->usageSegments
                ->map(fn ($segment): array => [
                    'id' => $segment->id,
                    'allocation_id' => $segment->skpd_allocation_id,
                    'box_number' => $segment->skpdAllocation->skpdBox->box_number,
                    'numerator_start' => $segment->numerator_start,
                    'numerator_end' => $segment->numerator_end,
                    'quantity' => $segment->quantity,
                ])
                ->values()
                ->all(),
            'cancellations' => $bap->cancellations
                ->map(fn (BapCancellation $cancellation): array => [
                    'id' => $cancellation->id,
                    'numerator' => $cancellation->numerator,
                    'reason' => $cancellation->reason->value,
                    'description' => $cancellation->description,
                    'created_by' => $cancellation->creator->name,
                    'created_at' => $cancellation->created_at->toIso8601String(),
                ])
                ->values()
                ->all(),
            'phase_one' => $this->verificationHistory($bap, BapVerificationStage::Phase1),
            'phase_two' => $this->verificationHistory($bap, BapVerificationStage::Phase2),
            'clarifications' => $bap->clarificationRequests
                ->map(fn (BapClarificationRequest $clarification): array => $this->clarificationData($clarification))
                ->values()
                ->all(),
            'history' => $bap->auditLogs
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

    /**
     * @return array{verifier: string, attempt: int, completed_at: string|null}|null
     */
    private function queueVerificationData(?BapVerification $verification): ?array
    {
        if ($verification === null) {
            return null;
        }

        return [
            'verifier' => $verification->verifier->name,
            'attempt' => $verification->attempt,
            'completed_at' => $verification->completed_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function verificationHistory(Bap $bap, BapVerificationStage $stage): array
    {
        return array_values($bap->verifications
            ->filter(fn (BapVerification $verification): bool => $verification->stage === $stage)
            ->map(fn (BapVerification $verification): array => [
                'id' => $verification->id,
                'attempt' => $verification->attempt,
                'verifier' => $verification->verifier->name,
                'status' => $verification->status->value,
                'result' => $verification->result?->value,
                'notes' => $verification->notes,
                'started_at' => $verification->started_at->toIso8601String(),
                'completed_at' => $verification->completed_at?->toIso8601String(),
                'checklist' => $verification->checklistItems
                    ->map(fn (BapVerificationChecklistItem $item): array => [
                        'type' => $item->type->value,
                        'label' => $item->type->label(),
                        'is_attested' => $item->is_attested,
                        'expected_quantity' => $item->expected_quantity,
                        'actual_quantity' => $item->actual_quantity,
                        'quantity_difference' => $item->quantity_difference,
                        'expected_numerator_start' => $item->expected_numerator_start,
                        'expected_numerator_end' => $item->expected_numerator_end,
                        'actual_numerator_start' => $item->actual_numerator_start,
                        'actual_numerator_end' => $item->actual_numerator_end,
                    ])
                    ->values()
                    ->all(),
                'discrepancies' => $verification->discrepancies
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
                'clarification' => $verification->clarificationRequest === null ? null : [
                    'id' => $verification->clarificationRequest->id,
                    'status' => $verification->clarificationRequest->status->value,
                    'status_label' => $this->clarificationStatusLabel($verification->clarificationRequest->status),
                ],
            ])
            ->all());
    }

    /**
     * @return array<string, mixed>
     */
    private function clarificationData(BapClarificationRequest $clarification): array
    {
        return [
            'id' => $clarification->id,
            'stage_label' => $clarification->verification->stage->label(),
            'attempt' => $clarification->verification->attempt,
            'status' => $clarification->status->value,
            'status_label' => $this->clarificationStatusLabel($clarification->status),
            'requested_by' => $clarification->requester->name,
            'requested_at' => $clarification->created_at->toIso8601String(),
            'request_notes' => $clarification->notes,
            'opened_by' => $clarification->openedBy?->name,
            'opened_at' => $clarification->opened_at?->toIso8601String(),
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
        ];
    }

    private function latestVerification(Bap $bap, BapVerificationStage $stage): ?BapVerification
    {
        return $bap->verifications
            ->filter(fn (BapVerification $verification): bool => $verification->stage === $stage)
            ->sortByDesc('attempt')
            ->first();
    }

    private function clarificationStatusLabel(BapClarificationStatus $status): string
    {
        return match ($status) {
            BapClarificationStatus::WaitingResponse => 'Menunggu Tanggapan',
            BapClarificationStatus::Responded => 'Menunggu Review',
            BapClarificationStatus::Resolved => 'Selesai',
            BapClarificationStatus::Reopened => 'Perlu Klarifikasi Ulang',
        };
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'bap.created' => 'BAP SKPD dibuat',
            'bap.updated' => 'Draft BAP diperbarui',
            'bap.submitted' => 'BAP SKPD diajukan',
            'bap_usage_segments.created' => 'Usage segment BAP dicatat',
            'bap_usage_segments.updated' => 'Usage segment BAP diperbarui',
            'bap_cancellation.recorded' => 'Nomerator batal/rusak dicatat',
            'bap_verification.phase_1_started' => 'Verifikasi Tahap 1 dimulai',
            'bap_verification.phase_1_checklist_completed' => 'Checklist Verifikasi Tahap 1 selesai',
            'bap_verification.phase_1_passed' => 'Verifikasi Tahap 1 lulus',
            'bap_verification.phase_1_discrepancy_recorded' => 'Selisih Verifikasi Tahap 1 dicatat',
            'bap_verification.phase_1_sent_to_clarification' => 'BAP dikirim ke klarifikasi dari Tahap 1',
            'bap_verification.phase_1_completed' => 'Verifikasi Tahap 1 diselesaikan',
            'bap_verification.phase_2_started' => 'Verifikasi Tahap 2 dimulai',
            'bap_verification.phase_2_checklist_completed' => 'Checklist Verifikasi Tahap 2 selesai',
            'bap_verification.phase_2_passed' => 'Verifikasi Tahap 2 lulus',
            'bap_verification.phase_2_discrepancy_recorded' => 'Selisih Verifikasi Tahap 2 dicatat',
            'bap_verification.phase_2_sent_to_clarification' => 'BAP dikirim ke klarifikasi dari Tahap 2',
            'bap_verification.phase_2_completed' => 'Verifikasi Tahap 2 diselesaikan',
            'bap_clarification.requested' => 'Permintaan klarifikasi dibuat',
            'bap_clarification.opened' => 'Klarifikasi dibuka oleh Loket',
            'bap_clarification.response_submitted' => 'Tanggapan Loket dikirim',
            'bap_clarification.reviewed' => 'Tanggapan klarifikasi ditinjau',
            'bap_clarification.resolved' => 'Klarifikasi diselesaikan',
            'bap_clarification.reopened' => 'Klarifikasi dibuka kembali',
            'bap_clarification.reverification_requested' => 'BAP masuk antrean verifikasi ulang',
            'bap_clarification.reverification_completed' => 'Verifikasi ulang diselesaikan',
            'bap_administration.received' => 'BAP diterima Bendahara Barang',
            default => 'Perubahan BAP',
        };
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
