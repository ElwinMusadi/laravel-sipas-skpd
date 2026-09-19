<?php

use App\Support\IndonesianFormalDate;
use Carbon\CarbonImmutable;

test('formats the official BAP date in Indonesian words', function () {
    $formatted = app(IndonesianFormalDate::class)->format(
        CarbonImmutable::create(2026, 8, 31, 9, 0, 0, 'Asia/Makassar'),
    );

    expect($formatted)->toBe([
        'day_name' => 'Senin',
        'date_words' => 'Tiga Puluh Satu',
        'month_name' => 'Agustus',
        'year_words' => 'Dua Ribu Dua Puluh Enam',
    ]);
});

test('spells representative Indonesian date and year boundaries', function (int $number, string $expected) {
    expect(app(IndonesianFormalDate::class)->words($number))->toBe($expected);
})->with([
    [0, 'Nol'],
    [1, 'Satu'],
    [10, 'Sepuluh'],
    [11, 'Sebelas'],
    [21, 'Dua Puluh Satu'],
    [100, 'Seratus'],
    [2000, 'Dua Ribu'],
    [2026, 'Dua Ribu Dua Puluh Enam'],
]);
