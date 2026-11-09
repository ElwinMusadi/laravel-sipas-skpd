<?php

namespace App\Concerns;

use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Serializes every SKPD inventory mutation on the single `skpd_inventory_locks`
 * row. Call it first inside the action's database transaction.
 */
trait LocksSkpdInventory
{
    protected function lockInventory(): void
    {
        $lock = DB::table('skpd_inventory_locks')
            ->where('id', 1)
            ->lockForUpdate()
            ->first();

        if ($lock === null) {
            throw new LogicException('Kunci transaksi inventaris SKPD tidak tersedia.');
        }
    }
}
