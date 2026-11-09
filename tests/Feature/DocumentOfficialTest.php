<?php

use App\DocumentOfficialRole;
use App\Models\AuditLog;
use App\Models\Bap;
use App\Models\DocumentOfficial;
use App\Models\User;
use App\Support\BapSkpdDocumentData;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-11-10 03:00:00');
});

/**
 * @return array<string, string|null>
 */
function newHeadOfficialPayload(string $effectiveFrom = '2026-12-01'): array
{
    return [
        'role' => DocumentOfficialRole::Head->value,
        'name' => '  Maria Fernandez, S.STP  ',
        'nip' => '19900101 201201 2 001',
        'rank' => 'Pembina/IVa',
        'position' => 'Kepala UPTD. Pendapatan Daerah Wilayah Kota Kupang',
        'effective_from' => $effectiveFrom,
    ];
}

test('the seeded officials are current and listed per signature role', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->get(route('document-officials.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('document-officials/index')
            ->has('roles', 4)
            ->where('roles.2.value', 'head')
            ->where('roles.2.entries.0.name', 'Remmy Christian Pah, SSTP, M.Si')
            ->where('roles.2.entries.0.state', 'current')
            ->where('roles.2.entries.0.created_by', 'Sistem'));
});

test('a Superadmin records a new head official from a future date with an audit entry', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->post(route('document-officials.store'), newHeadOfficialPayload())
        ->assertRedirect(route('document-officials.index'))
        ->assertSessionHasNoErrors();

    $official = DocumentOfficial::query()->where('name', 'Maria Fernandez, S.STP')->sole();
    $audit = AuditLog::query()->where('event', 'document_official.created')->sole();

    expect($official->role)->toBe(DocumentOfficialRole::Head)
        ->and($official->effective_from->toDateString())->toBe('2026-12-01')
        ->and($official->created_by)->toBe($superadmin->id)
        ->and($audit->actor_id)->toBe($superadmin->id)
        ->and($audit->new_values['name'])->toBe('Maria Fernandez, S.STP');

    $this->actingAs($superadmin)
        ->get(route('document-officials.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('roles.2.entries.0.name', 'Maria Fernandez, S.STP')
            ->where('roles.2.entries.0.state', 'upcoming')
            ->where('roles.2.entries.1.state', 'current'));
});

test('a BAP prints the head official who was in office on its service date', function () {
    DocumentOfficial::factory()->create([
        ...newHeadOfficialPayload(),
        'name' => 'Maria Fernandez, S.STP',
    ]);
    $bapBeforeChange = Bap::factory()->create(['service_date' => '2026-11-30']);
    $bapAfterChange = Bap::factory()->create(['service_date' => '2026-12-01']);
    $documentData = app(BapSkpdDocumentData::class);

    expect($documentData->for($bapBeforeChange->load('cancellations'))['officials']['head']['name'])
        ->toBe('Remmy Christian Pah, SSTP, M.Si')
        ->and($documentData->for($bapAfterChange->load('cancellations'))['officials']['head']['name'])
        ->toBe('Maria Fernandez, S.STP')
        ->and($documentData->for($bapAfterChange)['officials']['first_party']['name'])
        ->toBe('Skolastika G. Maing, S. Sos,M.H.I');
});

test('two officials of the same role cannot start on the same date and required fields are enforced', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);

    $this->actingAs($superadmin)
        ->from(route('document-officials.create'))
        ->post(route('document-officials.store'), newHeadOfficialPayload('2026-01-01'))
        ->assertRedirect(route('document-officials.create'))
        ->assertSessionHasErrors(['effective_from' => 'Peran ini sudah memiliki pejabat dengan tanggal mulai berlaku yang sama.']);

    $this->actingAs($superadmin)
        ->post(route('document-officials.store'), ['role' => 'head', 'name' => ' ', 'position' => '', 'effective_from' => '', 'nip' => '1990-01'])
        ->assertSessionHasErrors([
            'name' => 'Nama pejabat wajib diisi.',
            'position' => 'Jabatan wajib diisi.',
            'effective_from' => 'Tanggal mulai berlaku wajib diisi.',
            'nip' => 'NIP hanya boleh berisi angka dan spasi.',
        ]);

    $this->assertDatabaseCount('document_officials', 4);
});

test('a Superadmin corrects a typo in an official and the change is audited', function () {
    $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
    $official = DocumentOfficial::query()->where('role', 'third_party')->sole();

    $this->actingAs($superadmin)
        ->put(route('document-officials.update', $official), [
            'name' => 'Yunus Asamani, S.H.',
            'nip' => '19790730 200901 1 003',
            'rank' => 'Penata Muda/IIIa',
            'position' => 'Pengurus Barang Pembantu',
            'effective_from' => '2026-01-01',
        ])
        ->assertRedirect(route('document-officials.index'))
        ->assertSessionHasNoErrors();

    $audit = AuditLog::query()->where('event', 'document_official.updated')->sole();

    expect($official->refresh()->name)->toBe('Yunus Asamani, S.H.')
        ->and($official->rank)->toBe('Penata Muda/IIIa')
        ->and($official->role)->toBe(DocumentOfficialRole::ThirdParty)
        ->and($audit->old_values['name'])->toBe('Yunus Asamani, S.H')
        ->and($audit->new_values['rank'])->toBe('Penata Muda/IIIa');
});

test('roles other than Superadmin cannot manage document officials', function (UserRole $role) {
    $user = User::factory()->create(['role' => $role]);
    $official = DocumentOfficial::query()->where('role', 'head')->sole();

    $this->actingAs($user)->get(route('document-officials.index'))->assertForbidden();
    $this->actingAs($user)->post(route('document-officials.store'), newHeadOfficialPayload())->assertForbidden();
    $this->actingAs($user)->put(route('document-officials.update', $official), newHeadOfficialPayload())->assertForbidden();

    $this->assertDatabaseCount('document_officials', 4);
})->with([
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);
