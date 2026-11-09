import { Form, Head, Link } from '@inertiajs/react';
import UserManagementController from '@/actions/App/Http/Controllers/UserManagementController';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import {
    UserFormFields,
    userFormFieldNames,
    type LoketOption,
    type ManagedUser,
    type RoleOption,
} from '@/components/users/user-form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { edit, index, show } from '@/routes/users';

type Props = {
    user: ManagedUser;
    roles: RoleOption[];
    lokets: LoketOption[];
};

export default function EditUser({ user, roles, lokets }: Props) {
    return (
        <>
            <Head title={`Ubah ${user.name}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: show(user.id),
                        label: `Kembali ke ${user.name}`,
                    }}
                    title="Ubah Pengguna"
                    description={`Perbarui data akun, role, status, dan penugasan Loket untuk ${user.name}. Password diubah melalui Reset password di halaman detail.`}
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...UserManagementController.update.form(user.id)}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={userFormFieldNames}
                                        title="Perubahan pengguna belum dapat disimpan."
                                    />
                                    <UserFormFields
                                        user={user}
                                        errors={errors}
                                        roles={roles}
                                        lokets={lokets}
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={show(user.id)}>
                                                Kembali
                                            </Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Simpan perubahan'}
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

EditUser.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Pengguna', href: index() },
        { title: props.user.name, href: show(props.user.id) },
        { title: 'Ubah', href: edit(props.user.id) },
    ],
});
