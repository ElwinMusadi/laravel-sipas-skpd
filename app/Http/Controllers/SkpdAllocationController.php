<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\AcceptSkpdAllocation;
use App\Actions\SkpdInventory\CancelSkpdAllocation;
use App\Actions\SkpdInventory\CreateSkpdAllocation;
use App\Actions\SkpdInventory\ReturnSkpdAllocationRemainder;
use App\Actions\SkpdInventory\UpdateSkpdAllocation;
use App\Http\Requests\SkpdInventory\ReturnSkpdAllocationRemainderRequest;
use App\Http\Requests\SkpdInventory\StoreSkpdAllocationRequest;
use App\Http\Requests\SkpdInventory\UpdateSkpdAllocationRequest;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\Support\BusinessDate;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SkpdAllocationController extends Controller
{
    /**
     * Display allocations visible to the current role.
     */
    public function index(Request $request): Response
    {
        $actor = $this->actor($request);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', Rule::enum(SkpdAllocationStatus::class)],
        ]);

        $query = SkpdAllocation::query()
            ->with([
                'skpdBox:id,box_number',
                'loket:id,name',
                'creator:id,name',
                'acceptor:id,name',
                'usageSegments:id,skpd_allocation_id,quantity',
            ]);

        if (! $actor->can('view-central-skpd-inventory')) {
            $query->where('loket_id', $actor->loket_id);
        }

        if ($search = $filters['search'] ?? null) {
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->whereHas('skpdBox', fn (Builder $query): Builder => $query->where('box_number', 'like', "%{$search}%"))
                    ->orWhereHas('loket', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        return Inertia::render('skpd/allocations/index', [
            'allocations' => $query
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (SkpdAllocation $allocation): array => $this->allocationData($actor, $allocation)),
            'filters' => $filters,
            'can' => ['create' => $actor->can('manage-skpd-inventory')],
        ]);
    }

    /**
     * Show a form for creating a pending allocation, preselecting the Box given
     * by the optional `box` query parameter when it still has free sets.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('manage-skpd-inventory');

        $boxes = SkpdBox::query()
            ->withSum(['allocations as reserved_quantity' => fn (Builder $query): Builder => $query->whereIn('status', [
                SkpdAllocationStatus::Pending,
                SkpdAllocationStatus::Accepted,
                SkpdAllocationStatus::Completed,
            ])], 'quantity')
            ->orderByDesc('received_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (SkpdBox $box): array => $this->boxOption($box))
            ->filter(fn (array $box): bool => $box['available_quantity'] > 0)
            ->values();
        $requestedBoxId = $request->integer('box');

        return Inertia::render('skpd/allocations/create', [
            'boxes' => $boxes->all(),
            'lokets' => Loket::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Loket $loket): array => ['id' => $loket->id, 'name' => $loket->name])
                ->all(),
            'defaults' => [
                'skpd_box_id' => $boxes->contains('id', $requestedBoxId) ? $requestedBoxId : null,
                'allocation_date' => BusinessDate::today(),
            ],
        ]);
    }

    /**
     * Show a form for changing a pending allocation.
     */
    public function edit(SkpdAllocation $skpdAllocation, Request $request): Response
    {
        Gate::authorize('update-skpd-allocation', $skpdAllocation);

        $skpdAllocation->load('skpdBox:id,box_number,numerator_start,numerator_end');

        return Inertia::render('skpd/allocations/edit', [
            'allocation' => [
                'id' => $skpdAllocation->id,
                'box' => [
                    'box_number' => $skpdAllocation->skpdBox->box_number,
                    'numerator_start' => $skpdAllocation->skpdBox->numerator_start,
                    'numerator_end' => $skpdAllocation->skpdBox->numerator_end,
                ],
                'loket_id' => $skpdAllocation->loket_id,
                'allocation_date' => $skpdAllocation->allocation_date?->toDateString(),
                'numerator_start' => $skpdAllocation->numerator_start,
                'numerator_end' => $skpdAllocation->numerator_end,
            ],
            'lokets' => Loket::query()
                ->where(fn (Builder $query): Builder => $query
                    ->where('is_active', true)
                    ->orWhereKey($skpdAllocation->loket_id))
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Loket $loket): array => ['id' => $loket->id, 'name' => $loket->name])
                ->all(),
        ]);
    }

    /**
     * Create a pending allocation with the Phase 04 transaction and lock.
     */
    public function store(StoreSkpdAllocationRequest $request, CreateSkpdAllocation $createSkpdAllocation): RedirectResponse
    {
        $attributes = $request->validated();
        $allocation = $createSkpdAllocation->handle(
            $this->actor($request),
            SkpdBox::query()->whereKey($attributes['skpd_box_id'])->firstOrFail(),
            Loket::query()->whereKey($attributes['loket_id'])->firstOrFail(),
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['allocation_date']),
            (int) $attributes['numerator_start'],
            (int) $attributes['numerator_end'],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alokasi SKPD dibuat dan menunggu handover.']);

        return to_route('skpd.allocations.show', $allocation);
    }

    /**
     * Update a pending allocation with the inventory transaction and lock.
     */
    public function update(
        UpdateSkpdAllocationRequest $request,
        SkpdAllocation $skpdAllocation,
        UpdateSkpdAllocation $updateSkpdAllocation,
    ): RedirectResponse {
        Gate::authorize('update-skpd-allocation', $skpdAllocation);

        $attributes = $request->validated();

        $updateSkpdAllocation->handle(
            $this->actor($request),
            $skpdAllocation,
            Loket::query()->whereKey($attributes['loket_id'])->firstOrFail(),
            CarbonImmutable::createFromFormat('Y-m-d', $attributes['allocation_date']),
            (int) $attributes['numerator_start'],
            (int) $attributes['numerator_end'],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alokasi pending berhasil diperbarui.']);

        return to_route('skpd.allocations.show', $skpdAllocation);
    }

    /**
     * Display an allocation when it belongs to the user's visible scope.
     */
    public function show(SkpdAllocation $skpdAllocation, Request $request): Response
    {
        $actor = $this->actor($request);

        Gate::authorize('view-skpd-allocation', $skpdAllocation);

        $skpdAllocation->load([
            'skpdBox:id,box_number,numerator_start,numerator_end',
            'loket:id,name',
            'creator:id,name',
            'acceptor:id,name',
            'usageSegments:id,skpd_allocation_id,quantity',
            'auditLogs' => function (Relation $query): void {
                $query
                    ->with('actor:id,name')
                    ->latest('created_at')
                    ->limit(5);
            },
        ]);

        return Inertia::render('skpd/allocations/show', [
            'allocation' => [
                ...$this->allocationData($actor, $skpdAllocation),
                'timeline' => $skpdAllocation->auditLogs
                    ->map(fn ($audit): array => [
                        'id' => $audit->id,
                        'event' => $this->auditLabel($audit->event),
                        'actor' => $audit->actor->name,
                        'created_at' => $audit->created_at->toIso8601String(),
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    /**
     * Accept a pending handover as the assigned Petugas Loket.
     */
    public function accept(SkpdAllocation $skpdAllocation, Request $request, AcceptSkpdAllocation $acceptSkpdAllocation): RedirectResponse
    {
        Gate::authorize('accept-skpd-allocation', $skpdAllocation);

        $acceptSkpdAllocation->handle($this->actor($request), $skpdAllocation);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Handover alokasi SKPD berhasil diterima.']);

        return to_route('skpd.allocations.show', $skpdAllocation);
    }

    /**
     * Withdraw the unused tail of an accepted allocation back to central storage.
     */
    public function returnRemainder(
        ReturnSkpdAllocationRemainderRequest $request,
        SkpdAllocation $skpdAllocation,
        ReturnSkpdAllocationRemainder $returnRemainder,
    ): RedirectResponse {
        $returnRemainder->handle($this->actor($request), $skpdAllocation, (string) $request->validated('reason'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sisa Nomerator alokasi berhasil dikembalikan ke pusat.']);

        return to_route('skpd.allocations.show', $skpdAllocation);
    }

    /**
     * Cancel a pending allocation only when the current Bendahara created it.
     */
    public function cancel(SkpdAllocation $skpdAllocation, Request $request, CancelSkpdAllocation $cancelSkpdAllocation): RedirectResponse
    {
        Gate::authorize('cancel-skpd-allocation', $skpdAllocation);

        $cancelSkpdAllocation->handle($this->actor($request), $skpdAllocation);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alokasi pending berhasil dibatalkan.']);

        return to_route('skpd.allocations.show', $skpdAllocation);
    }

    /**
     * @return array{id: int, box_number: string, numerator_start: int, numerator_end: int, total_sets: int, available_quantity: int}
     */
    private function boxOption(SkpdBox $box): array
    {
        $reservedQuantity = (int) $box->getAttribute('reserved_quantity');

        return [
            'id' => $box->id,
            'box_number' => $box->box_number,
            'numerator_start' => $box->numerator_start,
            'numerator_end' => $box->numerator_end,
            'total_sets' => $box->total_sets,
            'available_quantity' => $box->total_sets - $reservedQuantity,
        ];
    }

    /**
     * @return array{id: int, box: array{id: int, box_number: string}, loket: array{id: int, name: string}, allocation_date: string|null, numerator_start: int, numerator_end: int, quantity: int, used_quantity: int, remaining_quantity: int, status: string, created_by: string, created_at: string, accepted_by: string|null, accepted_at: string|null, can: array{accept: bool, edit: bool, cancel: bool, return_remainder: bool}}
     */
    private function allocationData(User $actor, SkpdAllocation $allocation): array
    {
        $usedQuantity = (int) $allocation->usageSegments->sum('quantity');

        return [
            'id' => $allocation->id,
            'box' => ['id' => $allocation->skpdBox->id, 'box_number' => $allocation->skpdBox->box_number],
            'loket' => ['id' => $allocation->loket->id, 'name' => $allocation->loket->name],
            'allocation_date' => $allocation->allocation_date?->toDateString(),
            'numerator_start' => $allocation->numerator_start,
            'numerator_end' => $allocation->numerator_end,
            'quantity' => $allocation->quantity,
            'used_quantity' => $usedQuantity,
            'remaining_quantity' => $allocation->quantity - $usedQuantity,
            'status' => $allocation->status->value,
            'created_by' => $allocation->creator->name,
            'created_at' => $allocation->created_at->toIso8601String(),
            'accepted_by' => $allocation->acceptor?->name,
            'accepted_at' => $allocation->accepted_at?->toIso8601String(),
            'can' => [
                'accept' => $allocation->status === SkpdAllocationStatus::Pending
                    && $actor->can('accept-skpd-allocation', $allocation),
                'edit' => $allocation->status === SkpdAllocationStatus::Pending
                    && $actor->can('update-skpd-allocation', $allocation),
                'cancel' => $allocation->status === SkpdAllocationStatus::Pending
                    && $actor->can('cancel-skpd-allocation', $allocation),
                'return_remainder' => $allocation->status === SkpdAllocationStatus::Accepted
                    && $actor->can('return-skpd-allocation-remainder', $allocation)
                    && $allocation->quantity > $usedQuantity,
            ],
        ];
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'skpd_allocation.created' => 'Alokasi SKPD dibuat',
            'skpd_allocation.accepted' => 'Handover alokasi diterima',
            'skpd_allocation.updated' => 'Alokasi pending diperbarui',
            'skpd_allocation.cancelled' => 'Alokasi pending dibatalkan',
            'skpd_allocation.remainder_returned' => 'Sisa Nomerator dikembalikan ke pusat',
            default => 'Perubahan alokasi',
        };
    }
}
