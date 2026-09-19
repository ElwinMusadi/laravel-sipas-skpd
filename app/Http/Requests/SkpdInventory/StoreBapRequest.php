<?php

namespace App\Http\Requests\SkpdInventory;

use App\BapCancellationReason;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBapRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create-bap') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $actor = $this->user();
        $isGlobalAdministrator = $actor instanceof User && $actor->isGlobalAdministrator();

        $newReasons = array_map(fn (BapCancellationReason $r): string => $r->value, BapCancellationReason::forNewEntry());

        return [
            'loket_id' => $isGlobalAdministrator
                ? ['required', 'integer', 'exists:lokets,id']
                : ['prohibited'],
            'service_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'numerator_start' => ['required', 'string', 'regex:/^\d{7}$/'],
            'numerator_end' => ['required', 'string', 'regex:/^\d{7}$/'],
            'online_usage_count' => ['required', 'integer', 'min:0'],
            'cancellation_count' => ['required', 'integer', 'min:0'],
            'status' => ['prohibited'],
            'total_usage' => ['prohibited'],

            // Cancellation detail rows — required when cancellation_count >= 1
            'cancellations' => ['array'],
            'cancellations.*.numerator' => ['required', 'string', 'regex:/^\d{1,7}$/'],
            'cancellations.*.reason' => ['required', Rule::in($newReasons)],
            'cancellations.*.description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['numerator_start', 'numerator_end', 'online_usage_count', 'cancellation_count'])) {
                return;
            }

            $numeratorStart = (int) $this->input('numerator_start');
            $numeratorEnd = (int) $this->input('numerator_end');
            $onlineUsageCount = (int) $this->input('online_usage_count');
            $cancellationCount = (int) $this->input('cancellation_count');

            if ($numeratorStart < 1) {
                $validator->errors()->add('numerator_start', 'Nomerator awal minimal 0000001.');

                return;
            }

            if ($numeratorEnd < $numeratorStart) {
                $validator->errors()->add('numerator_end', 'Nomerator akhir harus sama dengan atau lebih besar dari nomerator awal.');

                return;
            }

            $totalUsage = $numeratorEnd - $numeratorStart + 1;

            if ($onlineUsageCount > $totalUsage) {
                $validator->errors()->add('online_usage_count', 'Jumlah SKPD online tidak boleh melebihi total pemakaian.');

                return;
            }

            if ($cancellationCount > $totalUsage) {
                $validator->errors()->add('cancellation_count', 'Jumlah SKPD Batal/Rusak tidak boleh melebihi total pemakaian.');

                return;
            }

            if ($onlineUsageCount + $cancellationCount > $totalUsage) {
                $validator->errors()->add('cancellation_count', 'Jumlah SKPD Online dan Batal/Rusak tidak boleh melebihi total pemakaian.');

                return;
            }

            // Count/detail consistency (detail item count must equal cancellation_count)
            $detailCount = count((array) $this->input('cancellations', []));
            if ($detailCount !== $cancellationCount) {
                $validator->errors()->add('cancellation_count', 'Jumlah SKPD Batal/Rusak harus sama dengan jumlah detail yang diisi.');
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cancellations.*.numerator.regex' => 'Nomerator harus berupa angka maksimal tujuh digit.',
            'cancellations.*.reason.required' => 'Pilih alasan batal atau rusak.',
            'cancellations.*.reason.in' => 'Alasan tidak valid.',
        ];
    }
}
