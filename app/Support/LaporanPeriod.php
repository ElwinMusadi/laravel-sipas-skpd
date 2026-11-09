<?php

namespace App\Support;

use App\Models\Loket;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * The month, year, and optional Loket filter of a Laporan Sistem report.
 *
 * Report months are business months in WITA. Date columns (service_date,
 * allocation_date) compare against the local dates, while stored timestamps
 * compare against the local boundaries converted to the application timezone.
 */
final class LaporanPeriod
{
    /** @var array<int, string> */
    private const MONTH_NAMES = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    public function __construct(
        public readonly int $month,
        public readonly int $year,
        public readonly ?int $loketId,
    ) {}

    /**
     * @return array{month: int, year: int, loket: int|null}
     */
    public function filters(): array
    {
        return [
            'month' => $this->month,
            'year' => $this->year,
            'loket' => $this->loketId,
        ];
    }

    public function label(): string
    {
        return self::MONTH_NAMES[$this->month].' '.$this->year;
    }

    /**
     * Get the first moment of the month in WITA.
     */
    public function start(): CarbonImmutable
    {
        return CarbonImmutable::create($this->year, $this->month, 1, 0, 0, 0, BusinessDate::timezone())
            ->startOfDay();
    }

    /**
     * Get the last moment of the month in WITA.
     */
    public function end(): CarbonImmutable
    {
        return $this->start()->endOfMonth();
    }

    public function startDate(): string
    {
        return $this->start()->toDateString();
    }

    public function endDate(): string
    {
        return $this->end()->toDateString();
    }

    /**
     * Convert a business moment to the application timezone used by stored timestamps.
     */
    public static function storedTime(CarbonInterface $moment): CarbonImmutable
    {
        return CarbonImmutable::instance($moment)->setTimezone((string) config('app.timezone', 'UTC'));
    }

    /**
     * Convert a stored timestamp to WITA for display.
     */
    public static function businessTime(?CarbonInterface $moment): ?CarbonImmutable
    {
        return $moment === null
            ? null
            : CarbonImmutable::instance($moment)->setTimezone(BusinessDate::timezone());
    }

    public static function formatDate(CarbonInterface $date): string
    {
        return $date->day.' '.self::MONTH_NAMES[$date->month].' '.$date->year;
    }

    public function selectedLoketName(): ?string
    {
        if ($this->loketId === null) {
            return null;
        }

        $name = Loket::query()->whereKey($this->loketId)->value('name');

        return is_string($name) ? $name : null;
    }

    public function filename(string $prefix, string $extension): string
    {
        return $prefix.'-'.strtolower(self::MONTH_NAMES[$this->month]).'-'.$this->year.'.'.$extension;
    }
}
