<?php

namespace Database\Factories;

use App\DocumentOfficialRole;
use App\Models\DocumentOfficial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentOfficial>
 */
class DocumentOfficialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'role' => fake()->randomElement(DocumentOfficialRole::cases()),
            'name' => fake()->name(),
            'nip' => fake()->numerify('######## ###### # ###'),
            'rank' => 'Penata/IIIc',
            'position' => fake()->jobTitle(),
            'effective_from' => fake()->unique()->dateTimeBetween('2027-01-01', '2030-12-31')->format('Y-m-d'),
            'created_by' => null,
        ];
    }
}
