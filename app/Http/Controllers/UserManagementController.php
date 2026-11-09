<?php

namespace App\Http\Controllers;

use App\Actions\UserManagement\RecordUserManagementAudit;
use App\Http\Requests\UserManagement\ResetUserPasswordRequest;
use App\Http\Requests\UserManagement\StoreUserRequest;
use App\Http\Requests\UserManagement\UpdateUserRequest;
use App\Models\Loket;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display and filter administrative users.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'loket' => ['nullable', 'integer', Rule::exists(Loket::class, 'id')],
        ]);

        $query = User::query()
            ->select(['id', 'username', 'name', 'nip', 'role', 'loket_id', 'is_active', 'last_login_at'])
            ->with('loket:id,name');

        if ($search = $filters['search'] ?? null) {
            $query->where(function ($query) use ($search): void {
                $query
                    ->where('username', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        if ($role = $filters['role'] ?? null) {
            $query->where('role', $role);
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('is_active', $status === 'active');
        }

        if ($loket = $filters['loket'] ?? null) {
            $query->where('loket_id', $loket);
        }

        return Inertia::render('users/index', [
            'users' => $query
                ->orderBy('name')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (User $user): array => $this->userData($user)),
            'filters' => $filters,
            'roles' => $this->roles(),
            'lokets' => $this->lokets(),
        ]);
    }

    /**
     * Show the user creation form.
     */
    public function create(): Response
    {
        return Inertia::render('users/create', [
            'roles' => $this->roles(),
            'lokets' => $this->lokets(),
        ]);
    }

    /**
     * Store a user created by a superadmin.
     */
    public function store(StoreUserRequest $request, RecordUserManagementAudit $audit): RedirectResponse
    {
        $validated = $request->validated();
        $actor = $this->actor($request);
        $user = DB::transaction(function () use ($validated, $actor, $audit): User {
            $attributes = $this->userAttributes($validated);
            $this->ensureAssignedLoketIsActive($attributes['loket_id']);

            $user = User::create([
                ...$attributes,
                'password' => $validated['password'],
            ]);

            $audit->created($actor, $user);

            return $user;
        }, attempts: 3);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengguna berhasil dibuat.']);

        return to_route('users.show', $user);
    }

    /**
     * Display a user and the administrative reset-password form.
     */
    public function show(User $user): Response
    {
        return Inertia::render('users/show', [
            'user' => $this->userData($user->loadMissing('loket')),
        ]);
    }

    /**
     * Show the user editing form.
     */
    public function edit(User $user): Response
    {
        return Inertia::render('users/edit', [
            'user' => $this->userData($user->loadMissing('loket')),
            'roles' => $this->roles(),
            'lokets' => $this->lokets(),
        ]);
    }

    /**
     * Update user data without accepting a password in this endpoint.
     */
    public function update(UpdateUserRequest $request, User $user, RecordUserManagementAudit $audit): RedirectResponse
    {
        $validated = $request->validated();
        $actor = $this->actor($request);
        $user = DB::transaction(function () use ($validated, $actor, $audit, $user): User {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $attributes = $this->userAttributes($validated);
            $this->ensureAssignedLoketIsActive($attributes['loket_id']);

            $lockedUser->fill($attributes);
            $this->ensureSuperadminAccessIsKept($actor, $lockedUser);
            $changes = Arr::only($lockedUser->getDirty(), ['username', 'name', 'nip', 'role', 'loket_id', 'is_active']);
            $old = Arr::only($lockedUser->getRawOriginal(), array_keys($changes));
            $lockedUser->save();

            $audit->updated($actor, $lockedUser, $old, $changes);

            return $lockedUser;
        }, attempts: 3);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengguna berhasil diperbarui.']);

        return to_route('users.show', $user);
    }

    /**
     * Reset a user's password without disclosing the existing password.
     */
    public function resetPassword(ResetUserPasswordRequest $request, User $user, RecordUserManagementAudit $audit): RedirectResponse
    {
        $user->forceFill(['password' => $request->validated('password')])->save();
        $audit->passwordReset($this->actor($request), $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Password pengguna berhasil direset.']);

        return to_route('users.show', $user);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array{username: string, name: string, nip: string, role: string, loket_id: int|null, is_active: bool}
     */
    private function userAttributes(array $attributes): array
    {
        $role = $attributes['role'];

        return [
            'username' => $attributes['username'],
            'name' => $attributes['name'],
            'nip' => $attributes['nip'],
            'role' => $role,
            'loket_id' => $role === UserRole::PetugasLoket->value ? (int) $attributes['loket_id'] : null,
            'is_active' => $attributes['is_active'],
        ];
    }

    /**
     * Only an active Superadmin manages users, so forbidding self-deactivation and
     * self-demotion guarantees at least one active Superadmin always remains.
     */
    private function ensureSuperadminAccessIsKept(User $actor, User $user): void
    {
        if (! $actor->is($user)) {
            return;
        }

        if ($user->isDirty('is_active') && ! $user->is_active) {
            throw ValidationException::withMessages([
                'is_active' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
            ]);
        }

        if ($user->isDirty('role')) {
            throw ValidationException::withMessages([
                'role' => 'Anda tidak dapat mengubah peran akun Anda sendiri.',
            ]);
        }
    }

    private function ensureAssignedLoketIsActive(?int $loketId): void
    {
        if ($loketId === null) {
            return;
        }

        $lock = DB::table('skpd_inventory_locks')
            ->where('id', 1)
            ->lockForUpdate()
            ->first();

        if ($lock === null) {
            throw new \LogicException('Kunci transaksi inventaris SKPD tidak tersedia.');
        }

        $loket = Loket::query()->lockForUpdate()->find($loketId);

        if ($loket === null || ! $loket->is_active) {
            throw ValidationException::withMessages([
                'loket_id' => 'Loket tidak aktif atau tidak lagi tersedia untuk penugasan.',
            ]);
        }
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function roles(): array
    {
        return array_map(
            fn (UserRole $role): array => ['value' => $role->value, 'label' => $role->label()],
            UserRole::cases(),
        );
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function lokets(): array
    {
        return Loket::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Loket $loket): array => ['id' => $loket->id, 'name' => $loket->name])
            ->all();
    }

    /**
     * @return array{id: int, username: string, name: string, nip: string, role: string, role_label: string, loket: array{id: int, name: string}|null, is_active: bool, last_login_at: string|null}
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'nip' => $user->nip,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'loket' => $user->loket === null ? null : [
                'id' => $user->loket->id,
                'name' => $user->loket->name,
            ],
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
