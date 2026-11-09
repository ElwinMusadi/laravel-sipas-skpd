<?php

namespace App\Http\Requests\SkpdInventory;

use App\Models\SkpdAllocation;
use Illuminate\Foundation\Http\FormRequest;

class ReturnSkpdAllocationRemainderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $allocation = $this->route('skpdAllocation');

        return $allocation instanceof SkpdAllocation
            && ($this->user()?->can('return-skpd-allocation-remainder', $allocation) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
            'numerator_start' => ['prohibited'],
            'numerator_end' => ['prohibited'],
            'quantity' => ['prohibited'],
            'status' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan pengembalian wajib diisi.',
            'reason.min' => 'Alasan pengembalian minimal 10 karakter.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => trim((string) $this->input('reason')),
        ]);
    }
}
