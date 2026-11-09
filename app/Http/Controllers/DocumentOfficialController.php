<?php

namespace App\Http\Controllers;

use App\Actions\SkpdInventory\RecordDomainAudit;
use App\DocumentOfficialRole;
use App\Http\Requests\DocumentOfficials\StoreDocumentOfficialRequest;
use App\Http\Requests\DocumentOfficials\UpdateDocumentOfficialRequest;
use App\Models\DocumentOfficial;
use App\Support\BusinessDate;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Superadmin maintenance of the dated signatories printed on BAP SKPD documents.
 */
class DocumentOfficialController extends Controller
{
    private const AUDITED_FIELDS = ['name', 'nip', 'rank', 'position', 'effective_from'];

    public function index(): Response
    {
        $today = CarbonImmutable::parse(BusinessDate::today());
        $currentOfficials = DocumentOfficial::effectiveOn($today);
        $officials = DocumentOfficial::query()
            ->with('creator:id,name')
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('document-officials/index', [
            'roles' => array_map(fn (DocumentOfficialRole $role): array => [
                'value' => $role->value,
                'label' => $role->label(),
                'entries' => $officials
                    ->filter(fn (DocumentOfficial $official): bool => $official->role === $role)
                    ->map(fn (DocumentOfficial $official): array => [
                        ...$this->officialData($official),
                        'state' => match (true) {
                            ($currentOfficials[$role->value] ?? null)?->is($official) ?? false => 'current',
                            $official->effective_from->greaterThan($today) => 'upcoming',
                            default => 'past',
                        },
                        'created_by' => $official->creator->name ?? 'Sistem',
                    ])
                    ->values()
                    ->all(),
            ], DocumentOfficialRole::cases()),
        ]);
    }

    public function create(Request $request): Response
    {
        $role = DocumentOfficialRole::tryFrom((string) $request->query('role'));

        return Inertia::render('document-officials/create', [
            'roles' => $this->roleOptions(),
            'defaults' => [
                'role' => $role?->value,
                'effective_from' => BusinessDate::today(),
            ],
        ]);
    }

    public function store(StoreDocumentOfficialRequest $request, RecordDomainAudit $audit): RedirectResponse
    {
        $actor = $this->actor($request);
        $official = DocumentOfficial::create([
            ...$request->validated(),
            'created_by' => $actor->id,
        ]);

        $audit->handle($actor, $official, 'document_official.created', null, [
            'role' => $official->role->value,
            ...$this->auditedValues($official),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pejabat {$official->role->label()} berhasil ditambahkan."]);

        return to_route('document-officials.index');
    }

    public function edit(DocumentOfficial $documentOfficial): Response
    {
        return Inertia::render('document-officials/edit', [
            'official' => $this->officialData($documentOfficial),
        ]);
    }

    public function update(UpdateDocumentOfficialRequest $request, DocumentOfficial $documentOfficial, RecordDomainAudit $audit): RedirectResponse
    {
        $oldValues = $this->auditedValues($documentOfficial);
        $documentOfficial->update($request->validated());

        $audit->handle($this->actor($request), $documentOfficial, 'document_official.updated', $oldValues, $this->auditedValues($documentOfficial));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Data pejabat berhasil diperbarui.']);

        return to_route('document-officials.index');
    }

    /**
     * @return array{id: int, role: string, role_label: string, name: string, nip: string|null, rank: string|null, position: string, effective_from: string}
     */
    private function officialData(DocumentOfficial $official): array
    {
        return [
            'id' => $official->id,
            'role' => $official->role->value,
            'role_label' => $official->role->label(),
            'name' => $official->name,
            'nip' => $official->nip,
            'rank' => $official->rank,
            'position' => $official->position,
            'effective_from' => $official->effective_from->toDateString(),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function auditedValues(DocumentOfficial $official): array
    {
        $values = $official->only(self::AUDITED_FIELDS);
        $values['effective_from'] = $official->effective_from->toDateString();

        return $values;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function roleOptions(): array
    {
        return array_map(
            fn (DocumentOfficialRole $role): array => ['value' => $role->value, 'label' => $role->label()],
            DocumentOfficialRole::cases(),
        );
    }
}
