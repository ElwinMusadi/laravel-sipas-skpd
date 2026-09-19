<?php

namespace App\Http\Requests\SkpdVerification;

use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CompleteBapVerificationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'result' => ['required', Rule::enum(BapVerificationResult::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'checklist' => ['required', 'array', 'size:5'],
            'checklist.*' => ['required', 'array'],
            'checklist.*.type' => ['required', Rule::enum(BapVerificationChecklistType::class), 'distinct'],
            'checklist.*.is_attested' => ['required', 'accepted'],
            'checklist.*.actual_quantity' => ['nullable', 'integer', 'min:0'],
            'checklist.*.actual_numerator_start' => ['nullable', 'integer', 'between:0,9999999'],
            'checklist.*.actual_numerator_end' => ['nullable', 'integer', 'between:0,9999999'],
            'discrepancies' => ['nullable', 'array'],
            'discrepancies.*' => ['required', 'array'],
            'discrepancies.*.type' => ['required', Rule::enum(BapVerificationChecklistType::class), 'distinct'],
            'discrepancies.*.notes' => ['required', 'string', 'max:1000'],
            'bap_id' => ['prohibited'],
            'status' => ['prohibited'],
            'numerator_start' => ['prohibited'],
            'numerator_end' => ['prohibited'],
            'total_usage' => ['prohibited'],
            'online_usage_count' => ['prohibited'],
            'cancellations' => ['prohibited'],
            'usage_segments' => ['prohibited'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $checklist = $this->input('checklist');

            if (! is_array($checklist)) {
                return;
            }

            foreach ($checklist as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }

                $type = BapVerificationChecklistType::tryFrom((string) ($item['type'] ?? ''));

                if ($type === null) {
                    continue;
                }

                if ($type->usesNumeratorRange()) {
                    $start = $item['actual_numerator_start'] ?? null;
                    $end = $item['actual_numerator_end'] ?? null;

                    if ($start === null || $start === '') {
                        $validator->errors()->add("checklist.{$index}.actual_numerator_start", 'Nomerator fisik awal wajib diisi.');
                    }

                    if ($end === null || $end === '') {
                        $validator->errors()->add("checklist.{$index}.actual_numerator_end", 'Nomerator fisik akhir wajib diisi.');
                    }

                    if (is_numeric($start) && is_numeric($end) && (int) $end < (int) $start) {
                        $validator->errors()->add("checklist.{$index}.actual_numerator_end", 'Nomerator fisik akhir tidak boleh lebih kecil dari nomerator fisik awal.');
                    }

                    continue;
                }

                if (! array_key_exists('actual_quantity', $item) || $item['actual_quantity'] === null || $item['actual_quantity'] === '') {
                    $validator->errors()->add("checklist.{$index}.actual_quantity", 'Nilai fisik wajib diisi.');
                }
            }

            if ($this->input('result') === BapVerificationResult::Discrepancy->value
                && blank($this->input('notes'))) {
                $validator->errors()->add('notes', 'Permintaan klarifikasi dari verifier wajib diisi ketika ditemukan selisih.');
            }
        }];
    }

    /**
     * @return array{
     *     result: string,
     *     notes?: string|null,
     *     checklist: list<array{
     *         type: string,
     *         is_attested: bool,
     *         actual_quantity?: int|null,
     *         actual_numerator_start?: int|null,
     *         actual_numerator_end?: int|null
     *     }>,
     *     discrepancies?: list<array{type: string, notes: string}>
     * }
     */
    public function verificationAttributes(): array
    {
        $attributes = $this->validated();
        $checklist = $attributes['checklist'] ?? [];
        $discrepancies = $attributes['discrepancies'] ?? [];

        if (! is_array($checklist) || ! is_array($discrepancies)) {
            throw new \LogicException('Payload verifikasi tidak valid.');
        }

        $normalizedChecklist = [];

        foreach ($checklist as $item) {
            if (! is_array($item)) {
                throw new \LogicException('Checklist verifikasi tidak valid.');
            }

            $normalizedChecklist[] = [
                'type' => (string) ($item['type'] ?? ''),
                'is_attested' => (bool) ($item['is_attested'] ?? false),
                'actual_quantity' => array_key_exists('actual_quantity', $item) && $item['actual_quantity'] !== null
                    ? (int) $item['actual_quantity']
                    : null,
                'actual_numerator_start' => array_key_exists('actual_numerator_start', $item) && $item['actual_numerator_start'] !== null
                    ? (int) $item['actual_numerator_start']
                    : null,
                'actual_numerator_end' => array_key_exists('actual_numerator_end', $item) && $item['actual_numerator_end'] !== null
                    ? (int) $item['actual_numerator_end']
                    : null,
            ];
        }

        $normalizedDiscrepancies = [];

        foreach ($discrepancies as $discrepancy) {
            if (! is_array($discrepancy)) {
                throw new \LogicException('Temuan selisih tidak valid.');
            }

            $normalizedDiscrepancies[] = [
                'type' => (string) ($discrepancy['type'] ?? ''),
                'notes' => (string) ($discrepancy['notes'] ?? ''),
            ];
        }

        return [
            'result' => (string) ($attributes['result'] ?? ''),
            'notes' => isset($attributes['notes']) ? (string) $attributes['notes'] : null,
            'checklist' => $normalizedChecklist,
            'discrepancies' => $normalizedDiscrepancies,
        ];
    }
}
