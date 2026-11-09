<?php

namespace App;

enum SkpdAllocationStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Returned = 'returned';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu handover',
            self::Accepted => 'Diterima',
            self::Completed => 'Selesai digunakan',
            self::Cancelled => 'Dibatalkan',
            self::Returned => 'Dikembalikan ke pusat',
        };
    }

    public function isHeldByLoket(): bool
    {
        return in_array($this, [self::Accepted, self::Completed], true);
    }
}
