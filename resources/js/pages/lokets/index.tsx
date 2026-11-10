import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Plus, Store } from 'lucide-react';
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
import { formatQuantity } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { create, edit, index, show } from '@/routes/lokets';

type Loket = {
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
};

type Props = {
    lokets: Paginator & { data: Loket[] };
    filters: { search?: string; status?: 'active' | 'inactive' };
};

const activeStatusOptions = statusOptions(activeStatusMeta);

const columns: DataTableColumn<Loket>[] = [
    {
        id: 'name',
        header: 'Nama Loket',
        cell: (loket) => (
            <>
                <span className="font-medium">{loket.name}</span>
                {loket.description ? (
                    <span className="text-muted-foreground block max-w-md truncate text-xs font-normal">
                        {loket.description}
                    </span>
                ) : null}
            </>
        ),
        mobile: 'title',
    },
    {
        id: 'code',
        header: 'Kode',
        cell: (loket) => loket.code,
        mono: true,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        status: true,
        header: 'Status',
        cell: (loket) => <ActiveStatusBadge active={loket.is_active} />,
        mobile: 'badge',
    },
    {
        id: 'users',
        header: 'Pengguna',
        cell: (loket) => formatQuantity(loket.users_count),
        numeric: true,
    },
    {
        id: 'allocations',
        header: 'Alokasi',
        cell: (loket) => formatQuantity(loket.allocations_count),
        numeric: true,
    },
    {
        id: 'baps',
        header: 'BAP',
        cell: (loket) => formatQuantity(loket.baps_count),
        numeric: true,
    },
];

export default function LoketIndex({ lokets, filters }: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    return (
        <>
            <Head title="Master Loket" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Master Loket"
                    description="Kelola kode, nama, status, dan keterangan Loket tanpa mengubah riwayat alokasi atau BAP."
                    actions={
                        <Button asChild>
                            <Link href={create()}>
                                <Plus />
                                Tambah Loket
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
                        id="loket-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Kode atau nama Loket"
                    />
                    <FilterSelect
                        id="loket-status"
                        label="Status"
                        value={filterForm.values.status}
                        onChange={(value) => filterForm.set('status', value)}
                        options={activeStatusOptions}
                        allLabel="Semua status"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={lokets.data}
                            columns={columns}
                            getRowKey={(loket) => loket.id}
                            rowHref={(loket) => show(loket.id)}
                            breakpoint="md"
                            caption="Daftar Loket"
                            actions={(loket) => (
                                <>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={edit(loket.id)}
                                            aria-label={`Ubah ${loket.name}`}
                                            title="Ubah Loket"
                                        >
                                            <Pencil />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(loket.id)}
                                            aria-label={`Lihat ${loket.name}`}
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
                                        title="Tidak ada Loket yang cocok."
                                        description="Ubah kata kunci atau status, atau reset filter untuk melihat semua Loket."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={Store}
                                        title="Belum ada Loket."
                                        description="Tambahkan Loket untuk mulai menugaskan Petugas Loket dan menerima alokasi."
                                        action={
                                            <Button asChild>
                                                <Link href={create()}>
                                                    <Plus />
                                                    Tambah Loket
                                                </Link>
                                            </Button>
                                        }
                                    />
                                )
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={lokets} noun="Loket" />
            </div>
        </>
    );
}

LoketIndex.layout = {
    breadcrumbs: [{ title: 'Master Loket', href: index() }],
};
