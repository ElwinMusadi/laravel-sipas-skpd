import { Form, Head, Link } from '@inertiajs/react';
import UserManagementController from '@/actions/App/Http/Controllers/UserManagementController';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import {
    UserFormFields,
    userFormFieldNames,
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

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Pengguna' }}
                    title="Tambah Pengguna"
                    description="Hanya Superadmin yang dapat membuat akun SIPAS-SKPD. Pengguna masuk dengan username, bukan email."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...UserManagementController.store.form()}
                            resetOnError={['password', 'password_confirmation']}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={userFormFieldNames}
                                        title="Pengguna belum dapat dibuat."
                                    />
                                    <UserFormFields
                                        errors={errors}
                                        roles={roles}
                                        lokets={lokets}
                                        includePassword
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Kembali</Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Buat pengguna'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CreateUser.layout = {
    breadcrumbs: [
        { title: 'Pengguna', href: index() },
        { title: 'Tambah pengguna', href: create() },
    ],
};
