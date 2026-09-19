<?php

namespace App\Support;

use Carbon\CarbonInterface;
use InvalidArgumentException;

class IndonesianFormalDate
{
    /** @var array<int, string> */
    private const DAY_NAMES = [
        0 => 'Minggu',
        1 => 'Senin',
        2 => 'Selasa',
        3 => 'Rabu',
        4 => 'Kamis',
        5 => 'Jumat',
        6 => 'Sabtu',
    ];

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

    /**
     * @return array{day_name: string, date_words: string, month_name: string, year_words: string}
     */
    public function format(CarbonInterface $date): array
    {
        return [
            'day_name' => self::DAY_NAMES[$date->dayOfWeek],
            'date_words' => $this->words($date->day),
            'month_name' => self::MONTH_NAMES[$date->month],
            'year_words' => $this->words($date->year),
        ];
    }

    public function words(int $number): string
    {
        if ($number < 0 || $number > 999_999) {
            throw new InvalidArgumentException('Angka terbilang harus berada pada rentang 0 sampai 999999.');
        }

        if ($number === 0) {
            return 'Nol';
        }

        return $this->titleCase($this->spell($number));
    }

    private function spell(int $number): string
    {
        $units = [
            0 => '',
            1 => 'satu',
            2 => 'dua',
            3 => 'tiga',
            4 => 'empat',
            5 => 'lima',
            6 => 'enam',
            7 => 'tujuh',
            8 => 'delapan',
            9 => 'sembilan',
            10 => 'sepuluh',
            11 => 'sebelas',
        ];

        if ($number < 12) {
            return $units[$number];
        }

        if ($number < 20) {
            return $this->spell($number - 10).' belas';
        }

        if ($number < 100) {
            return trim($this->spell(intdiv($number, 10)).' puluh '.$this->spell($number % 10));
        }

        if ($number < 200) {
            return trim('seratus '.$this->spell($number - 100));
        }

        if ($number < 1_000) {
            return trim($this->spell(intdiv($number, 100)).' ratus '.$this->spell($number % 100));
        }

        if ($number < 2_000) {
            return trim('seribu '.$this->spell($number - 1_000));
        }

        if ($number < 1_000_000) {
            return trim($this->spell(intdiv($number, 1_000)).' ribu '.$this->spell($number % 1_000));
        }

        throw new InvalidArgumentException('Angka terbilang harus berada pada rentang 0 sampai 999999.');
    }

    private function titleCase(string $value): string
    {
        return implode(' ', array_map(
            static fn (string $word): string => ucfirst($word),
            explode(' ', $value),
        ));
    }
}
