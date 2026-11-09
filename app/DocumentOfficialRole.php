<?php

namespace App;

/**
 * Signature slots on the official BAP SKPD document.
 */
enum DocumentOfficialRole: string
{
    case FirstParty = 'first_party';
    case SecondParty = 'second_party';
    case Head = 'head';
    case ThirdParty = 'third_party';

    public function label(): string
    {
        return match ($this) {
            self::FirstParty => 'Pihak Pertama',
            self::SecondParty => 'Pihak Kedua',
            self::Head => 'Mengetahui (Kepala UPTD)',
            self::ThirdParty => 'Pengurus Barang',
        };
    }
}
