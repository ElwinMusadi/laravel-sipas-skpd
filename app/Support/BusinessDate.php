<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Business dates follow local time in Kupang (WITA). Stored timestamps stay in
 * the application timezone (UTC); use this class wherever "today" or the current
 * month is a business decision, such as a service date or a report period.
 */
class BusinessDate
{
    public static function timezone(): string
    {
        return (string) config('app.business_timezone', 'Asia/Makassar');
    }

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::timezone());
    }

    public static function today(): string
    {
        return self::now()->toDateString();
    }
}
