<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\DeleteDraftBap;
use App\Actions\SkpdInventory\SubmitBap;
use App\Actions\SkpdInventory\UpdateBap;
use App\BapCancellationReason;
use App\BapClarificationStatus;
use App\BapStatus;
use App\Http\Requests\SkpdInventory\StoreBapRequest;
use App\Http\Requests\SkpdInventory\UpdateBapRequest;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\Support\BapSkpdDocumentData;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBapController extends Controller
{
    /**
     * Display BAP SKPD records visible to the current role.
     */
    public function index(Request $request): Response
    {
        $actor = $this->actor($request);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', Rule::enum(BapStatus::class)],
        ]);

        $query = Bap::query()->with([
            'loket:id,name',
            'creator:id,name,role',
        ])->withCount(['cancellations', 'verifications', 'clarificationRequests']);

        if (! $actor->can('view-all-baps')) {
            $query->where('loket_id', $actor->loket_id);
        }

        if ($search = $filters['search'] ?? null) {
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->whereHas('loket', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('creator', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        return Inertia::render('baps/index', [
            'baps' => $query
                ->orderByDesc('service_date')
                ->orderByDesc('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Bap $bap): array => $this->bapData($actor, $bap)),
            'filters' => $filters,
            'can' => ['create' => $actor->can('create-bap')],
        ]);
    }

    /**
     * Show the BAP draft form for the active Loket context.
     */
    public function create(Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('create-bap');

        $loket = $this->selectedLoket($actor, $request);
        $latestBap = $loket === null ? null : Bap::query()
            ->where('loket_id', $loket->id)
            ->orderByDesc('numerator_end')
            ->first(['id', 'numerator_end']);
        $allocations = $loket === null ? collect() : SkpdAllocation::query()
            ->with('usageSegments:id,skpd_allocation_id,quantity')
            ->where('loket_id', $loket->id)
            ->whereIn('status', [SkpdAllocationStatus::Accepted->value, SkpdAllocationStatus::Completed->value])
            ->orderBy('numerator_start')
            ->get();

        return Inertia::render('baps/create', [
            'loket' => $loket === null ? null : ['id' => $loket->id, 'name' => $loket->name],
            'lokets' => $actor->isGlobalAdministrator()
              ? Loket::query()
                  ->where('is_active', true)
                  ->orderBy('name')
                  ->get(['id', 'name'])
                  ->map(fn (Loket $option): array => ['id' => $option->id, 'name' => $option->name])
                  ->all()
              : [],
            'default_service_date' => now()->toDateString(),
            'expected_numerator_start' => $latestBap === null
              ? $allocations->first()?->numerator_start
              : $latestBap->numerator_end + 1,
            'allocations' => $allocations
                ->map(fn (SkpdAllocation $allocation): array => [
                    'id' => $allocation->id,
                    'numerator_start' => $allocation->numerator_start,
                    'numerator_end' => $allocation->numerator_end,
                    'remaining_quantity' => $allocation->quantity - (int) $allocation->usageSegments->sum('quantity'),
                ])
                ->values()
                ->all(),
            'cancellation_reasons' => array_map(
                fn (BapCancellationReason $r): array => ['value' => $r->value, 'label' => $r->label()],
                BapCancellationReason::forNewEntry(),
            ),
        ]);
    }

    /**
     * Create a BAP draft through the locked Phase 04 domain action.
     */
    public function store(StoreBapRequest $request, CreateBap $createBap): RedirectResponse
    {
        $actor = $this->actor($request);
        $attributes = $request->validated();
        $bap = $createBap->handle(
            $actor,
            $this->storeLoket($actor, $attributes),
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['service_date'])->startOfDay(),
            (int) $attributes['numerator_start'],
            (int) $attributes['numerator_end'],
            (int) $attributes['online_usage_count'],
            (int) ($attributes['cancellation_count'] ?? 0),
            $this->parseCancellationItems($attributes['cancellations'] ?? []),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draft BAP SKPD berhasil disimpan.']);

        return to_route('baps.show', $bap);
    }

    /**
     * Stream the official BAP SKPD PDF inline for every role allowed to view the BAP.
     */
    public function pdf(Bap $bap, Request $request, BapSkpdDocumentData $documentData): \Illuminate\Http\Response
    {
        $this->actor($request);

        Gate::authorize('view-bap', $bap);

        $bap->load([
            'cancellations' => fn ($query) => $query->orderBy('numerator'),
        ]);

        $data = $documentData->for($bap);
        $logoPath = public_path('images/logo-pemprov-ntt.png');
        $logoDataUri = is_file($logoPath)
          ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
          : null;

        $pdf = Pdf::loadView('pdf.bap-skpd', [
            ...$data,
            'logoDataUri' => $logoDataUri,
        ])->setPaper([0, 0, 595.28, 935.43], 'portrait')->setWarnings(false);
        // ])->setPaper('a4', 'portrait')->setWarnings(false);

        $pdf->getDomPDF()->addInfo('Title', 'Berita Acara Pemakaian Bukti SKPD '.$bap->document_number);
        $pdf->getDomPDF()->addInfo('Author', config('app.name', 'SIPAS-SKPD'));
        $pdf->getDomPDF()->addInfo('Subject', 'Berita Acara Pemakaian Bukti SKPD');

        return new \Illuminate\Http\Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename='.$data['filename'],
        ]);
    }

    /**
     * Show the selected BAP with full Phase 07 context.
     */
    public function show(Bap $bap, Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('view-bap', $bap);

        $bap->load([
            'loket:id,name',
            'creator:id,name,role',
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
            'auditLogs' => function (Relation $query): void {
                $query
                    ->with('actor:id,name')
                    ->latest('created_at')
                    ->limit(8);
            },
            'verifications' => function (Relation $query): void {
                $query
                    ->with(['verifier:id,name', 'clarificationRequest'])
                    ->orderBy('stage')
                    ->orderBy('attempt');
            },
        ])->loadCount(['cancellations', 'verifications', 'clarificationRequests']);

        return Inertia::render('baps/show', [
            'bap' => [
                ...$this->bapData($actor, $bap),
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
                'cancellations' => [
                    'items' => $bap->cancellations
                        ->map(fn ($cancellation): array => [
                            'id' => $cancellation->id,
                            'numerator' => $cancellation->numerator,
                            'reason' => $cancellation->reason->value,
                            'reason_label' => $cancellation->reason->label(),
                            'description' => $cancellation->description,
                            'created_by' => $cancellation->creator->name,
                            'created_at' => $cancellation->created_at->toIso8601String(),
                        ])
                        ->values()
                        ->all(),
                    'quantity' => $bap->cancellations->count(),
                    'normal_usage_quantity' => $bap->total_usage - $bap->cancellations->count(),
                ],
                'timeline' => $bap->auditLogs
                    ->map(fn ($audit): array => [
                        'id' => $audit->id,
                        'event' => $this->auditLabel($audit->event),
                        'actor' => $audit->actor_id === null
                          ? 'Sistem'
                          : $audit->actor->name,
                        'created_at' => $audit->created_at->toIso8601String(),
                    ])
                    ->values()
                    ->all(),
                'verification_history' => $bap->verifications
                    ->map(fn ($verification): array => [
                        'id' => $verification->id,
                        'stage' => $verification->stage->value,
                        'stage_label' => $verification->stage->label(),
                        'attempt' => $verification->attempt,
                        'verifier' => $verification->verifier->name,
                        'result' => $verification->result?->value,
                        'started_at' => $verification->started_at->toIso8601String(),
                        'completed_at' => $verification->completed_at?->toIso8601String(),
                        'clarification' => $verification->clarificationRequest === null ? null : [
                            'id' => $verification->clarificationRequest->id,
                            'status' => $verification->clarificationRequest->status->value,
                            'status_label' => $this->clarificationStatusLabel($verification->clarificationRequest->status),
                            'can_view' => $actor->can('view-bap-clarification', $verification->clarificationRequest),
                        ],
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    /**
     * Show the editable draft form for its creator.
     */
    public function edit(Bap $bap, Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('update-bap', $bap);

        $bap->load(['loket:id,name', 'cancellations' => fn ($q) => $q->orderBy('numerator')]);

        return Inertia::render('baps/edit', [
            'bap' => $this->bapFormData($bap),
            'cancellation_reasons' => array_map(
                fn (BapCancellationReason $r): array => ['value' => $r->value, 'label' => $r->label()],
                BapCancellationReason::forNewEntry(),
            ),
        ]);
    }

    /**
     * Update a BAP draft through the locked Phase 06 domain action.
     */
    public function update(UpdateBapRequest $request, Bap $bap, UpdateBap $updateBap): RedirectResponse
    {
        $attributes = $request->validated();
        $updatedBap = $updateBap->handle(
            $this->actor($request),
            $bap,
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['service_date'])->startOfDay(),
            (int) $attributes['numerator_start'],
            (int) $attributes['numerator_end'],
            (int) $attributes['online_usage_count'],
            (int) ($attributes['cancellation_count'] ?? 0),
            $this->parseCancellationItems($attributes['cancellations'] ?? []),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draft BAP SKPD berhasil diperbarui.']);

        return to_route('baps.show', $updatedBap);
    }

    /**
     * Submit a draft BAP, leaving it read-only for the next verification phase.
     */
    public function submit(Bap $bap, Request $request, SubmitBap $submitBap): RedirectResponse
    {
        Gate::authorize('submit-bap', $bap);

        $submittedBap = $submitBap->handle($this->actor($request), $bap);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'BAP SKPD diajukan dan menunggu verifikasi.']);

        return to_route('baps.show', $submittedBap);
    }

    /**
     * Delete a draft BAP only while it has no immutable downstream history.
     */
    public function destroy(Bap $bap, Request $request, DeleteDraftBap $deleteDraftBap): RedirectResponse
    {
        Gate::authorize('delete-bap', $bap);

        $deleteDraftBap->handle($this->actor($request), $bap);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draft BAP SKPD berhasil dihapus.']);

        return to_route('baps.index');
    }

    /**
     * @return array{id: int, service_date: string, loket: array{id: int, name: string}, numerator_start: int, numerator_end: int, total_usage: int, online_usage_count: int, cancellation_count: int, non_online_usage_count: int, status: string, created_by: string, creator_role: string, created_at: string, submitted_at: string|null, can: array{edit: bool, submit: bool, delete: bool}}
     */
    private function bapData(User $actor, Bap $bap): array
    {
        return [
            'id' => $bap->id,
            'document_number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'loket' => ['id' => $bap->loket->id, 'name' => $bap->loket->name],
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'total_usage' => $bap->total_usage,
            'online_usage_count' => $bap->online_usage_count,
            'cancellation_count' => (int) $bap->cancellations_count,
            'non_online_usage_count' => $bap->total_usage - $bap->online_usage_count,
            'status' => $bap->status->value,
            'created_by' => $bap->creator->name,
            'creator_role' => $bap->creator->role->label(),
            'created_at' => $bap->created_at->toIso8601String(),
            'submitted_at' => $bap->submitted_at?->toIso8601String(),
            'can' => [
                'edit' => $bap->status === BapStatus::Draft
                  && $actor->can('update-bap', $bap),
                'submit' => $bap->status === BapStatus::Draft
                  && $actor->can('submit-bap', $bap),
                'delete' => $bap->status === BapStatus::Draft
                  && $actor->can('delete-bap', $bap)
                  && (int) $bap->cancellations_count === 0
                  && (int) $bap->verifications_count === 0
                  && (int) $bap->clarification_requests_count === 0,
            ],
        ];
    }

    /**
     * @return array{id: int, document_number: string, service_date: string, numerator_start: int, numerator_end: int, online_usage_count: int, loket: array{id: int, name: string}, cancellation_count: int, cancellations: list<array{numerator: int, reason: string, description: string|null}>}
     */
    private function bapFormData(Bap $bap): array
    {
        return [
            'id' => $bap->id,
            'document_number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'online_usage_count' => $bap->online_usage_count,
            'loket' => ['id' => $bap->loket->id, 'name' => $bap->loket->name],
            'cancellation_count' => $bap->cancellations->count(),
            'cancellations' => array_values($bap->cancellations
                ->map(fn (BapCancellation $cancellation): array => [
                    'numerator' => $cancellation->numerator,
                    'reason' => $cancellation->reason->value,
                    'description' => $cancellation->description,
                ])
                ->all()),
        ];
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'bap.created' => 'BAP SKPD dibuat',
            'bap.updated' => 'Draft BAP diperbarui',
            'bap.deleted' => 'Draft BAP dihapus',
            'bap.submitted' => 'BAP SKPD diajukan',
            'bap_verification.phase_1_started' => 'Verifikasi Tahap 1 dimulai',
            'bap_verification.phase_1_checklist_completed' => 'Checklist Verifikasi Tahap 1 selesai',
            'bap_verification.phase_1_passed' => 'Verifikasi Tahap 1 lulus',
            'bap_verification.phase_1_discrepancy_recorded' => 'Selisih Verifikasi Tahap 1 dicatat',
            'bap_verification.phase_1_sent_to_clarification' => 'BAP dikirim ke klarifikasi',
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
            'bap_usage_segments.created' => 'Usage segment BAP dicatat',
            'bap_usage_segments.updated' => 'Usage segment BAP diperbarui',
            'bap_cancellation.recorded' => 'Nomerator batal/rusak dicatat',
            'bap_cancellation.updated' => 'Nomerator batal/rusak diperbarui',
            'bap_cancellation.removed' => 'Nomerator batal/rusak dihapus dari draft',
            default => 'Perubahan BAP',
        };
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

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }

    /**
     * Parse raw validated cancellation array into typed items for domain actions.
     *
     * @param  array<int, array<string, mixed>>  $raw
     * @return list<array{numerator: int, reason: BapCancellationReason, description: string|null}>
     */
    private function parseCancellationItems(array $raw): array
    {
        return array_values(array_map(fn (array $item): array => [
            'numerator' => (int) $item['numerator'],
            'reason' => BapCancellationReason::from((string) $item['reason']),
            'description' => isset($item['description']) && filled($item['description'])
              ? (string) $item['description']
              : null,
        ], $raw));
    }

    private function actorLoket(User $actor): Loket
    {
        abort_unless($actor->loket_id !== null, 403);

        return Loket::query()->where('is_active', true)->findOrFail($actor->loket_id);
    }

    private function selectedLoket(User $actor, Request $request): ?Loket
    {
        if (! $actor->isGlobalAdministrator()) {
            return $this->actorLoket($actor);
        }

        if (! $request->has('loket')) {
            return null;
        }

        return Loket::query()->where('is_active', true)->findOrFail($request->integer('loket'));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function storeLoket(User $actor, array $attributes): Loket
    {
        if (! $actor->isGlobalAdministrator()) {
            return $this->actorLoket($actor);
        }

        return Loket::query()->where('is_active', true)->findOrFail((int) $attributes['loket_id']);
    }
}
