<?php

namespace App\Http\Requests\DocumentOfficials;

use App\DocumentOfficialRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentOfficialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manage-document-officials') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::enum(DocumentOfficialRole::class)],
            ...DocumentOfficialRules::fields(
                Rule::unique('document_officials', 'effective_from')->where('role', (string) $this->input('role')),
            ),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return DocumentOfficialRules::messages();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(DocumentOfficialRules::normalize($this->all()));
    }
}
