<?php

namespace App\Http\Requests\SkpdInventory;

use App\BapCancellationReason;
use App\Models\Bap;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBapCancellationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $bap = $this->route('bap');

        return $bap instanceof Bap && ($this->user()?->can('create-bap-cancellation', $bap) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bap_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'loket_id' => ['prohibited'],
            'service_date' => ['prohibited'],
            'status' => ['prohibited'],
            'total_usage' => ['prohibited'],
            'numerator' => ['required', 'string', 'regex:/^\d{1,7}$/'],
            'reason' => ['required', Rule::enum(BapCancellationReason::class)],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get the custom validation messages that apply to the request.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'numerator.regex' => 'Nomerator harus berupa angka maksimal tujuh digit.',
            'reason.required' => 'Pilih klasifikasi batal atau rusak.',
        ];
    }
}
