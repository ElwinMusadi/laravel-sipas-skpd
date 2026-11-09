<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'permissions' => [
                    'manageUsers' => $request->user()?->can('manage-users') ?? false,
                    'manageLokets' => $request->user()?->can('manage-lokets') ?? false,
                    'manageDocumentOfficials' => $request->user()?->can('manage-document-officials') ?? false,
                    'viewSkpdInventory' => $request->user()?->can('view-skpd-inventory') ?? false,
                    'viewCentralSkpdInventory' => $request->user()?->can('view-central-skpd-inventory') ?? false,
                    'manageSkpdInventory' => $request->user()?->can('manage-skpd-inventory') ?? false,
                    'viewBaps' => $request->user()?->can('view-baps') ?? false,
                    'createBap' => $request->user()?->can('create-bap') ?? false,
                    'viewBapCancellations' => $request->user()?->can('view-bap-cancellations') ?? false,
                    'viewBapVerificationsPhase1' => $request->user()?->can('view-bap-verifications-phase-1') ?? false,
                    'viewBapVerificationsPhase2' => $request->user()?->can('view-bap-verifications-phase-2') ?? false,
                    'viewBapClarifications' => $request->user()?->can('view-bap-clarifications') ?? false,
                    'viewBapAdministrations' => $request->user()?->can('view-bap-administrations') ?? false,
                    'viewBukuKendali' => $request->user()?->can('view-buku-kendali') ?? false,
                    'viewLaporanPemakaian' => $request->user()?->can('view-laporan-pemakaian') ?? false,
                ],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
