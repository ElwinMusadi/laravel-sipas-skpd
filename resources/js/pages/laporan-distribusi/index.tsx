import { Head, Link } from '@inertiajs/react';
import {
    AllocationStatusBadge,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
import { EmptyState } from '@/components/app/empty-state';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Pagination } from '@/components/inventory/pagination';
import type { PaginationLink } from '@/components/inventory/types';
import { LaporanFilterCard } from '@/components/laporan/laporan-filter-card';
import {
    formatLaporanPeriod,
    laporanQuery,
    type LaporanFilters,
    type LaporanLoketOption,
} from '@/components/laporan/laporan-filters';
import { LaporanHeader } from '@/components/laporan/laporan-header';
import {
    LaporanMobileValue,
    LaporanSummaryCard,
} from '@/components/laporan/laporan-summary-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

type Props = {
    allocations: {
        data: DistribusiRow[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    summary: {
        distributed_allocations: number;
        distributed_sets: number;
        received_sets: number;
        statuses: StatusTotal[];
    };
    loket_recaps: DistribusiLoketRecap[];
};

export default function LaporanDistribusiIndex({
    allocations,
    filters,
    lokets,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const exportOptions = laporanQuery(filters);
    const statusSets = (status: AllocationStatus): number =>
        summary.statuses.find((item) => item.status === status)?.total_sets ??
        0;

    return (
        <>
            <Head title="Laporan Distribusi SKPD" />

            <main
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
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                />

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                    description="Periode menggunakan tanggal alokasi (WITA); alokasi tanpa tanggal memakai waktu pembuatannya."
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
                        {loketRecaps.length === 0 ? (
                            <EmptyState
                                title="Belum ada distribusi SKPD pada periode ini."
                                description="Alokasi dari pusat ke Loket akan masuk ke laporan ini."
                            />
                        ) : (
                            <>
                                <div
                                    data-print-mobile
                                    className="grid gap-3 lg:hidden"
                                >
                                    {loketRecaps.map((recap) => (
                                        <LoketMobileCard
                                            key={recap.loket_id}
                                            recap={recap}
                                            filters={filters}
                                        />
                                    ))}
                                </div>
                                <div
                                    data-print-table
                                    className="hidden lg:block"
                                >
                                    <Table className="min-w-5xl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Loket</TableHead>
                                                <TableHead className="text-right">
                                                    Alokasi
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Set didistribusikan
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Menunggu handover
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Diterima Loket
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Dibatalkan
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Dikembalikan ke pusat
                                                </TableHead>
                                                <TableHead
                                                    data-print-action
                                                    className="text-right"
                                                >
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loketRecaps.map((recap) => (
                                                <LoketRecapRow
                                                    key={recap.loket_id}
                                                    recap={recap}
                                                    filters={filters}
                                                />
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell>Total</TableCell>
                                                <NumberCell
                                                    value={
                                                        summary.distributed_allocations
                                                    }
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.distributed_sets
                                                    }
                                                />
                                                <NumberCell
                                                    value={statusSets(
                                                        'pending',
                                                    )}
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.received_sets
                                                    }
                                                />
                                                <NumberCell
                                                    value={statusSets(
                                                        'cancelled',
                                                    )}
                                                />
                                                <NumberCell
                                                    value={statusSets(
                                                        'returned',
                                                    )}
                                                />
                                                <TableCell data-print-action />
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail Alokasi</CardTitle>
                        <CardDescription>
                            Range Nomerator tujuh digit per alokasi beserta
                            status handover.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allocations.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada distribusi SKPD pada periode ini."
                                description="Tidak ada alokasi dengan tanggal alokasi pada periode ini."
                            />
                        ) : (
                            <>
                                <div
                                    data-print-mobile
                                    className="grid gap-3 lg:hidden"
                                >
                                    {allocations.data.map((allocation) => (
                                        <AllocationMobileCard
                                            key={allocation.id}
                                            allocation={allocation}
                                        />
                                    ))}
                                </div>
                                <div
                                    data-print-table
                                    className="hidden lg:block"
                                >
                                    <Table className="min-w-6xl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>Box</TableHead>
                                                <TableHead>Loket</TableHead>
                                                <TableHead>Nomerator</TableHead>
                                                <TableHead className="text-right">
                                                    Set
                                                </TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>
                                                    Dibuat oleh
                                                </TableHead>
                                                <TableHead>
                                                    Diterima oleh
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allocations.data.map(
                                                (allocation) => (
                                                    <TableRow
                                                        key={allocation.id}
                                                    >
                                                        <TableCell>
                                                            {formatDate(
                                                                allocation.allocation_date,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {
                                                                allocation.box_number
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            {allocation.loket}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {formatRange(
                                                                allocation.numerator_start,
                                                                allocation.numerator_end,
                                                            )}
                                                        </TableCell>
                                                        <NumberCell
                                                            value={
                                                                allocation.quantity
                                                            }
                                                        />
                                                        <TableCell>
                                                            <AllocationStatusBadge
                                                                status={
                                                                    allocation.status
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {
                                                                allocation.created_by
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            <AcceptedBy
                                                                allocation={
                                                                    allocation
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div
                    data-print-hidden
                    className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center"
                >
                    <p className="text-muted-foreground">
                        Menampilkan {allocations.from ?? 0}–
                        {allocations.to ?? 0} dari {allocations.total} alokasi
                    </p>
                    <Pagination links={allocations.links} />
                </div>
            </main>
        </>
    );
}

LaporanDistribusiIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Distribusi SKPD', href: index() }],
};

function NumberCell({ value }: { value: number }) {
    return (
        <TableCell className="text-right tabular-nums">
            {formatQuantity(value)}
        </TableCell>
    );
}

function AcceptedBy({ allocation }: { allocation: DistribusiRow }) {
    if (allocation.accepted_by === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="flex flex-col">
            <span>{allocation.accepted_by}</span>
            {allocation.accepted_at !== null && (
                <span className="text-muted-foreground text-xs">
                    {formatDateTime(allocation.accepted_at)}
                </span>
            )}
        </div>
    );
}

function LoketRecapRow({
    recap,
    filters,
}: {
    recap: DistribusiLoketRecap;
    filters: LaporanFilters;
}) {
    return (
        <TableRow>
            <TableCell className="font-medium">{recap.loket}</TableCell>
            <NumberCell value={recap.distributed_allocations} />
            <NumberCell value={recap.distributed_sets} />
            <NumberCell value={recap.pending_sets} />
            <NumberCell value={recap.received_sets} />
            <NumberCell value={recap.cancelled_sets} />
            <NumberCell value={recap.returned_sets} />
            <TableCell data-print-action className="text-right">
                <Button data-print-hidden variant="outline" size="sm" asChild>
                    <Link href={index(laporanQuery(filters, recap.loket_id))}>
                        Detail
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
}

function LoketMobileCard({
    recap,
    filters,
}: {
    recap: DistribusiLoketRecap;
    filters: LaporanFilters;
}) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{recap.loket}</CardTitle>
                    <CardDescription>
                        Rekap {formatLaporanPeriod(filters.month, filters.year)}
                    </CardDescription>
                </div>
                <Badge variant="outline">
                    {formatQuantity(recap.distributed_allocations)} alokasi
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <LaporanMobileValue
                        label="Set didistribusikan"
                        value={formatQuantity(recap.distributed_sets)}
                    />
                    <LaporanMobileValue
                        label="Menunggu handover"
                        value={formatQuantity(recap.pending_sets)}
                    />
                    <LaporanMobileValue
                        label="Diterima Loket"
                        value={formatQuantity(recap.received_sets)}
                    />
                    <LaporanMobileValue
                        label="Dibatalkan"
                        value={formatQuantity(recap.cancelled_sets)}
                    />
                    <LaporanMobileValue
                        label="Dikembalikan ke pusat"
                        value={formatQuantity(recap.returned_sets)}
                    />
                </div>
                <Button data-print-hidden variant="outline" size="sm" asChild>
                    <Link href={index(laporanQuery(filters, recap.loket_id))}>
                        Detail
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function AllocationMobileCard({ allocation }: { allocation: DistribusiRow }) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">
                        {allocation.box_number}
                    </CardTitle>
                    <CardDescription>
                        {formatDate(allocation.allocation_date)} ·{' '}
                        {allocation.loket}
                    </CardDescription>
                </div>
                <AllocationStatusBadge status={allocation.status} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <LaporanMobileValue
                    label="Nomerator"
                    value={formatRange(
                        allocation.numerator_start,
                        allocation.numerator_end,
                    )}
                    mono
                />
                <LaporanMobileValue
                    label="Jumlah set"
                    value={formatQuantity(allocation.quantity)}
                />
                <LaporanMobileValue
                    label="Dibuat oleh"
                    value={allocation.created_by}
                />
                <LaporanMobileValue
                    label="Diterima oleh"
                    value={
                        allocation.accepted_by === null
                            ? '—'
                            : `${allocation.accepted_by}${allocation.accepted_at === null ? '' : ` · ${formatDateTime(allocation.accepted_at)}`}`
                    }
                />
            </CardContent>
        </Card>
    );
}
