<?php

namespace App\Http\Requests\SkpdInventory;

use App\Models\Bap;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HardDeleteBapRequest extends FormRequest
{
    public function authorize(): bool
    {
        $bap = $this->route('bap');

        return $bap instanceof Bap && ($this->user()?->can('hard-delete-bap', $bap) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $bap = $this->route('bap');

        return [
            'confirmation_document_number' => [
                'required',
                'string',
                'max:100',
                Rule::in([$bap instanceof Bap ? $bap->document_number : null]),
            ],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
            'status' => ['prohibited'],
            'loket_id' => ['prohibited'],
            'bap_id' => ['prohibited'],
            'id' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirmation_document_number.required' => 'Nomor dokumen konfirmasi wajib diisi.',
            'confirmation_document_number.in' => 'Nomor dokumen konfirmasi tidak sesuai dengan BAP yang akan dihapus.',
            'reason.required' => 'Alasan penghapusan wajib diisi.',
            'reason.min' => 'Alasan penghapusan minimal 10 karakter.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => trim((string) $this->input('reason')),
        ]);
    }
}
