<?php

use App\Models\Bap;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Legacy numbers were derived from the creation date and may repeat. The oldest
     * BAP keeps each repeated number; later ones get the next free `-N` suffix (the
     * same format GenerateBapDocumentNumber uses) with an audit entry, and then the
     * column becomes unique.
     */
    public function up(): void
    {
        $repeatedNumbers = DB::table('baps')
            ->select('document_number')
            ->groupBy('document_number')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('document_number');

        foreach ($repeatedNumbers as $documentNumber) {
            $keptBapId = DB::table('baps')
                ->where('document_number', $documentNumber)
                ->min('id');
            $laterBapIds = DB::table('baps')
                ->where('document_number', $documentNumber)
                ->where('id', '>', $keptBapId)
                ->orderBy('id')
                ->pluck('id');
            $sequence = 1;

            foreach ($laterBapIds as $bapId) {
                do {
                    $sequence++;
                    $candidate = "{$documentNumber}-{$sequence}";
                } while (DB::table('baps')->where('document_number', $candidate)->exists());

                DB::table('baps')->where('id', $bapId)->update(['document_number' => $candidate]);
                DB::table('audit_logs')->insert([
                    'actor_id' => null,
                    'auditable_type' => Bap::class,
                    'auditable_id' => $bapId,
                    'event' => 'bap.document_number_deduplicated',
                    'old_values' => json_encode(['document_number' => $documentNumber]),
                    'new_values' => json_encode(['document_number' => $candidate]),
                    'created_at' => now(),
                ]);
            }
        }

        Schema::table('baps', function (Blueprint $table): void {
            $table->unique('document_number');
        });
    }

    /**
     * Reverse the migrations. Deduplicated numbers keep their suffix.
     */
    public function down(): void
    {
        Schema::table('baps', function (Blueprint $table): void {
            $table->dropUnique(['document_number']);
        });
    }
};
