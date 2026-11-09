<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Signatories of the BAP SKPD document, kept as dated history so a reprinted
     * BAP shows the officials in office on its service date.
     */
    public function up(): void
    {
        Schema::create('document_officials', function (Blueprint $table): void {
            $table->id();
            $table->string('role', 32);
            $table->string('name');
            $table->string('nip', 32)->nullable();
            $table->string('rank', 100)->nullable();
            $table->string('position');
            $table->date('effective_from');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['role', 'effective_from']);
        });

        $now = now();
        $effectiveFrom = '2026-01-01';

        DB::table('document_officials')->insert([
            [
                'role' => 'first_party',
                'name' => 'Skolastika G. Maing, S. Sos,M.H.I',
                'nip' => '19880421 201101 2 006',
                'rank' => 'Penata/IIId',
                'position' => 'Kasie Penetapan dan Penagihan',
                'effective_from' => $effectiveFrom,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'role' => 'second_party',
                'name' => 'Jonny Alfreth Doo, S.Sos, MM',
                'nip' => '19710615 200701 1 039',
                'rank' => 'Pembina/IVa',
                'position' => 'Kasie Verifikasi',
                'effective_from' => $effectiveFrom,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'role' => 'head',
                'name' => 'Remmy Christian Pah, SSTP, M.Si',
                'nip' => '19850514 200412 1 001',
                'rank' => 'Pembina',
                'position' => 'Kepala UPTD. Pendapatan Daerah Wilayah Kota Kupang',
                'effective_from' => $effectiveFrom,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'role' => 'third_party',
                'name' => 'Yunus Asamani, S.H',
                'nip' => '19790730 200901 1 003',
                'rank' => null,
                'position' => 'Pengurus Barang Pembantu',
                'effective_from' => $effectiveFrom,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_officials');
    }
};
