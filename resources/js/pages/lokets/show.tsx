import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Users } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { ActiveStatusBadge } from '@/components/app/status-badge';
import { formatDateTime, formatQuantity } from '@/components/inventory/format';
import {
    RecentActivityCard,
    type ActivityEntry,
} from '@/components/inventory/recent-activity-card';
import { LoketDeleteDialog } from '@/components/lokets/loket-delete-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { edit, index, show } from '@/routes/lokets';
import { edit as userEdit, show as userShow } from '@/routes/users';

type AssignedUser = {
    id: number;
    username: string;
    name: string;
    nip: string | null;
    role: string;
    role_label: string;
    is_active: boolean;
};

type Props = {
    loket: {
        id: number;
        code: string;
        name: string;
        description: string | null;
        is_active: boolean;
        users_count: number;
        allocations_count: number;
        baps_count: number;
        created_at: string;
        can: { delete: boolean };
        users: AssignedUser[];
        timeline: ActivityEntry[];
    };
};

const userColumns: DataTableColumn<AssignedUser>[] = [
    {
        id: 'name',
        header: 'Nama',
        cell: (user) => user.name,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'username',
        header: 'Username',
        cell: (user) => user.username,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (user) => <ActiveStatusBadge active={user.is_active} />,
        mobile: 'badge',
    },
    {
        id: 'nip',
        header: 'NIP',
        cell: (user) => user.nip ?? '—',
        mono: true,
    },
    {
        id: 'role',
        header: 'Role',
        cell: (user) => user.role_label,
    },
];

export default function ShowLoket({ loket }: Props) {
    return (
        <>
            <Head title={loket.name} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Master Loket' }}
                    title={loket.name}
                    badges={<ActiveStatusBadge active={loket.is_active} />}
                    meta={
                        <p className="text-muted-foreground font-mono text-sm">
                            {loket.code}
                        </p>
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={edit(loket.id)}>
                                    <Pencil />
                                    Ubah Loket
                                </Link>
                            </Button>
                            {loket.can.delete ? (
                                <LoketDeleteDialog loket={loket} />
                            ) : null}
                        </>
                    }
                />

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identitas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Kode"
                                    value={loket.code}
                                    mono
                                />
                                <DetailRow
                                    label="Status"
                                    value={
                                        <ActiveStatusBadge
                                            active={loket.is_active}
                                        />
                                    }
                                />
                                <DetailRow
                                    label="Dibuat pada"
                                    value={formatDateTime(loket.created_at)}
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat penggunaan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Pengguna ditugaskan"
                                    value={formatQuantity(loket.users_count)}
                                    numeric
                                />
                                <DetailRow
                                    label="Alokasi"
                                    value={formatQuantity(
                                        loket.allocations_count,
                                    )}
                                    numeric
                                />
                                <DetailRow
                                    label="BAP"
                                    value={formatQuantity(loket.baps_count)}
                                    numeric
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Keterangan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm leading-6 break-words">
                                {loket.description ?? 'Tidak ada keterangan.'}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="text-muted-foreground size-4" />
                            Pengguna yang ditugaskan
                        </CardTitle>
                        <CardDescription>
                            Petugas yang bekerja atas nama Loket ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={loket.users}
                            columns={userColumns}
                            getRowKey={(user) => user.id}
                            rowHref={(user) => userShow(user.id)}
                            breakpoint="md"
                            caption={`Pengguna yang ditugaskan pada ${loket.name}`}
                            actions={(user) => (
                                <>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={userEdit(user.id)}
                                            aria-label={`Ubah ${user.name}`}
                                            title="Ubah pengguna"
                                        >
                                            <Pencil />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={userShow(user.id)}
                                            aria-label={`Lihat ${user.name}`}
                                            title="Lihat detail"
                                        >
                                            <Eye />
                                        </Link>
                                    </Button>
                                </>
                            )}
                            empty={
                                <EmptyState
                                    icon={Users}
                                    title="Belum ada pengguna yang ditugaskan."
                                    description="Tetapkan Loket ini pada akun Petugas Loket melalui menu Pengguna."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <RecentActivityCard entries={loket.timeline} />
            </div>
        </>
    );
}

ShowLoket.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Master Loket', href: index() },
        { title: props.loket.name, href: show(props.loket.id) },
    ],
});
