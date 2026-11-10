import { Head, Link } from '@inertiajs/react';
import { ArrowRightLeft, Eye, Pencil, Plus } from 'lucide-react';
import {
    AllocationStatusBadge,
    allocationStatusOptions,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
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
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { create, edit, index, show } from '@/routes/skpd/allocations';

type Allocation = {
    id: number;
    box: { id: number; box_number: string };
    loket: { id: number; name: string };
    allocation_date: string | null;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
    used_quantity: number;
    remaining_quantity: number;
    status: AllocationStatus;
    created_by: string;
    created_at: string;
    accepted_by: string | null;
    accepted_at: string | null;
    can: {
        accept: boolean;
        edit: boolean;
        cancel: boolean;
        return_remainder: boolean;
    };
};

type Props = {
    allocations: Paginator & { data: Allocation[] };
    filters: { search?: string; status?: AllocationStatus };
    can: { create: boolean };
};

const columns: DataTableColumn<Allocation>[] = [
    {
        id: 'box',
        header: 'Box',
        cell: (allocation) => allocation.box.box_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (allocation) => allocation.loket.name,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        status: true,
        header: 'Status',
        cell: (allocation) => (
            <AllocationStatusBadge status={allocation.status} />
        ),
        mobile: 'badge',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (allocation) =>
            formatRange(allocation.numerator_start, allocation.numerator_end),
        mono: true,
    },
    {
        id: 'quantity',
        header: 'Jumlah',
        cell: (allocation) => formatQuantity(allocation.quantity),
        numeric: true,
    },
    {
        id: 'remaining',
        header: 'Sisa',
        cell: (allocation) => formatQuantity(allocation.remaining_quantity),
        numeric: true,
    },
    {
        id: 'allocation_date',
        wideOnly: true,
        header: 'Tanggal alokasi',
        cell: (allocation) =>
            allocation.allocation_date
                ? formatDate(allocation.allocation_date)
                : 'Belum tercatat',
        className: 'whitespace-nowrap',
    },
    {
        id: 'accepted',
        wideOnly: true,
        header: 'Diterima oleh',
        cell: (allocation) =>
            allocation.accepted_at ? (
                <>
                    {allocation.accepted_by ?? '—'}
                    <span className="text-muted-foreground block text-xs">
                        {formatDateTime(allocation.accepted_at)}
                    </span>
                </>
            ) : (
                <span className="text-muted-foreground">Belum diterima</span>
            ),
    },
];

export default function AllocationIndex({ allocations, filters, can }: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    return (
        <>
            <Head title="Distribusi / Alokasi" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Distribusi / Alokasi SKPD"
                    description="Pantau alokasi Bukti SKPD dari pusat ke Loket: yang masih menunggu diterima Petugas Loket, yang sedang dipakai, hingga yang sudah selesai."
                    actions={
                        can.create ? (
                            <Button asChild>
                                <Link href={create()}>
                                    <Plus />
                                    Buat alokasi
                                </Link>
                            </Button>
                        ) : null
                    }
                />

                <FilterBar
                    onSubmit={filterForm.apply}
                    onReset={filterForm.reset}
                    activeCount={filterForm.activeCount}
                >
                    <FilterSearch
                        id="allocation-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Nomor Box atau nama Loket"
                    />
                    <FilterSelect
                        id="allocation-status"
                        label="Status"
                        value={filterForm.values.status}
                        onChange={(value) => filterForm.set('status', value)}
                        options={allocationStatusOptions}
                        allLabel="Semua status"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={allocations.data}
                            columns={columns}
                            getRowKey={(allocation) => allocation.id}
                            rowHref={(allocation) => show(allocation.id)}
                            minWidthClassName="min-w-240"
                            caption="Daftar alokasi SKPD"
                            actions={(allocation) => (
                                <>
                                    {allocation.can.edit ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                        >
                                            <Link
                                                href={edit(allocation.id)}
                                                aria-label={`Ubah alokasi ${allocation.box.box_number} untuk ${allocation.loket.name}`}
                                                title="Ubah alokasi"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(allocation.id)}
                                            aria-label={`Lihat alokasi ${allocation.box.box_number} untuk ${allocation.loket.name}`}
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
                                        title="Tidak ada alokasi yang cocok."
                                        description="Ubah kata kunci atau status, atau reset filter untuk melihat semua alokasi."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={ArrowRightLeft}
                                        title="Belum ada alokasi SKPD."
                                        description="Alokasi yang dibuat Bendahara Barang untuk Loket akan tampil pada daftar ini."
                                        action={
                                            can.create ? (
                                                <Button asChild>
                                                    <Link href={create()}>
                                                        <Plus />
                                                        Buat alokasi
                                                    </Link>
                                                </Button>
                                            ) : null
                                        }
                                    />
                                )
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={allocations} noun="alokasi" />
            </div>
        </>
    );
}

AllocationIndex.layout = {
    breadcrumbs: [{ title: 'Distribusi / Alokasi', href: index() }],
};
