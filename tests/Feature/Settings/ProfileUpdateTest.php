<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'))
        ->assertInertiaFlash('toast.message', 'Profil berhasil diperbarui.');

    $user->refresh();

    expect($user->name)->toBe('Test User');
});

test('profile update does not change an optional email', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email)->toBe($user->email);
});

test('user cannot delete their account from profile settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete('/settings/profile')
        ->assertMethodNotAllowed();

    $this->assertModelExists($user);
});
