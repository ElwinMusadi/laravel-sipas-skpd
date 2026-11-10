import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Plus, UsersRound } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import {
    FilterBar,
    FilterSearch,
    FilterSelect,
} from '@/components/app/filter-bar';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { PageHeader } from '@/components/app/page-header';
import {
    ActiveStatusBadge,
    activeStatusMeta,
    statusOptions,
} from '@/components/app/status-badge';
import { formatDateTime } from '@/components/inventory/format';
import type {
    LoketOption,
    RoleOption,
} from '@/components/users/user-form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { create, edit, index, show } from '@/routes/users';

type ManagedUserRow = {
    id: number;
    username: string;
    name: string;
    nip: string;
    role: string;
    role_label: string;
    loket: LoketOption | null;
    is_active: boolean;
    last_login_at: string | null;
};

type Props = {
    users: Paginator & { data: ManagedUserRow[] };
    filters: {
        search?: string;
        role?: string;
        status?: 'active' | 'inactive';
        loket?: number | string;
    };
    roles: RoleOption[];
    lokets: LoketOption[];
};

const activeStatusOptions = statusOptions(activeStatusMeta);

const columns: DataTableColumn<ManagedUserRow>[] = [
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
        status: true,
        header: 'Status',
        cell: (user) => <ActiveStatusBadge active={user.is_active} />,
        mobile: 'badge',
    },
    {
        id: 'nip',
        wideOnly: true,
        header: 'NIP',
        cell: (user) => user.nip,
        mono: true,
    },
    {
        id: 'role',
        header: 'Role',
        cell: (user) => user.role_label,
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (user) => user.loket?.name ?? '—',
    },
    {
        id: 'last_login_at',
        wideOnly: true,
        header: 'Login terakhir',
        cell: (user) =>
            user.last_login_at
                ? formatDateTime(user.last_login_at)
                : 'Belum pernah',
        className: 'text-muted-foreground whitespace-nowrap',
    },
];

export default function UserIndex({ users, filters, roles, lokets }: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        role: filters.role ?? '',
        status: filters.status ?? '',
        loket: filters.loket ? String(filters.loket) : '',
    });

    return (
        <>
            <Head title="Pengguna" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Manajemen Pengguna"
                    description="Kelola akun, role, status, dan penugasan Loket pengguna SIPAS-SKPD."
                    actions={
                        <Button asChild>
                            <Link href={create()}>
                                <Plus />
                                Tambah pengguna
                            </Link>
                        </Button>
                    }
                />

                <FilterBar
                    onSubmit={filterForm.apply}
                    onReset={filterForm.reset}
                    activeCount={filterForm.activeCount}
                >
                    <FilterSearch
                        id="user-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Username, nama, atau NIP"
                    />
                    <FilterSelect
                        id="user-role"
                        label="Role"
                        value={filterForm.values.role}
                        onChange={(value) => filterForm.set('role', value)}
                        options={roles}
                        allLabel="Semua role"
                    />
                    <FilterSelect
                        id="user-status"
                        label="Status"
                        value={filterForm.values.status}
                        onChange={(value) => filterForm.set('status', value)}
                        options={activeStatusOptions}
                        allLabel="Semua status"
                    />
                    <FilterSelect
                        id="user-loket"
                        label="Loket"
                        value={filterForm.values.loket}
                        onChange={(value) => filterForm.set('loket', value)}
                        options={lokets.map((loket) => ({
                            value: loket.id.toString(),
                            label: loket.name,
                        }))}
                        allLabel="Semua Loket"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={users.data}
                            columns={columns}
                            getRowKey={(user) => user.id}
                            rowHref={(user) => show(user.id)}
                            minWidthClassName="min-w-240"
                            caption="Daftar pengguna"
                            actions={(user) => (
                                <>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={edit(user.id)}
                                            aria-label={`Ubah ${user.name}`}
                                            title="Ubah pengguna"
                                        >
                                            <Pencil />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(user.id)}
                                            aria-label={`Lihat ${user.name}`}
                                            title="Lihat detail"
                                        >
                                            <Eye />
                                        </Link>
                                    </Button>
                                </>
                            )}
                            empty={
                                filterForm.activeCount > 0 ? (
                                    <EmptyState
                                        title="Tidak ada pengguna yang cocok."
                                        description="Ubah kata kunci, role, status, atau Loket, atau reset filter untuk melihat semua pengguna."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={UsersRound}
                                        title="Belum ada pengguna."
                                        description="Akun yang dibuat Superadmin akan muncul pada daftar ini."
                                        action={
                                            <Button asChild>
                                                <Link href={create()}>
                                                    <Plus />
                                                    Tambah pengguna
                                                </Link>
                                            </Button>
                                        }
                                    />
                                )
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={users} noun="pengguna" />
            </div>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [{ title: 'Pengguna', href: index() }],
};
