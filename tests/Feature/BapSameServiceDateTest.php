<?php

use App\Actions\SkpdInventory\CreateBap;
use App\Actions\SkpdInventory\GenerateBapDocumentNumber;
use App\Models\AuditLog;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\SkpdAllocation;
use App\Models\SkpdBox;
use App\Models\User;
use App\SkpdAllocationStatus;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->travelTo('2026-11-09 03:00:00');
});

/**
 * @return array{loket: Loket, petugas: User, oldAllocation: SkpdAllocation, newAllocation: SkpdAllocation}
 */
function sameDateLoketWithTwoBoxes(): array
{
    $loket = Loket::factory()->create(['code' => 'MPP', 'name' => 'Mall Pelayanan Publik']);
    $petugas = User::factory()->create(['role' => UserRole::PetugasLoket, 'loket_id' => $loket->id]);

    $allocate = function (string $boxNumber, int $start, int $end, string $allocationDate) use ($loket, $petugas): SkpdAllocation {
        $box = SkpdBox::factory()->create([
            'box_number' => $boxNumber,
            'numerator_start' => $start,
            'numerator_end' => $end,
            'total_sets' => $end - $start + 1,
        ]);

        return SkpdAllocation::factory()->create([
            'skpd_box_id' => $box->id,
            'loket_id' => $loket->id,
            'allocation_date' => $allocationDate,
            'numerator_start' => $start,
            'numerator_end' => $end,
            'quantity' => $end - $start + 1,
            'status' => SkpdAllocationStatus::Accepted,
            'accepted_by' => $petugas->id,
            'accepted_at' => CarbonImmutable::parse($allocationDate)->setTime(8, 0),
        ]);
    };

    return [
        'loket' => $loket,
        'petugas' => $petugas,
        'oldAllocation' => $allocate('BOX-LAMA', 583_000, 583_009, '2026-11-01'),
        'newAllocation' => $allocate('BOX-BARU', 600_000, 600_099, '2026-11-09'),
    ];
}

/**
 * @return array{service_date: string, numerator_start: string, numerator_end: string, online_usage_count: int, cancellation_count: int}
 */
function sameDatePayload(int $start, int $end, int $online = 0, string $serviceDate = '2026-11-09'): array
{
    return [
        'service_date' => $serviceDate,
        'numerator_start' => str_pad((string) $start, 7, '0', STR_PAD_LEFT),
        'numerator_end' => str_pad((string) $end, 7, '0', STR_PAD_LEFT),
        'online_usage_count' => $online,
        'cancellation_count' => 0,
    ];
}

test('a Loket files a second BAP on the same service date after the old Box allocation runs out', function () {
    ['petugas' => $petugas, 'newAllocation' => $newAllocation] = sameDateLoketWithTwoBoxes();

    $this->actingAs($petugas)
        ->post(route('baps.store'), sameDatePayload(583_000, 583_009))
        ->assertSessionHasNoErrors();
    $this->actingAs($petugas)
        ->post(route('baps.store'), sameDatePayload(600_000, 600_019, 2))
        ->assertSessionHasNoErrors();

    [$firstBap, $secondBap] = Bap::query()->orderBy('id')->get()->all();

    expect($firstBap->service_date->toDateString())->toBe('2026-11-09')
        ->and($secondBap->service_date->toDateString())->toBe('2026-11-09')
        ->and($firstBap->document_number)->toBe('PB/MPP/09/11/2026')
        ->and($secondBap->document_number)->toBe('PB/MPP/09/11/2026-2')
        ->and($secondBap->usageSegments()->sole()->skpd_allocation_id)->toBe($newAllocation->id);
});

test('both BAPs of one service date stay editable as drafts within their own rules', function () {
    ['petugas' => $petugas] = sameDateLoketWithTwoBoxes();
    $this->actingAs($petugas)->post(route('baps.store'), sameDatePayload(583_000, 583_009));
    $this->actingAs($petugas)->post(route('baps.store'), sameDatePayload(600_000, 600_019));
    [$firstBap, $secondBap] = Bap::query()->orderBy('id')->get()->all();

    $this->actingAs($petugas)
        ->put(route('baps.update', $secondBap), sameDatePayload(600_000, 600_029, 4))
        ->assertSessionHasNoErrors();
    $this->actingAs($petugas)
        ->put(route('baps.update', $firstBap), sameDatePayload(583_000, 583_009, 3))
        ->assertSessionHasNoErrors();

    expect($secondBap->refresh()->numerator_end)->toBe(600_029)
        ->and($secondBap->document_number)->toBe('PB/MPP/09/11/2026-2')
        ->and($firstBap->refresh()->online_usage_count)->toBe(3);
});

test('a tail draft moved to another service date gets that date in its document number', function () {
    ['petugas' => $petugas] = sameDateLoketWithTwoBoxes();
    $this->actingAs($petugas)->post(route('baps.store'), sameDatePayload(583_000, 583_004));
    $bap = Bap::query()->sole();

    $this->actingAs($petugas)
        ->put(route('baps.update', $bap), sameDatePayload(583_000, 583_004, 0, '2026-11-08'))
        ->assertSessionHasNoErrors();

    $audit = AuditLog::query()->where('auditable_id', $bap->id)->where('event', 'bap.updated')->sole();

    expect($bap->refresh()->document_number)->toBe('PB/MPP/08/11/2026')
        ->and($audit->old_values['document_number'])->toBe('PB/MPP/09/11/2026')
        ->and($audit->new_values['document_number'])->toBe('PB/MPP/08/11/2026');
});

test('a legacy document number based on the creation date pushes a new BAP to the next suffix', function () {
    $loket = Loket::factory()->create(['code' => 'MPP', 'name' => 'Mall Pelayanan Publik']);
    Bap::factory()->create(['document_number' => 'PB/MPP/09/11/2026', 'service_date' => '2026-11-08']);
    Bap::factory()->create(['document_number' => 'PB/MPP/09/11/2026-2', 'service_date' => '2026-11-08']);

    expect(app(GenerateBapDocumentNumber::class)->handle($loket, CarbonImmutable::parse('2026-11-09')))
        ->toBe('PB/MPP/09/11/2026-3')
        ->and(app(GenerateBapDocumentNumber::class)->handle($loket, CarbonImmutable::parse('2026-11-10')))
        ->toBe('PB/MPP/10/11/2026');
});

test('the second BAP of a service date is still rejected while the old allocation has numerators left', function () {
    ['petugas' => $petugas, 'loket' => $loket] = sameDateLoketWithTwoBoxes();
    app(CreateBap::class)->handle($petugas, $loket, CarbonImmutable::parse('2026-11-09'), 583_000, 583_004);

    $this->actingAs($petugas)
        ->from(route('baps.create'))
        ->post(route('baps.store'), sameDatePayload(583_005, 583_009))
        ->assertRedirect(route('baps.create'))
        ->assertSessionHasErrors(['service_date' => CreateBap::SAME_DATE_MESSAGE]);

    $this->assertDatabaseCount('baps', 1);
});

test('the document number migration suffixes repeated legacy numbers before making them unique', function () {
    $migration = require database_path('migrations/2026_11_09_183611_add_unique_index_to_bap_document_numbers.php');
    $migration->down();

    $first = Bap::factory()->create(['document_number' => 'PB/MPP/03/09/2026']);
    $second = Bap::factory()->create(['document_number' => 'PB/MPP/03/09/2026']);
    $third = Bap::factory()->create(['document_number' => 'PB/MPP/03/09/2026']);
    $alreadySuffixed = Bap::factory()->create(['document_number' => 'PB/MPP/03/09/2026-2']);

    $migration->up();

    expect($first->refresh()->document_number)->toBe('PB/MPP/03/09/2026')
        ->and($second->refresh()->document_number)->toBe('PB/MPP/03/09/2026-3')
        ->and($third->refresh()->document_number)->toBe('PB/MPP/03/09/2026-4')
        ->and($alreadySuffixed->refresh()->document_number)->toBe('PB/MPP/03/09/2026-2');
    $this->assertDatabaseHas('audit_logs', [
        'auditable_id' => $second->id,
        'event' => 'bap.document_number_deduplicated',
    ]);
    expect(fn () => DB::table('baps')->where('id', $third->id)->update(['document_number' => 'PB/MPP/03/09/2026']))
        ->toThrow(QueryException::class);
});
