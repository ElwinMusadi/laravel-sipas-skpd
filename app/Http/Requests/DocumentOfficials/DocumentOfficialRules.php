<?php

namespace App\Http\Requests\DocumentOfficials;

use Illuminate\Validation\Rules\Unique;

/**
 * Validation shared by creating and correcting a BAP document official.
 */
final class DocumentOfficialRules
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public static function fields(Unique $uniqueEffectiveDate): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'nip' => ['nullable', 'string', 'max:32', 'regex:/^[0-9 ]+$/'],
            'rank' => ['nullable', 'string', 'max:100'],
            'position' => ['required', 'string', 'min:3', 'max:255'],
            'effective_from' => ['required', 'date_format:Y-m-d', $uniqueEffectiveDate],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'name.required' => 'Nama pejabat wajib diisi.',
            'nip.regex' => 'NIP hanya boleh berisi angka dan spasi.',
            'position.required' => 'Jabatan wajib diisi.',
            'effective_from.required' => 'Tanggal mulai berlaku wajib diisi.',
            'effective_from.unique' => 'Peran ini sudah memiliki pejabat dengan tanggal mulai berlaku yang sama.',
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, string|null>
     */
    public static function normalize(array $input): array
    {
        $normalized = [];

        foreach (['name', 'nip', 'rank', 'position'] as $field) {
            if (array_key_exists($field, $input)) {
                $value = trim((string) $input[$field]);
                $normalized[$field] = $value === '' ? null : $value;
            }
        }

        return $normalized;
    }
}
