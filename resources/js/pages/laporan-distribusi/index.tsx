import { Head } from '@inertiajs/react';
import {
    AllocationStatusBadge,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { LaporanFilterCard } from '@/components/laporan/laporan-filter-card';
import {
    formatLaporanPeriod,
    laporanQuery,
    type LaporanFilters,
    type LaporanLoketOption,
} from '@/components/laporan/laporan-filters';
import { LaporanHeader } from '@/components/laporan/laporan-header';
import {
    LaporanRecapTable,
    type LaporanRecapColumn,
} from '@/components/laporan/laporan-recap-table';
import { LaporanSummaryCard } from '@/components/laporan/laporan-summary-card';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { index, pdf, xlsx } from '@/routes/laporan-distribusi';

type DistribusiRow = {
    id: number;
    allocation_date: string;
    box_number: string;
    loket: string;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
    status: AllocationStatus;
    status_label: string;
    created_by: string;
    accepted_by: string | null;
    accepted_at: string | null;
};

type StatusTotal = {
    status: AllocationStatus;
    label: string;
    total_allocations: number;
    total_sets: number;
};

type DistribusiLoketRecap = {
    loket_id: number;
    loket: string;
    distributed_allocations: number;
    distributed_sets: number;
    pending_sets: number;
    received_sets: number;
    cancelled_sets: number;
    returned_sets: number;
};

type Summary = {
    distributed_allocations: number;
    distributed_sets: number;
    received_sets: number;
    statuses: StatusTotal[];
};

type Props = {
    allocations: Paginator & { data: DistribusiRow[] };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    summary: Summary;
    loket_recaps: DistribusiLoketRecap[];
};

const allocationColumns: DataTableColumn<DistribusiRow>[] = [
    {
        id: 'allocation_date',
        header: 'Tanggal alokasi',
        cell: (allocation) => formatDate(allocation.allocation_date),
        className: 'whitespace-nowrap',
        mobile: 'subtitle',
    },
    {
        id: 'box',
        header: 'Box',
        cell: (allocation) => allocation.box_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (allocation) => allocation.loket,
        mobile: 'subtitle',
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
        header: 'Set',
        cell: (allocation) => formatQuantity(allocation.quantity),
        numeric: true,
    },
    {
        id: 'status',
        header: 'Status',
        cell: (allocation) => (
            <AllocationStatusBadge status={allocation.status} />
        ),
        mobile: 'badge',
    },
    {
        id: 'created_by',
        header: 'Dibuat oleh',
        cell: (allocation) => allocation.created_by,
    },
    {
        id: 'accepted_by',
        header: 'Diterima oleh',
        cell: (allocation) => <AcceptedBy allocation={allocation} />,
    },
];

function recapColumns(
    summary: Summary,
): LaporanRecapColumn<DistribusiLoketRecap>[] {
    const statusSets = (status: AllocationStatus): number =>
        summary.statuses.find((item) => item.status === status)?.total_sets ??
        0;

    return [
        {
            id: 'allocations',
            header: 'Alokasi',
            value: (recap) => recap.distributed_allocations,
            total: summary.distributed_allocations,
        },
        {
            id: 'distributed',
            header: 'Set didistribusikan',
            value: (recap) => recap.distributed_sets,
            total: summary.distributed_sets,
            emphasis: true,
        },
        {
            id: 'pending',
            header: 'Menunggu handover',
            value: (recap) => recap.pending_sets,
            total: statusSets('pending'),
        },
        {
            id: 'received',
            header: 'Diterima Loket',
            value: (recap) => recap.received_sets,
            total: summary.received_sets,
        },
        {
            id: 'cancelled',
            header: 'Dibatalkan',
            value: (recap) => recap.cancelled_sets,
            total: statusSets('cancelled'),
        },
        {
            id: 'returned',
            header: 'Dikembalikan ke pusat',
            value: (recap) => recap.returned_sets,
            total: statusSets('returned'),
        },
    ];
}

export default function LaporanDistribusiIndex({
    allocations,
    filters,
    lokets,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const exportOptions = laporanQuery(filters);

    return (
        <>
            <Head title="Laporan Distribusi SKPD" />

            <div
                data-print-document
                className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
            >
                <LaporanHeader
                    title="Laporan Distribusi SKPD"
                    description="Rekap alokasi Bukti SKPD dari Bendahara Barang ke Loket berdasarkan tanggal alokasi."
                    periodLabel={formatLaporanPeriod(
                        filters.month,
                        filters.year,
                    )}
                    periodBasis="tanggal alokasi (WITA); alokasi tanpa tanggal memakai waktu pembuatannya"
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                />

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                />

                <section
                    aria-label="Ringkasan laporan distribusi SKPD"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <LaporanSummaryCard
                        label="Didistribusikan"
                        value={`${formatQuantity(summary.distributed_sets)} set`}
                        description={`${formatQuantity(summary.distributed_allocations)} alokasi; tanpa dibatalkan dan dikembalikan`}
                    />
                    {summary.statuses.map((status) => (
                        <LaporanSummaryCard
                            key={status.status}
                            label={status.label}
                            value={`${formatQuantity(status.total_sets)} set`}
                            description={`${formatQuantity(status.total_allocations)} alokasi`}
                        />
                    ))}
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Rekap per Loket</CardTitle>
                        <CardDescription>
                            Laporan sistem untuk pemantauan; bukan format
                            administrasi resmi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LaporanRecapTable
                            rows={loketRecaps}
                            columns={recapColumns(summary)}
                            getRowKey={(recap) => recap.loket_id}
                            getLoket={(recap) => recap.loket}
                            detailHref={(recap) =>
                                index(laporanQuery(filters, recap.loket_id))
                            }
                            detailLabel="Detail alokasi"
                            caption="Rekap distribusi SKPD per Loket"
                            minWidthClassName="min-w-5xl"
                            empty={
                                <EmptyState
                                    title="Belum ada distribusi SKPD pada periode ini."
                                    description="Alokasi dari pusat ke Loket akan masuk ke laporan ini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail Alokasi</CardTitle>
                        <CardDescription>
                            Range Nomerator tujuh digit per alokasi beserta
                            status handover. Cetak PDF memuat seluruh baris,
                            bukan hanya halaman ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={allocations.data}
                            columns={allocationColumns}
                            getRowKey={(allocation) => allocation.id}
                            minWidthClassName="min-w-6xl"
                            caption="Detail alokasi pada laporan distribusi SKPD"
                            empty={
                                <EmptyState
                                    title="Belum ada distribusi SKPD pada periode ini."
                                    description="Tidak ada alokasi dengan tanggal alokasi pada periode ini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={allocations} noun="alokasi" />
            </div>
        </>
    );
}

LaporanDistribusiIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Distribusi SKPD', href: index() }],
};

function AcceptedBy({ allocation }: { allocation: DistribusiRow }) {
    if (allocation.accepted_by === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <span className="flex flex-col">
            <span>{allocation.accepted_by}</span>
            {allocation.accepted_at !== null && (
                <span className="text-muted-foreground text-xs">
                    {formatDateTime(allocation.accepted_at)}
                </span>
            )}
        </span>
    );
}
