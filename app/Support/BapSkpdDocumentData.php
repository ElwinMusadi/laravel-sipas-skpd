<?php

namespace App\Support;

use App\BapCancellationReason;
use App\Models\Bap;
use App\Models\BapCancellation;
use Carbon\CarbonImmutable;

class BapSkpdDocumentData
{
    public function __construct(private readonly IndonesianFormalDate $formalDate) {}

    /**
     * @return array{
     *     documentNumber: string,
     *     filename: string,
     *     formalDate: array{day_name: string, date_words: string, month_name: string, year_words: string},
     *     totalUsage: int,
     *     numeratorStart: string,
     *     numeratorEnd: string,
     *     cancellationCount: int,
     *     cancellations: list<array{number: int, numerator: string, reason: string, description: string|null, statement: string}>,
     *     institution: array<string, mixed>,
     *     officials: array<string, mixed>
     * }
     */
    public function for(Bap $bap): array
    {
        $timezone = (string) config('bap-document.timezone', 'Asia/Makassar');
        $createdAt = CarbonImmutable::instance($bap->created_at)->setTimezone($timezone);

        /** @var list<array{number: int, numerator: string, reason: string, description: string|null, statement: string}> $cancellations */
        $cancellations = $bap->cancellations
            ->sortBy('numerator')
            ->values()
            ->map(fn (BapCancellation $cancellation, int $index): array => [
                'number' => $index + 1,
                'numerator' => $this->numerator($cancellation->numerator),
                'reason' => $cancellation->reason->label(),
                'description' => $cancellation->description,
                'statement' => $this->cancellationStatement($cancellation),
            ])
            ->all();

        return [
            'documentNumber' => $bap->document_number,
            'filename' => $this->filename($bap->document_number),
            'formalDate' => $this->formalDate->format($createdAt),
            'totalUsage' => $bap->total_usage,
            'numeratorStart' => $this->numerator($bap->numerator_start),
            'numeratorEnd' => $this->numerator($bap->numerator_end),
            'cancellationCount' => count($cancellations),
            'cancellations' => $cancellations,
            'institution' => (array) config('bap-document.institution', []),
            'officials' => (array) config('bap-document.officials', []),
        ];
    }

    private function numerator(int $value): string
    {
        return str_pad((string) $value, 7, '0', STR_PAD_LEFT);
    }

    private function filename(string $documentNumber): string
    {
        $safeNumber = preg_replace('/[^A-Za-z0-9]+/', '-', $documentNumber);

        return 'BAP-SKPD-'.trim((string) $safeNumber, '-').'.pdf';
    }

    private function cancellationStatement(BapCancellation $cancellation): string
    {
        $description = trim((string) $cancellation->description);

        if ($cancellation->reason === BapCancellationReason::Custom && $description !== '') {
            return $description;
        }

        if ($description !== '') {
            return $cancellation->reason->label().' — '.$description;
        }

        return $cancellation->reason->label();
    }
}
