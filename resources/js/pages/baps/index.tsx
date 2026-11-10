import { Head, Link } from '@inertiajs/react';
import { Eye, FileText, Pencil, Plus } from 'lucide-react';
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
    BapStatusBadge,
    bapStatusOptions,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { create, edit, index, show } from '@/routes/baps';

type Bap = {
    id: number;
    document_number: string;
    service_date: string;
    loket: { id: number; name: string };
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    cancellation_count: number;
    status: BapStatus;
    created_by: string;
    submitted_at: string | null;
    can: { edit: boolean; submit: boolean };
};

type Props = {
    baps: Paginator & { data: Bap[] };
    filters: { search?: string; status?: BapStatus };
    can: { create: boolean };
};

const columns: DataTableColumn<Bap>[] = [
    {
        id: 'document_number',
        header: 'Nomor BAP',
        cell: (bap) => bap.document_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'service_date',
        header: 'Tanggal · Loket',
        cell: (bap) => (
            <>
                <span className="block whitespace-nowrap">
                    {formatDate(bap.service_date)}
                </span>
                <span className="text-muted-foreground block text-xs">
                    {bap.loket.name}
                </span>
            </>
        ),
        mobile: 'subtitle',
    },
    {
        id: 'status',
        status: true,
        header: 'Status',
        cell: (bap) => <BapStatusBadge status={bap.status} />,
        mobile: 'badge',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (bap) => formatRange(bap.numerator_start, bap.numerator_end),
        mono: true,
    },
    {
        id: 'total',
        header: 'Total',
        cell: (bap) => formatQuantity(bap.total_usage),
        numeric: true,
    },
    {
        id: 'online',
        header: 'Online',
        cell: (bap) => formatQuantity(bap.online_usage_count),
        numeric: true,
    },
    {
        id: 'cancellations',
        header: 'Batal/Rusak',
        cell: (bap) => formatQuantity(bap.cancellation_count),
        numeric: true,
    },
    {
        id: 'created_by',
        wideOnly: true,
        header: 'Dibuat · Diajukan',
        cell: (bap) => (
            <>
                <span className="block">{bap.created_by}</span>
                <span className="text-muted-foreground block text-xs whitespace-nowrap">
                    {bap.submitted_at
                        ? formatDateTime(bap.submitted_at)
                        : 'Belum diajukan'}
                </span>
            </>
        ),
    },
];

export default function BapIndex({ baps, filters, can }: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    return (
        <>
            <Head title="BAP SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Berita Acara Pemakaian Bukti SKPD"
                    description="Rekap pemakaian Bukti SKPD per Loket dan tanggal pelayanan."
                    actions={
                        can.create ? (
                            <Button asChild>
                                <Link href={create()}>
                                    <Plus />
                                    Buat BAP
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
                        id="bap-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Nomor BAP, Loket, atau pembuat"
                    />
                    <FilterSelect
                        id="bap-status"
                        label="Status"
                        value={filterForm.values.status}
                        onChange={(value) => filterForm.set('status', value)}
                        options={bapStatusOptions}
                        allLabel="Semua status"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={baps.data}
                            columns={columns}
                            getRowKey={(bap) => bap.id}
                            rowHref={(bap) => show(bap.id)}
                            minWidthClassName="min-w-224"
                            caption="Daftar BAP SKPD"
                            actions={(bap) => (
                                <>
                                    {bap.can.edit ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                        >
                                            <Link
                                                href={edit(bap.id)}
                                                aria-label={`Ubah draft ${bap.document_number}`}
                                                title="Ubah draft"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(bap.id)}
                                            aria-label={`Lihat ${bap.document_number}`}
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
                                        title="Tidak ada BAP yang cocok."
                                        description="Ubah kata kunci atau status, atau reset filter untuk melihat semua BAP."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={FileText}
                                        title="Belum ada BAP SKPD."
                                        description="BAP yang dibuat untuk Loket dan tanggal pelayanan akan muncul di sini."
                                        action={
                                            can.create ? (
                                                <Button asChild>
                                                    <Link href={create()}>
                                                        <Plus />
                                                        Buat BAP
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

                <ListFooter paginator={baps} noun="BAP" />
            </div>
        </>
    );
}

BapIndex.layout = {
    breadcrumbs: [{ title: 'BAP SKPD', href: index() }],
};
