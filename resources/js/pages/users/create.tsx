import { Form, Head, Link } from '@inertiajs/react';
import UserManagementController from '@/actions/App/Http/Controllers/UserManagementController';
import Heading from '@/components/heading';
import {
    UserFormFields,
    type LoketOption,
    type RoleOption,
} from '@/components/users/user-form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { create, index } from '@/routes/users';

type Props = {
    roles: RoleOption[];
    lokets: LoketOption[];
};

export default function CreateUser({ roles, lokets }: Props) {
    return (
        <>
            <Head title="Tambah Pengguna" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <Heading
                    title="Tambah Pengguna"
                    description="Hanya Superadmin yang dapat membuat akun SIPAS-SKPD. Email bukan credential login."
                />

                <Card className="max-w-3xl">
                    <CardContent className="pt-6">
                        <Form
                            {...UserManagementController.store.form()}
                            resetOnError={['password', 'password_confirmation']}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <UserFormFields
                                        errors={errors}
                                        roles={roles}
                                        lokets={lokets}
                                        includePassword
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Batal</Link>
                                        </Button>
                                        <Button disabled={processing}>
                                            Buat pengguna
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}

CreateUser.layout = {
    breadcrumbs: [
        { title: 'Pengguna', href: index() },
        { title: 'Tambah pengguna', href: create() },
    ],
};
