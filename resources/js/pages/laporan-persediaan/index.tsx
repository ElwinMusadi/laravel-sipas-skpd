import { Head } from '@inertiajs/react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { formatQuantity, formatRange } from '@/components/inventory/format';
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
import { index, pdf, xlsx } from '@/routes/laporan-persediaan';

type PersediaanBox = {
    id: number;
    box_number: string;
    numerator_start: number;
    numerator_end: number;
    total_sets: number;
    allocated_quantity: number;
    pending_quantity: number;
    used_quantity: number;
    central_remaining: number;
    loket_remaining: number;
};

type PersediaanLoketRecap = {
    loket_id: number;
    loket: string;
    received_quantity: number;
    pending_quantity: number;
    used_quantity: number;
    remaining_quantity: number;
};

type Props = {
    boxes: Paginator & { data: PersediaanBox[] };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    position: {
        cutoff_at: string;
        label: string;
        is_end_of_month: boolean;
    };
    summary: {
        total_boxes: number;
        total_sets: number;
        allocated_quantity: number;
        pending_quantity: number;
        used_quantity: number;
        central_remaining: number;
        loket_remaining: number;
    };
    loket_recaps: PersediaanLoketRecap[];
};

const boxColumns: DataTableColumn<PersediaanBox>[] = [
    {
        id: 'box',
        header: 'Box',
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
        id: 'total_sets',
        header: 'Total set',
        cell: (box) => formatQuantity(box.total_sets),
        numeric: true,
    },
    {
        id: 'allocated',
        header: 'Dialokasikan ke Loket',
        cell: (box) => formatQuantity(box.allocated_quantity),
        numeric: true,
    },
    {
        id: 'pending',
        header: 'Menunggu handover',
        cell: (box) => formatQuantity(box.pending_quantity),
        numeric: true,
    },
    {
        id: 'used',
        header: 'Terpakai',
        cell: (box) => formatQuantity(box.used_quantity),
        numeric: true,
    },
    {
        id: 'central_remaining',
        header: 'Sisa di pusat',
        cell: (box) => formatQuantity(box.central_remaining),
        numeric: true,
    },
    {
        id: 'loket_remaining',
        header: 'Sisa di Loket',
        cell: (box) => formatQuantity(box.loket_remaining),
        numeric: true,
    },
];

const recapColumns: LaporanRecapColumn<PersediaanLoketRecap>[] = [
    {
        id: 'received',
        header: 'Diterima',
        value: (recap) => recap.received_quantity,
    },
    {
        id: 'pending',
        header: 'Menunggu handover',
        value: (recap) => recap.pending_quantity,
    },
    {
        id: 'used',
        header: 'Terpakai',
        value: (recap) => recap.used_quantity,
    },
    {
        id: 'remaining',
        header: 'Sisa di Loket',
        value: (recap) => recap.remaining_quantity,
        emphasis: true,
    },
];

export default function LaporanPersediaanIndex({
    boxes,
    filters,
    lokets,
    position,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const exportOptions = laporanQuery(filters);

    return (
        <>
            <Head title="Laporan Persediaan SKPD" />

            <div
                data-print-document
                className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
            >
                <LaporanHeader
                    title="Laporan Persediaan SKPD"
                    description="Posisi persediaan Bukti SKPD per Box dan per Loket, disusun ulang dari data alokasi dan BAP."
                    periodLabel={formatLaporanPeriod(
                        filters.month,
                        filters.year,
                    )}
                    periodBasis="posisi akhir bulan (WITA); bulan berjalan memakai posisi saat ini"
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                >
                    <p>
                        Posisi per{' '}
                        <span className="text-foreground font-medium">
                            {position.label}
                        </span>
                    </p>
                </LaporanHeader>

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                />

                <section
                    aria-label="Ringkasan laporan persediaan SKPD"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
                >
                    <LaporanSummaryCard
                        label="Total Set"
                        value={formatQuantity(summary.total_sets)}
                        description={`${formatQuantity(summary.total_boxes)} Box diterima`}
                    />
                    <LaporanSummaryCard
                        label="Sisa di Pusat"
                        value={formatQuantity(summary.central_remaining)}
                        description="Belum dialokasikan ke Loket"
                    />
                    <LaporanSummaryCard
                        label="Menunggu Handover"
                        value={formatQuantity(summary.pending_quantity)}
                        description="Alokasi belum diterima Loket"
                    />
                    <LaporanSummaryCard
                        label="Sisa di Loket"
                        value={formatQuantity(summary.loket_remaining)}
                        description="Diterima Loket, belum terpakai"
                    />
                    <LaporanSummaryCard
                        label="Terpakai"
                        value={formatQuantity(summary.used_quantity)}
                        description="BAP selain draft"
                    />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Persediaan per Loket</CardTitle>
                        <CardDescription>
                            Laporan sistem untuk pemantauan; bukan format
                            administrasi resmi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LaporanRecapTable
                            rows={loketRecaps}
                            columns={recapColumns}
                            getRowKey={(recap) => recap.loket_id}
                            getLoket={(recap) => recap.loket}
                            detailHref={(recap) =>
                                index(laporanQuery(filters, recap.loket_id))
                            }
                            detailLabel="Detail Box"
                            caption="Persediaan SKPD per Loket"
                            minWidthClassName="min-w-3xl"
                            empty={
                                <EmptyState
                                    title="Belum ada persediaan SKPD di Loket pada posisi ini."
                                    description="Alokasi yang diterima Loket akan masuk ke laporan ini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Persediaan per Box</CardTitle>
                        <CardDescription>
                            {filters.loket === null
                                ? 'Sisa di pusat = total set − dialokasikan ke Loket − menunggu handover.'
                                : 'Filter Loket aktif: kolom pusat hanya memperhitungkan alokasi Loket terpilih.'}{' '}
                            Cetak PDF memuat seluruh baris, bukan hanya halaman
                            ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <DataTable
                            rows={boxes.data}
                            columns={boxColumns}
                            getRowKey={(box) => box.id}
                            minWidthClassName="min-w-5xl"
                            caption="Persediaan SKPD per Box"
                            empty={
                                <EmptyState
                                    title="Belum ada Box SKPD pada posisi ini."
                                    description="Box yang diterima pusat sampai posisi laporan akan tampil di sini."
                                />
                            }
                        />
                        {boxes.data.length > 0 ? (
                            <BoxTotals summary={summary} />
                        ) : null}
                    </CardContent>
                </Card>

                <ListFooter paginator={boxes} noun="Box" />

                <p className="text-muted-foreground text-xs">
                    Alokasi yang ditarik ke pusat dihitung dengan jumlah saat
                    ini, sehingga periode sebelum penarikan menampilkan angka
                    yang sudah berkurang. Alokasi dibatalkan tidak dihitung.
                </p>
            </div>
        </>
    );
}

LaporanPersediaanIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Persediaan SKPD', href: index() }],
};

/**
 * Totals of every Box in the report, not just the page on screen.
 */
function BoxTotals({ summary }: { summary: Props['summary'] }) {
    const totals = [
        { label: 'Total set', value: summary.total_sets },
        { label: 'Dialokasikan ke Loket', value: summary.allocated_quantity },
        { label: 'Menunggu handover', value: summary.pending_quantity },
        { label: 'Terpakai', value: summary.used_quantity },
        { label: 'Sisa di pusat', value: summary.central_remaining },
        { label: 'Sisa di Loket', value: summary.loket_remaining },
    ];

    return (
        <section
            aria-label="Total seluruh Box"
            className="bg-muted/50 rounded-lg border p-4"
        >
            <p className="text-sm font-medium">
                Total seluruh Box ({formatQuantity(summary.total_boxes)})
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 xl:grid-cols-6">
                {totals.map((total) => (
                    <div key={total.label} className="min-w-0">
                        <dt className="text-muted-foreground text-xs">
                            {total.label}
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {formatQuantity(total.value)}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
