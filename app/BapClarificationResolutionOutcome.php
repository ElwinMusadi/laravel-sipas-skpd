<?php

namespace App;

enum BapClarificationResolutionOutcome: string
{
    case Resolved = 'resolved';
    case Reopened = 'reopened';
    case ReturnedForCorrection = 'returned_for_correction';

    public function label(): string
    {
        return match ($this) {
            self::Resolved => 'Penyelesaian diterima',
            self::Reopened => 'Perlu klarifikasi ulang',
            self::ReturnedForCorrection => 'Dikembalikan untuk koreksi',
        };
    }
}
