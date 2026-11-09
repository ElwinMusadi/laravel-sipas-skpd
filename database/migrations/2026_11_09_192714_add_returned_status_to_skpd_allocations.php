<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Allow the "returned" status for an accepted allocation whose unused range was
     * withdrawn back to central storage before any of it was used.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE skpd_allocations DROP CHECK skpd_allocations_status_check');
        DB::statement("ALTER TABLE skpd_allocations ADD CONSTRAINT skpd_allocations_status_check CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'returned'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE skpd_allocations DROP CHECK skpd_allocations_status_check');
        DB::statement("ALTER TABLE skpd_allocations ADD CONSTRAINT skpd_allocations_status_check CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled'))");
    }
};
