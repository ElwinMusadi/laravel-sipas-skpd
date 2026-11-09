import { Form, Head, Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import UserManagementController from '@/actions/App/Http/Controllers/UserManagementController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { ActiveStatusBadge } from '@/components/app/status-badge';
import InputError from '@/components/input-error';
import { formatDateTime } from '@/components/inventory/format';
import PasswordInput from '@/components/password-input';
import type { ManagedUser } from '@/components/users/user-form-fields';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { edit, index, show } from '@/routes/users';

type Props = {
    user: ManagedUser & {
        role_label: string;
        last_login_at: string | null;
    };
};

export default function ShowUser({ user }: Props) {
    return (
        <>
            <Head title={user.name} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Pengguna' }}
                    title={user.name}
                    badges={<ActiveStatusBadge active={user.is_active} />}
                    description={`${user.role_label} · ${user.username}`}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={edit(user.id)}>
                                <Pencil />
                                Ubah pengguna
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi akun</CardTitle>
                            <CardDescription>
                                Password tidak pernah ditampilkan atau dikirim
                                ke halaman ini.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Username"
                                    value={user.username}
                                />
                                <DetailRow
                                    label="Role"
                                    value={user.role_label}
                                />
                                <DetailRow label="NIP" value={user.nip} mono />
                                <DetailRow
                                    label="Loket"
                                    value={
                                        user.loket?.name ?? 'Tidak ditetapkan'
                                    }
                                />
                                <DetailRow
                                    label="Status"
                                    value={
                                        <ActiveStatusBadge
                                            active={user.is_active}
                                        />
                                    }
                                />
                                <DetailRow
                                    label="Login terakhir"
                                    value={
                                        user.last_login_at
                                            ? formatDateTime(user.last_login_at)
                                            : 'Belum pernah'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Reset password</CardTitle>
                            <CardDescription>
                                Tetapkan password sementara baru tanpa melihat
                                password lama.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...UserManagementController.resetPassword.form(
                                    user.id,
                                )}
                                resetOnError={[
                                    'password',
                                    'password_confirmation',
                                ]}
                                resetOnSuccess
                                className="space-y-5"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">
                                                Password sementara
                                            </Label>
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                required
                                                autoComplete="new-password"
                                                placeholder="Masukkan password baru"
                                                aria-invalid={Boolean(
                                                    errors.password,
                                                )}
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password_confirmation">
                                                Konfirmasi password
                                            </Label>
                                            <PasswordInput
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                required
                                                autoComplete="new-password"
                                                placeholder="Ulangi password baru"
                                                aria-invalid={Boolean(
                                                    errors.password_confirmation,
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.password_confirmation
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Reset password'}
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ShowUser.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Pengguna', href: index() },
        { title: props.user.name, href: show(props.user.id) },
    ],
});
