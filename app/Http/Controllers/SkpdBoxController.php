<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\DeleteSkpdBox;
use App\Actions\SkpdInventory\RegisterSkpdBox;
use App\Actions\SkpdInventory\UpdateSkpdBox;
use App\Http\Requests\SkpdInventory\StoreSkpdBoxRequest;
use App\Http\Requests\SkpdInventory\UpdateSkpdBoxRequest;
use App\Models\BapUsageSegment;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\SkpdAllocationStatus;
use App\SkpdBoxStatus;
use App\Support\BusinessDate;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBoxController extends Controller
{
    /**
     * Display central SKPD boxes with server-side filters.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', Rule::enum(SkpdBoxStatus::class)],
            'loket' => ['nullable', 'integer', Rule::exists(Loket::class, 'id')],
        ]);

        $query = SkpdBox::query()
            ->with([
                'allocations' => function (Relation $query): void {
                    $query
                        ->with(['loket:id,name', 'usageSegments:id,skpd_allocation_id,quantity'])
                        ->orderBy('numerator_start');
                },
            ]);

        if ($search = $filters['search'] ?? null) {
            $query->where('box_number', 'like', "%{$search}%");
        }

        if ($status = $filters['status'] ?? null) {
            $this->applyStatusFilter($query, SkpdBoxStatus::from($status));
        }

        if ($loketId = $filters['loket'] ?? null) {
            $query->whereHas('allocations', fn (Builder $query): Builder => $query
                ->where('loket_id', $loketId)
                ->whereIn('status', $this->activeAllocationStatusValues()));
        }

        return Inertia::render('skpd/boxes/index', [
            'boxes' => $query
                ->orderByDesc('received_at')
                ->orderByDesc('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (SkpdBox $box): array => $this->boxData($box)),
            'filters' => $filters,
            'lokets' => $this->lokets(),
            'can' => ['create' => $request->user()?->can('manage-skpd-inventory') ?? false],
        ]);
    }

    /**
     * Show the Box registration form.
     */
    public function create(): Response
    {
        Gate::authorize('manage-skpd-inventory');

        return Inertia::render('skpd/boxes/create', [
            'defaults' => ['received_at' => BusinessDate::today()],
        ]);
    }

    /**
     * Register a central SKPD box through the Phase 04 domain action.
     */
    public function store(StoreSkpdBoxRequest $request, RegisterSkpdBox $registerSkpdBox): RedirectResponse
    {
        $attributes = $request->validated();
        $box = $registerSkpdBox->handle(
            $this->actor($request),
            $attributes['box_number'],
            (int) $attributes['numerator_start'],
            (int) $attributes['numerator_end'],
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['received_at'])->startOfDay(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Box SKPD berhasil didaftarkan.']);

        return to_route('skpd.boxes.show', $box);
    }

    /**
     * Display the Box range, ledger values, allocation history, and audit summary.
     */
    public function show(SkpdBox $box, Request $request): Response
    {
        $box->load([
            'creator:id,name',
            'allocations' => function (Relation $query): void {
                $query
                    ->with([
                        'skpdBox:id,box_number',
                        'loket:id,name',
                        'creator:id,name',
                        'acceptor:id,name',
                        'usageSegments:id,skpd_allocation_id,quantity',
                    ])
                    ->orderByDesc('created_at')
                    ->orderByDesc('id');
            },
            'auditLogs' => function (Relation $query): void {
                $query
                    ->with('actor:id,name')
                    ->latest('created_at')
                    ->limit(5);
            },
        ]);

        return Inertia::render('skpd/boxes/show', [
            'box' => [
                ...$this->boxData($box),
                'creator' => ['id' => $box->creator->id, 'name' => $box->creator->name],
                'allocations' => $box->allocations
                    ->map(fn (SkpdAllocation $allocation): array => $this->allocationData($allocation))
                    ->values()
                    ->all(),
                'timeline' => $box->auditLogs
                    ->map(fn ($audit): array => [
                        'id' => $audit->id,
                        'event' => $this->auditLabel($audit->event),
                        'actor' => $audit->actor->name,
                        'created_at' => $audit->created_at->toIso8601String(),
                    ])
                    ->values()
                    ->all(),
            ],
            'can' => [
                'createAllocation' => $request->user()?->can('manage-skpd-inventory') ?? false,
                'edit' => $request->user()?->can('manage-skpd-inventory') ?? false,
                'delete' => ($request->user()?->can('manage-skpd-inventory') ?? false) && $box->allocations->isEmpty(),
            ],
        ]);
    }

    /**
     * Show the limited metadata form for a central SKPD box.
     */
    public function edit(SkpdBox $box): Response
    {
        Gate::authorize('manage-skpd-inventory');

        return Inertia::render('skpd/boxes/edit', [
            'box' => [
                'id' => $box->id,
                'box_number' => $box->box_number,
                'numerator_start' => $box->numerator_start,
                'numerator_end' => $box->numerator_end,
                'total_sets' => $box->total_sets,
                'central_storage_location' => $box->central_storage_location,
                'received_at' => $box->received_at->toDateString(),
            ],
        ]);
    }

    /**
     * Update only box metadata; its numbered range is immutable after registration.
     */
    public function update(UpdateSkpdBoxRequest $request, SkpdBox $box, UpdateSkpdBox $updateSkpdBox): RedirectResponse
    {
        $attributes = $request->validated();
        $updatedBox = $updateSkpdBox->handle(
            $this->actor($request),
            $box,
            $attributes['box_number'],
            $attributes['central_storage_location'],
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['received_at'])->startOfDay(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Metadata box SKPD berhasil diperbarui.']);

        return to_route('skpd.boxes.show', $updatedBox);
    }

    /**
     * Delete only a box that has never entered the allocation ledger.
     */
    public function destroy(SkpdBox $box, Request $request, DeleteSkpdBox $deleteSkpdBox): RedirectResponse
    {
        Gate::authorize('manage-skpd-inventory');

        $deleteSkpdBox->handle($this->actor($request), $box);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Box SKPD yang belum digunakan berhasil dihapus.']);

        return to_route('skpd.boxes.index');
    }

    /**
     * @param  Builder<SkpdBox>  $query
     */
    private function applyStatusFilter(Builder $query, SkpdBoxStatus $status): void
    {
        $activeAllocationTotals = SkpdAllocation::query()
            ->select('skpd_box_id')
            ->selectRaw('SUM(quantity) as active_allocation_quantity')
            ->whereIn('status', $this->activeAllocationStatusValues())
            ->groupBy('skpd_box_id');
        $usedAllocationTotals = BapUsageSegment::query()
            ->join('skpd_allocations', 'skpd_allocations.id', '=', 'bap_usage_segments.skpd_allocation_id')
            ->select('skpd_allocations.skpd_box_id')
            ->selectRaw('SUM(bap_usage_segments.quantity) as used_quantity')
            ->groupBy('skpd_allocations.skpd_box_id');

        $query
            ->select('skpd_boxes.*')
            ->leftJoinSub($activeAllocationTotals, 'active_allocations', function (JoinClause $join): void {
                $join->on('active_allocations.skpd_box_id', '=', 'skpd_boxes.id');
            })
            ->leftJoinSub($usedAllocationTotals, 'used_allocations', function (JoinClause $join): void {
                $join->on('used_allocations.skpd_box_id', '=', 'skpd_boxes.id');
            });

        match ($status) {
            SkpdBoxStatus::Available => $query->whereNull('active_allocations.active_allocation_quantity'),
            SkpdBoxStatus::PartiallyAllocated => $query
                ->where('active_allocations.active_allocation_quantity', '>', 0)
                ->whereColumn('active_allocations.active_allocation_quantity', '<', 'skpd_boxes.total_sets'),
            SkpdBoxStatus::FullyAllocated => $query
                ->whereColumn('active_allocations.active_allocation_quantity', 'skpd_boxes.total_sets')
                ->where(function (Builder $query): void {
                    $query
                        ->whereNull('used_allocations.used_quantity')
                        ->orWhereColumn('used_allocations.used_quantity', '<', 'skpd_boxes.total_sets');
                }),
            SkpdBoxStatus::Depleted => $query
                ->whereColumn('active_allocations.active_allocation_quantity', 'skpd_boxes.total_sets')
                ->whereColumn('used_allocations.used_quantity', 'skpd_boxes.total_sets'),
        };
    }

    /**
     * @return array<int, string>
     */
    private function activeAllocationStatusValues(): array
    {
        return [
            SkpdAllocationStatus::Pending->value,
            SkpdAllocationStatus::Accepted->value,
            SkpdAllocationStatus::Completed->value,
        ];
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function lokets(): array
    {
        return Loket::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Loket $loket): array => ['id' => $loket->id, 'name' => $loket->name])
            ->all();
    }

    /**
     * @return array{id: int, box_number: string, numerator_start: int, numerator_end: int, total_sets: int, central_storage_location: string, pending_quantity: int, allocated_quantity: int, available_quantity: int, used_quantity: int, status: string, loket: array{id: int, name: string}|null, received_at: string}
     */
    private function boxData(SkpdBox $box): array
    {
        $allocations = $box->allocations;
        $pendingQuantity = (int) $allocations
            ->where('status', SkpdAllocationStatus::Pending)
            ->sum('quantity');
        $allocatedQuantity = (int) $allocations
            ->whereIn('status', [SkpdAllocationStatus::Accepted, SkpdAllocationStatus::Completed])
            ->sum('quantity');
        $usedQuantity = (int) $allocations
            ->sum(fn (SkpdAllocation $allocation): int => (int) $allocation->usageSegments->sum('quantity'));
        $activeAllocationQuantity = $pendingQuantity + $allocatedQuantity;
        $status = $activeAllocationQuantity === 0
            ? SkpdBoxStatus::Available
            : ($activeAllocationQuantity < $box->total_sets
                ? SkpdBoxStatus::PartiallyAllocated
                : ($usedQuantity === $box->total_sets ? SkpdBoxStatus::Depleted : SkpdBoxStatus::FullyAllocated));
        $loket = $allocations
            ->whereIn('status', [SkpdAllocationStatus::Pending, SkpdAllocationStatus::Accepted, SkpdAllocationStatus::Completed])
            ->first()?->loket;

        return [
            'id' => $box->id,
            'box_number' => $box->box_number,
            'numerator_start' => $box->numerator_start,
            'numerator_end' => $box->numerator_end,
            'total_sets' => $box->total_sets,
            'central_storage_location' => $box->central_storage_location,
            'pending_quantity' => $pendingQuantity,
            'allocated_quantity' => $allocatedQuantity,
            'available_quantity' => $box->total_sets - $activeAllocationQuantity,
            'used_quantity' => $usedQuantity,
            'status' => $status->value,
            'loket' => $loket === null ? null : ['id' => $loket->id, 'name' => $loket->name],
            'received_at' => $box->received_at->toIso8601String(),
        ];
    }

    /**
     * @return array{id: int, box_number: string, numerator_start: int, numerator_end: int, quantity: int, used_quantity: int, remaining_quantity: int, status: string, loket: array{id: int, name: string}, allocation_date: string|null, created_by: string, created_at: string, accepted_by: string|null, accepted_at: string|null}
     */
    private function allocationData(SkpdAllocation $allocation): array
    {
        $usedQuantity = (int) $allocation->usageSegments->sum('quantity');

        return [
            'id' => $allocation->id,
            'box_number' => $allocation->skpdBox->box_number,
            'numerator_start' => $allocation->numerator_start,
            'numerator_end' => $allocation->numerator_end,
            'quantity' => $allocation->quantity,
            'used_quantity' => $usedQuantity,
            'remaining_quantity' => $allocation->quantity - $usedQuantity,
            'status' => $allocation->status->value,
            'loket' => ['id' => $allocation->loket->id, 'name' => $allocation->loket->name],
            'allocation_date' => $allocation->allocation_date?->toDateString(),
            'created_by' => $allocation->creator->name,
            'created_at' => $allocation->created_at->toIso8601String(),
            'accepted_by' => $allocation->acceptor?->name,
            'accepted_at' => $allocation->accepted_at?->toIso8601String(),
        ];
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'skpd_box.registered' => 'Box SKPD didaftarkan',
            'skpd_box.updated' => 'Metadata box SKPD diperbarui',
            'skpd_box.deleted' => 'Box SKPD dihapus',
            'skpd_allocation.created' => 'Alokasi SKPD dibuat',
            'skpd_allocation.accepted' => 'Handover alokasi diterima',
            'skpd_allocation.cancelled' => 'Alokasi pending dibatalkan',
            default => 'Perubahan inventaris',
        };
    }
}
