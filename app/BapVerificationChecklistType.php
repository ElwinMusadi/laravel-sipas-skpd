<?php

namespace App;

enum BapVerificationChecklistType: string
{
    case UsageQuantity = 'usage_quantity';
    case Numerator = 'numerator';
    case TindisanSets = 'tindisan_sets';
    case Cancellation = 'cancellation';
    case Online = 'online';

    public function label(): string
    {
        return match ($this) {
            self::UsageQuantity => 'Jumlah SKPD',
            self::Numerator => 'Nomerator',
            self::TindisanSets => 'Jumlah set tindisan',
            self::Cancellation => 'Jumlah SKPD batal/rusak',
            self::Online => 'Jumlah SKPD online',
        };
    }

    public function usesNumeratorRange(): bool
    {
        return $this === self::Numerator;
    }
}
