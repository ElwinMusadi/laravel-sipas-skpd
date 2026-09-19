<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\RecordBapCancellation;
use App\BapCancellationReason;
use App\BapStatus;
use App\Http\Requests\SkpdInventory\StoreBapCancellationRequest;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBapCancellationController extends Controller
{
    /**
     * Display cancellation records inside the actor's BAP scope.
     */
    public function index(Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('view-bap-cancellations');

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'reason' => ['nullable', Rule::enum(BapCancellationReason::class)],
        ]);

        $query = BapCancellation::query()->with([
            'bap.loket:id,name',
            'creator:id,name',
        ]);

        if (! $actor->can('view-all-baps')) {
            $query->whereHas('bap', fn (Builder $query): Builder => $query->where('loket_id', $actor->loket_id));
        }

        if ($search = $filters['search'] ?? null) {
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->where('description', 'like', "%{$search}%")
                    ->orWhereHas('bap.loket', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('creator', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"));

                if (preg_match('/^\d{1,7}$/', $search) === 1) {
                    $query
                        ->orWhere('numerator', (int) $search)
                        ->orWhere('bap_id', (int) $search);
                }
            });
        }

        if ($reason = $filters['reason'] ?? null) {
            $query->where('reason', $reason);
        }

        return Inertia::render('bap-cancellations/index', [
            'cancellations' => $query
                ->latest('created_at')
                ->latest('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (BapCancellation $cancellation): array => $this->cancellationListData($cancellation)),
            'filters' => $filters,
        ]);
    }

    /**
     * Select an eligible draft BAP before opening the immutable cancellation form.
     */
    public function createEntry(Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('create-bap-cancellations');

        $query = Bap::query()
            ->with(['loket:id,name', 'creator:id,name'])
            ->where('status', BapStatus::Draft);

        if (! $actor->isGlobalAdministrator()) {
            $query
                ->where('loket_id', $actor->loket_id)
                ->where('created_by', $actor->id);
        }

        return Inertia::render('bap-cancellations/create-entry', [
            'baps' => $query
                ->orderByDesc('service_date')
                ->orderByDesc('id')
                ->get()
                ->map(fn (Bap $bap): array => [
                    'id' => $bap->id,
                    'document_number' => $bap->document_number,
                    'service_date' => $bap->service_date->toDateString(),
                    'loket' => $bap->loket->name,
                    'numerator_start' => $bap->numerator_start,
                    'numerator_end' => $bap->numerator_end,
                    'created_by' => $bap->creator->name,
                ])
                ->values()
                ->all(),
        ]);
    }

    /**
     * Show the form for recording a cancellation against one draft BAP.
     */
    public function create(Bap $bap, Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('create-bap-cancellation', $bap);

        $bap->load([
            'loket:id,name',
            'creator:id,name',
        ]);
        $cancellationQuantity = $bap->cancellations()->count();

        return Inertia::render('bap-cancellations/create', [
            'bap' => $this->bapData($bap, $cancellationQuantity),
            'reasons' => $this->reasons(),
        ]);
    }

    /**
     * Record an individual cancelled or damaged numerator through the locked domain action.
     */
    public function store(
        StoreBapCancellationRequest $request,
        Bap $bap,
        RecordBapCancellation $recordCancellation,
    ): RedirectResponse {
        $attributes = $request->validated();
        $cancellation = $recordCancellation->handle(
            $this->actor($request),
            $bap,
            (int) $attributes['numerator'],
            BapCancellationReason::from($attributes['reason']),
            $attributes['description'] ?? null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Nomerator batal/rusak berhasil dicatat.']);

        return to_route('bap-cancellations.show', $cancellation);
    }

    /**
     * Display one historical cancellation and its BAP usage context.
     */
    public function show(BapCancellation $bapCancellation, Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-bap-cancellation', $bapCancellation);

        $bapCancellation->load([
            'bap.loket:id,name',
            'bap.creator:id,name',
            'creator:id,name',
        ]);
        $cancellationQuantity = $bapCancellation->bap->cancellations()->count();

        return Inertia::render('bap-cancellations/show', [
            'cancellation' => [
                'id' => $bapCancellation->id,
                'numerator' => $bapCancellation->numerator,
                'reason' => $bapCancellation->reason->value,
                'reason_label' => $bapCancellation->reason->label(),
                'description' => $bapCancellation->description,
                'created_by' => $bapCancellation->creator->name,
                'created_at' => $bapCancellation->created_at->toIso8601String(),
                'bap' => $this->bapData($bapCancellation->bap, $cancellationQuantity),
            ],
        ]);
    }

    /**
     * @return array{id: int, service_date: string, loket: array{id: int, name: string}, numerator_start: int, numerator_end: int, total_usage: int, cancellation_quantity: int, normal_usage_quantity: int, status: string, created_by: string}
     */
    private function bapData(Bap $bap, int $cancellationQuantity): array
    {
        return [
            'id' => $bap->id,
            'document_number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'loket' => ['id' => $bap->loket->id, 'name' => $bap->loket->name],
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'total_usage' => $bap->total_usage,
            'cancellation_quantity' => $cancellationQuantity,
            'normal_usage_quantity' => $bap->total_usage - $cancellationQuantity,
            'status' => $bap->status->value,
            'created_by' => $bap->creator->name,
        ];
    }

    /**
     * @return array{id: int, bap_id: int, service_date: string, loket: string, numerator: int, reason: string, reason_label: string, description: string|null, created_by: string, bap_status: string, created_at: string}
     */
    private function cancellationListData(BapCancellation $cancellation): array
    {
        return [
            'id' => $cancellation->id,
            'bap_id' => $cancellation->bap->id,
            'bap_document_number' => $cancellation->bap->document_number,
            'service_date' => $cancellation->bap->service_date->toDateString(),
            'loket' => $cancellation->bap->loket->name,
            'numerator' => $cancellation->numerator,
            'reason' => $cancellation->reason->value,
            'reason_label' => $cancellation->reason->label(),
            'description' => $cancellation->description,
            'created_by' => $cancellation->creator->name,
            'bap_status' => $cancellation->bap->status->value,
            'created_at' => $cancellation->created_at->toIso8601String(),
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function reasons(): array
    {
        return array_map(fn (BapCancellationReason $reason): array => [
            'value' => $reason->value,
            'label' => $reason->label(),
        ], BapCancellationReason::cases());
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
