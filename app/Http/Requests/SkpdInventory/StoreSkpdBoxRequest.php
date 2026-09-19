<?php

namespace App\Http\Requests\SkpdInventory;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSkpdBoxRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manage-skpd-inventory') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'box_number' => ['required', 'string', 'max:50'],
            'numerator_start' => ['required', 'string', 'regex:/^\d{7}$/'],
            'numerator_end' => ['required', 'string', 'regex:/^\d{7}$/'],
            'received_at' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['numerator_start', 'numerator_end'])) {
                    return;
                }

                if ((int) $this->input('numerator_start') < 1) {
                    $validator->errors()->add('numerator_start', 'Nomerator awal minimal 0000001.');

                    return;
                }

                if ((int) $this->input('numerator_end') <= (int) $this->input('numerator_start')) {
                    $validator->errors()->add('numerator_end', 'Nomerator akhir harus lebih besar dari nomerator awal.');
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $boxNumber = $this->input('box_number');

        if (is_string($boxNumber)) {
            $this->merge(['box_number' => trim($boxNumber)]);
        }
    }
}
