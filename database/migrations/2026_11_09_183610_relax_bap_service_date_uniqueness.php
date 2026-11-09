<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Loket may file a second BAP on the same service date once the previous BAP
     * exhausted its allocation, so the date is no longer unique per Loket. The
     * sequencing rule is enforced by CreateBap/UpdateBap under the inventory lock.
     */
    public function up(): void
    {
        Schema::table('baps', function (Blueprint $table): void {
            $table->index(['loket_id', 'service_date']);
        });

        Schema::table('baps', function (Blueprint $table): void {
            $table->dropUnique(['loket_id', 'service_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('baps', function (Blueprint $table): void {
            $table->unique(['loket_id', 'service_date']);
        });

        Schema::table('baps', function (Blueprint $table): void {
            $table->dropIndex(['loket_id', 'service_date']);
        });
    }
};
