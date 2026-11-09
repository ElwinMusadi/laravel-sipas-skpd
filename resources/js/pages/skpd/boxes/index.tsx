import { Head, Link } from '@inertiajs/react';
import { Boxes, Eye, Pencil, Plus } from 'lucide-react';
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
    BoxStatusBadge,
    boxStatusOptions,
} from '@/components/inventory/box-status-badge';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import type {
    BoxStatus,
    LoketOption,
    SkpdBoxSummary,
} from '@/components/inventory/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { create, edit, index, show } from '@/routes/skpd/boxes';

type Props = {
    boxes: Paginator & { data: SkpdBoxSummary[] };
    filters: {
        search?: string;
        status?: BoxStatus;
        loket?: number | string;
    };
    lokets: LoketOption[];
    can: { create: boolean };
};

const columns: DataTableColumn<SkpdBoxSummary>[] = [
    {
        id: 'box_number',
        header: 'Nomor Box',
        cell: (box) => box.box_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (box) => formatRange(box.numerator_start, box.numerator_end),
        mono: true,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (box) => <BoxStatusBadge status={box.status} />,
        mobile: 'badge',
        className: 'min-w-36',
    },
    {
        id: 'total',
        header: 'Total',
        cell: (box) => formatQuantity(box.total_sets),
        numeric: true,
    },
    {
        id: 'allocated',
        header: 'Dialokasikan',
        cell: (box) => formatQuantity(box.allocated_quantity),
        numeric: true,
    },
    {
        id: 'available',
        header: 'Tersedia',
        cell: (box) => formatQuantity(box.available_quantity),
        numeric: true,
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (box) => box.loket?.name ?? '—',
    },
    {
        id: 'received_at',
        header: 'Diterima',
        cell: (box) => formatDate(box.received_at),
        className: 'whitespace-nowrap',
    },
];

export default function BoxIndex({ boxes, filters, lokets, can }: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        status: filters.status ?? '',
        loket: filters.loket ? String(filters.loket) : '',
    });

    return (
        <>
            <Head title="Box SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Box SKPD"
                    description="Persediaan pusat per Box beserta rentang Nomerator dan jumlah set yang masih tersedia."
                    actions={
                        can.create ? (
                            <Button asChild>
                                <Link href={create()}>
                                    <Plus />
                                    Tambah Box
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
                        id="box-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Nomor Box"
                    />
                    <FilterSelect
                        id="box-status"
                        label="Status"
                        value={filterForm.values.status}
                        onChange={(value) => filterForm.set('status', value)}
                        options={boxStatusOptions}
                        allLabel="Semua status"
                    />
                    <FilterSelect
                        id="box-loket"
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
                            rows={boxes.data}
                            columns={columns}
                            getRowKey={(box) => box.id}
                            rowHref={(box) => show(box.id)}
                            minWidthClassName="min-w-240"
                            caption="Daftar Box SKPD"
                            actions={(box) => (
                                <>
                                    {can.create ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                        >
                                            <Link
                                                href={edit(box.id)}
                                                aria-label={`Ubah ${box.box_number}`}
                                                title="Ubah metadata"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(box.id)}
                                            aria-label={`Lihat ${box.box_number}`}
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
                                        title="Tidak ada Box yang cocok."
                                        description="Ubah kata kunci, status, atau Loket, atau reset filter untuk melihat semua Box."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={Boxes}
                                        title="Belum ada Box SKPD."
                                        description="Box yang diterima Bendahara Barang akan muncul pada daftar ini."
                                        action={
                                            can.create ? (
                                                <Button asChild>
                                                    <Link href={create()}>
                                                        <Plus />
                                                        Tambah Box
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

                <ListFooter paginator={boxes} noun="Box" />
            </div>
        </>
    );
}

BoxIndex.layout = {
    breadcrumbs: [{ title: 'Box SKPD', href: index() }],
};
