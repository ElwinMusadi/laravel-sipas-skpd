<?php

use App\BapCancellationReason;
use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\User;
use App\Support\BapSkpdDocumentData;
use App\UserRole;
use Carbon\CarbonImmutable;

function bapPdfUser(UserRole $role, ?Loket $loket = null): User
{
    return User::factory()->create([
        'role' => $role,
        'loket_id' => $role === UserRole::PetugasLoket ? $loket?->id : null,
        'is_active' => true,
    ]);
}

function printableBap(User $creator, Loket $loket, BapStatus $status = BapStatus::Draft): Bap
{
    return Bap::factory()->create([
        'document_number' => 'PB/MPP/31/08/2026',
        'loket_id' => $loket->id,
        'service_date' => '2026-07-01',
        'numerator_start' => 582_608,
        'numerator_end' => 582_620,
        'total_usage' => 13,
        'online_usage_count' => 2,
        'status' => $status,
        'created_by' => $creator->id,
        'created_at' => CarbonImmutable::create(2026, 8, 31, 1, 0, 0, 'UTC'),
        'updated_at' => CarbonImmutable::create(2026, 8, 31, 1, 0, 0, 'UTC'),
    ]);
}

test('authorized user streams the official BAP PDF inline with a safe filename', function () {
    $loket = Loket::factory()->create(['code' => 'MPP']);
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket);

    $response = $this->actingAs($creator)->get(route('baps.pdf', $bap));

    $response->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('content-disposition', 'inline; filename=BAP-SKPD-PB-MPP-31-08-2026.pdf');

    expect($response->getContent())->toStartWith('%PDF');
});

test('official BAP document uses document number, created date in WITA, and seven digit numerators', function () {
    $loket = Loket::factory()->create(['code' => 'MPP']);
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket);
    $bap->load('cancellations');

    $data = app(BapSkpdDocumentData::class)->for($bap);
    $html = view('pdf.bap-skpd', [...$data, 'logoDataUri' => null])->render();

    expect($data['documentNumber'])->toBe('PB/MPP/31/08/2026')
        ->and($data['formalDate'])->toBe([
            'day_name' => 'Senin',
            'date_words' => 'Tiga Puluh Satu',
            'month_name' => 'Agustus',
            'year_words' => 'Dua Ribu Dua Puluh Enam',
        ])
        ->and($data['numeratorStart'])->toBe('0582608')
        ->and($data['numeratorEnd'])->toBe('0582620')
        ->and($html)->toContain('NOMOR : PB/MPP/31/08/2026')
        ->and($html)->toContain('Tiga Puluh Satu')
        ->and($html)->toContain('Dua Ribu Dua Puluh Enam')
        ->and($html)->toContain('0582608')
        ->and($html)->toContain('0582620')
        ->and($html)->toContain('Skolastika G. Maing')
        ->and($html)->toContain('Jonny Alfreth Doo')
        ->and($html)->toContain('Remmy Christian Pah')
        ->and($html)->toContain('Yunus Asamani');
});

test('official BAP hides cancellation detail section when cancellation count is zero', function () {
    $loket = Loket::factory()->create();
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket);
    $bap->load('cancellations');

    $data = app(BapSkpdDocumentData::class)->for($bap);
    $html = view('pdf.bap-skpd', [...$data, 'logoDataUri' => null])->render();

    expect($data['cancellationCount'])->toBe(0)
        ->and($html)->toContain('SKPD Batal/Rusak')
        ->and($html)->not->toContain('Nomerator dan Keterangan');
});

test('official BAP lists cancellation numerator and description when present', function () {
    $loket = Loket::factory()->create();
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket);

    BapCancellation::query()->create([
        'bap_id' => $bap->id,
        'numerator' => 582_612,
        'reason' => BapCancellationReason::PrinterError,
        'description' => 'Tinta cetak tidak terbaca.',
        'created_by' => $creator->id,
    ]);
    BapCancellation::query()->create([
        'bap_id' => $bap->id,
        'numerator' => 582_615,
        'reason' => BapCancellationReason::Custom,
        'description' => 'Formulir terlipat.',
        'created_by' => $creator->id,
    ]);

    $bap->load('cancellations');
    $data = app(BapSkpdDocumentData::class)->for($bap);
    $html = view('pdf.bap-skpd', [...$data, 'logoDataUri' => null])->render();

    expect($data['cancellationCount'])->toBe(2)
        ->and($html)->toContain('Nomerator dan Keterangan')
        ->and($html)->toContain('0582612')
        ->and($html)->toContain('Printer Error — Tinta cetak tidak terbaca.')
        ->and($html)->toContain('0582615')
        ->and($html)->toContain('Formulir terlipat.');
});

test('every role that can view a BAP can stream its PDF', function (UserRole $role) {
    $loket = Loket::factory()->create();
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket, BapStatus::Completed);
    $actor = $role === UserRole::PetugasLoket
        ? bapPdfUser($role, $loket)
        : bapPdfUser($role);

    $this->actingAs($actor)
        ->get(route('baps.pdf', $bap))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
})->with([
    'Superadmin' => UserRole::Superadmin,
    'Bendahara Barang' => UserRole::BendaharaBarang,
    'Petugas Loket' => UserRole::PetugasLoket,
    'Petugas Penetapan' => UserRole::PetugasPenetapan,
    'Petugas Verifikasi' => UserRole::PetugasVerifikasi,
    'Kasie Penetapan' => UserRole::KasiePenetapan,
    'Kasie Verifikasi' => UserRole::KasieVerifikasi,
    'Kepala UPTD' => UserRole::KepalaUptd,
]);

test('Petugas Loket cannot stream another Loket BAP PDF', function () {
    $ownLoket = Loket::factory()->create();
    $otherLoket = Loket::factory()->create();
    $actor = bapPdfUser(UserRole::PetugasLoket, $ownLoket);
    $creator = bapPdfUser(UserRole::PetugasLoket, $otherLoket);
    $bap = printableBap($creator, $otherLoket);

    $this->actingAs($actor)
        ->get(route('baps.pdf', $bap))
        ->assertForbidden();
});

test('guest cannot stream a BAP PDF', function () {
    $loket = Loket::factory()->create();
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket);

    $this->get(route('baps.pdf', $bap))
        ->assertRedirect(route('login'));
});

test('streaming a BAP PDF does not mutate source records', function () {
    $loket = Loket::factory()->create();
    $creator = bapPdfUser(UserRole::PetugasLoket, $loket);
    $bap = printableBap($creator, $loket, BapStatus::Completed);
    $fields = [
        'document_number',
        'loket_id',
        'service_date',
        'numerator_start',
        'numerator_end',
        'total_usage',
        'online_usage_count',
        'status',
        'created_by',
        'submitted_at',
        'received_by',
        'received_at',
        'receipt_notes',
    ];
    $source = collect($fields)
        ->mapWithKeys(fn (string $field): array => [$field => $bap->getRawOriginal($field)])
        ->all();

    $this->actingAs($creator)
        ->get(route('baps.pdf', $bap))
        ->assertOk();

    $fresh = $bap->fresh();
    expect(collect($fields)
        ->mapWithKeys(fn (string $field): array => [$field => $fresh?->getRawOriginal($field)])
        ->all())->toBe($source);
});
