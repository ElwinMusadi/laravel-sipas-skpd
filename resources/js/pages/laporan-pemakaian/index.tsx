import { Head } from '@inertiajs/react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { LaporanBapLink } from '@/components/laporan/laporan-bap-link';
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
import { show as showBap } from '@/routes/baps';
import { excel, index, pdf } from '@/routes/laporan-pemakaian';

type LaporanBap = {
    id: number;
    number: string;
    service_date: string;
    loket: string;
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    cancellation_count: number;
};

type LaporanLoketRecap = {
    loket_id: number;
    loket: string;
    total_baps: number;
    total_usage: number;
    total_online: number;
    total_cancellations: number;
};

type Summary = {
    total_baps: number;
    total_usage: number;
    total_online: number;
    total_cancellations: number;
};

type Props = {
    baps: Paginator & { data: LaporanBap[] };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    summary: Summary;
    loket_recaps: LaporanLoketRecap[];
};

const bapColumns: DataTableColumn<LaporanBap>[] = [
    {
        id: 'service_date',
        header: 'Tanggal pelayanan',
        cell: (bap) => formatDate(bap.service_date),
        className: 'whitespace-nowrap',
        mobile: 'subtitle',
    },
    {
        id: 'number',
        header: 'Nomor BAP',
        cell: (bap) => bap.number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (bap) => bap.loket,
        mobile: 'subtitle',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (bap) => formatRange(bap.numerator_start, bap.numerator_end),
        mono: true,
    },
    {
        id: 'total_usage',
        header: 'Terpakai',
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
];

function recapColumns(
    summary: Summary,
): LaporanRecapColumn<LaporanLoketRecap>[] {
    return [
        {
            id: 'baps',
            header: 'BAP',
            value: (recap) => recap.total_baps,
            total: summary.total_baps,
        },
        {
            id: 'usage',
            header: 'Terpakai',
            value: (recap) => recap.total_usage,
            total: summary.total_usage,
        },
        {
            id: 'online',
            header: 'Online',
            value: (recap) => recap.total_online,
            total: summary.total_online,
        },
        {
            id: 'cancellations',
            header: 'Batal/Rusak',
            value: (recap) => recap.total_cancellations,
            total: summary.total_cancellations,
        },
    ];
}

export default function LaporanPemakaianIndex({
    baps,
    filters,
    lokets,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const exportOptions = laporanQuery(filters);

    return (
        <>
            <Head title="Laporan Pemakaian SKPD" />

            <div
                data-print-document
                className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
            >
                <LaporanHeader
                    title="Laporan Pemakaian SKPD"
                    description="Rekap pemakaian Bukti SKPD berdasarkan BAP yang telah selesai administratif."
                    periodLabel={formatLaporanPeriod(
                        filters.month,
                        filters.year,
                    )}
                    periodBasis="tanggal pelayanan BAP"
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={excel.url(exportOptions)}
                />

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                />

                <section
                    aria-label="Ringkasan laporan pemakaian SKPD"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <LaporanSummaryCard
                        label="Total BAP"
                        value={formatQuantity(summary.total_baps)}
                        description="BAP selesai administratif"
                    />
                    <LaporanSummaryCard
                        label="SKPD Terpakai"
                        value={formatQuantity(summary.total_usage)}
                        description="Tidak dikurangi batal/rusak"
                    />
                    <LaporanSummaryCard
                        label="Online"
                        value={formatQuantity(summary.total_online)}
                        description="Termasuk SKPD terpakai"
                    />
                    <LaporanSummaryCard
                        label="Batal/Rusak"
                        value={formatQuantity(summary.total_cancellations)}
                        description="Nomerator pada BAP selesai administratif"
                    />
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
                            detailLabel="Detail BAP"
                            caption="Rekap pemakaian SKPD per Loket"
                            minWidthClassName="min-w-3xl"
                            empty={
                                <EmptyState
                                    title="Belum ada data pemakaian SKPD pada periode ini."
                                    description="BAP yang telah selesai administratif akan masuk ke laporan ini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail BAP</CardTitle>
                        <CardDescription>
                            Setiap angka dapat ditelusuri ke BAP sumber,
                            termasuk range Nomerator tujuh digit. Cetak PDF
                            memuat seluruh baris, bukan hanya halaman ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={baps.data}
                            columns={bapColumns}
                            getRowKey={(bap) => bap.id}
                            rowHref={(bap) => showBap(bap.id)}
                            actions={(bap) => (
                                <LaporanBapLink
                                    bapId={bap.id}
                                    documentNumber={bap.number}
                                />
                            )}
                            minWidthClassName="min-w-5xl"
                            caption="Detail BAP pada laporan pemakaian SKPD"
                            empty={
                                <EmptyState
                                    title="Belum ada data pemakaian SKPD pada periode ini."
                                    description="Tidak ada BAP selesai administratif yang dapat ditelusuri."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={baps} noun="BAP" />
            </div>
        </>
    );
}

LaporanPemakaianIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Pemakaian SKPD', href: index() }],
};
