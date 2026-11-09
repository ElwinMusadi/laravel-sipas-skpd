<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\CreateLoket;
use App\Actions\SkpdInventory\DeleteLoket;
use App\Actions\SkpdInventory\UpdateLoket;
use App\Http\Requests\SkpdInventory\StoreLoketRequest;
use App\Http\Requests\SkpdInventory\UpdateLoketRequest;
use App\Models\Loket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LoketController extends Controller
{
    /**
     * Display Loket master data with server-side filters.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('manage-lokets');

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $query = Loket::query()->withCount(['users', 'skpdAllocations', 'baps']);

        if ($search = $filters['search'] ?? null) {
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if (($filters['status'] ?? null) === 'active') {
            $query->where('is_active', true);
        }

        if (($filters['status'] ?? null) === 'inactive') {
            $query->where('is_active', false);
        }

        return Inertia::render('lokets/index', [
            'lokets' => $query
                ->orderBy('code')
                ->orderBy('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Loket $loket): array => $this->loketData($loket)),
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('manage-lokets');

        return Inertia::render('lokets/create');
    }

    public function store(StoreLoketRequest $request, CreateLoket $createLoket): RedirectResponse
    {
        $attributes = $request->validated();
        $loket = $createLoket->handle(
            $this->actor($request),
            $attributes['code'],
            $attributes['name'],
            $attributes['description'] ?? null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Loket berhasil ditambahkan.']);

        return to_route('lokets.show', $loket);
    }

    public function show(Loket $loket): Response
    {
        Gate::authorize('manage-lokets');

        $loket->loadCount(['users', 'skpdAllocations', 'baps'])->load([
            'users' => function (Relation $query): void {
                $query
                    ->select(['id', 'username', 'name', 'nip', 'role', 'loket_id', 'is_active'])
                    ->orderBy('name');
            },
            'auditLogs' => function (Relation $query): void {
                $query
                    ->with('actor:id,name')
                    ->latest('created_at')
                    ->limit(10);
            },
        ]);

        return Inertia::render('lokets/show', [
            'loket' => [
                ...$this->loketData($loket),
                'users' => $loket->users
                    ->map(fn (User $user): array => [
                        'id' => $user->id,
                        'username' => $user->username,
                        'name' => $user->name,
                        'nip' => $user->nip,
                        'role' => $user->role->value,
                        'role_label' => $user->role->label(),
                        'is_active' => $user->is_active,
                    ])
                    ->values()
                    ->all(),
                'timeline' => $loket->auditLogs
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

    public function edit(Loket $loket): Response
    {
        Gate::authorize('manage-lokets');

        return Inertia::render('lokets/edit', [
            'loket' => $this->formData($loket),
        ]);
    }

    public function update(UpdateLoketRequest $request, Loket $loket, UpdateLoket $updateLoket): RedirectResponse
    {
        $attributes = $request->validated();
        $updatedLoket = $updateLoket->handle(
            $this->actor($request),
            $loket,
            $attributes['code'],
            $attributes['name'],
            $attributes['description'] ?? null,
            (bool) $attributes['is_active'],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Loket berhasil diperbarui.']);

        return to_route('lokets.show', $updatedLoket);
    }

    public function destroy(Loket $loket, Request $request, DeleteLoket $deleteLoket): RedirectResponse
    {
        Gate::authorize('manage-lokets');

        $deleteLoket->handle($this->actor($request), $loket);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Loket yang belum digunakan berhasil dihapus.']);

        return to_route('lokets.index');
    }

    /**
     * @return array{id: int, code: string, name: string, description: string|null, is_active: bool, users_count: int, allocations_count: int, baps_count: int, created_at: string, can: array{delete: bool}}
     */
    private function loketData(Loket $loket): array
    {
        $usersCount = $loket->users_count ?? 0;
        $allocationsCount = $loket->skpd_allocations_count ?? 0;
        $bapsCount = $loket->baps_count ?? 0;

        return [
            'id' => $loket->id,
            'code' => $loket->code,
            'name' => $loket->name,
            'description' => $loket->description,
            'is_active' => $loket->is_active,
            'users_count' => $usersCount,
            'allocations_count' => $allocationsCount,
            'baps_count' => $bapsCount,
            'created_at' => $loket->created_at->toIso8601String(),
            'can' => [
                'delete' => $usersCount === 0 && $allocationsCount === 0 && $bapsCount === 0,
            ],
        ];
    }

    /**
     * @return array{id: int, code: string, name: string, description: string|null, is_active: bool}
     */
    private function formData(Loket $loket): array
    {
        return [
            'id' => $loket->id,
            'code' => $loket->code,
            'name' => $loket->name,
            'description' => $loket->description,
            'is_active' => $loket->is_active,
        ];
    }

    private function auditLabel(string $event): string
    {
        return match ($event) {
            'loket.created' => 'Loket dibuat',
            'loket.updated' => 'Data Loket diperbarui',
            'loket.activated' => 'Loket diaktifkan',
            'loket.deactivated' => 'Loket dinonaktifkan',
            'loket.deleted' => 'Loket dihapus',
            default => 'Perubahan Loket',
        };
    }
}
