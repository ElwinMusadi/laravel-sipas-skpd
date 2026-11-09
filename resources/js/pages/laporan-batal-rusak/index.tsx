import { Head } from '@inertiajs/react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import {
    formatDate,
    formatNomerator,
    formatQuantity,
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
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { show as showBap } from '@/routes/baps';
import { index, pdf, xlsx } from '@/routes/laporan-batal-rusak';

type BatalRusakRow = {
    id: number;
    bap_id: number;
    service_date: string;
    document_number: string;
    loket: string;
    numerator: number;
    reason: string;
    reason_label: string;
    description: string | null;
};

type ReasonTotal = {
    reason: string;
    label: string;
    total: number;
};

type BatalRusakLoketRecap = {
    loket_id: number;
    loket: string;
    total: number;
    reasons: Record<string, number>;
};

type Props = {
    cancellations: Paginator & { data: BatalRusakRow[] };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    summary: {
        total: number;
        reasons: ReasonTotal[];
    };
    loket_recaps: BatalRusakLoketRecap[];
};

const legacyReasons = ['cancelled', 'damaged'];

const cancellationColumns: DataTableColumn<BatalRusakRow>[] = [
    {
        id: 'service_date',
        header: 'Tanggal pelayanan',
        cell: (row) => formatDate(row.service_date),
        className: 'whitespace-nowrap',
        mobile: 'subtitle',
    },
    {
        id: 'document_number',
        header: 'Nomor BAP',
        cell: (row) => row.document_number,
        className: 'font-medium whitespace-nowrap',
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (row) => row.loket,
        mobile: 'subtitle',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (row) => formatNomerator(row.numerator),
        mono: true,
        mobile: 'title',
    },
    {
        id: 'reason',
        header: 'Alasan',
        cell: (row) => <Badge variant="outline">{row.reason_label}</Badge>,
        mobile: 'badge',
    },
    {
        id: 'description',
        header: 'Keterangan',
        cell: (row) => row.description ?? '—',
        className: 'text-muted-foreground max-w-xs whitespace-normal',
    },
];

function recapColumns(
    reasons: ReasonTotal[],
    total: number,
): LaporanRecapColumn<BatalRusakLoketRecap>[] {
    return [
        ...reasons.map((reason) => ({
            id: reason.reason,
            header: reason.label,
            value: (recap: BatalRusakLoketRecap) =>
                recap.reasons[reason.reason] ?? 0,
            total: reason.total,
        })),
        {
            id: 'total',
            header: 'Total',
            value: (recap) => recap.total,
            total,
            emphasis: true,
        },
    ];
}

export default function LaporanBatalRusakIndex({
    cancellations,
    filters,
    lokets,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const exportOptions = laporanQuery(filters);

    return (
        <>
            <Head title="Laporan Batal/Rusak SKPD" />

            <div
                data-print-document
                className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
            >
                <LaporanHeader
                    title="Laporan Batal/Rusak SKPD"
                    description="Rekap Nomerator Bukti SKPD yang batal atau rusak berdasarkan BAP yang telah selesai administratif."
                    periodLabel={formatLaporanPeriod(
                        filters.month,
                        filters.year,
                    )}
                    periodBasis="tanggal pelayanan BAP (WITA)"
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                />

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                />

                <section
                    aria-label="Ringkasan laporan Batal/Rusak SKPD"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <LaporanSummaryCard
                        label="Total Batal/Rusak"
                        value={formatQuantity(summary.total)}
                        description="Nomerator pada BAP selesai administratif"
                    />
                    {summary.reasons.map((reason) => (
                        <LaporanSummaryCard
                            key={reason.reason}
                            label={reason.label}
                            value={formatQuantity(reason.total)}
                            description={
                                legacyReasons.includes(reason.reason)
                                    ? 'Alasan lama pada data historis'
                                    : 'Alasan pada BAP terpadu'
                            }
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
                            columns={recapColumns(
                                summary.reasons,
                                summary.total,
                            )}
                            getRowKey={(recap) => recap.loket_id}
                            getLoket={(recap) => recap.loket}
                            detailHref={(recap) =>
                                index(laporanQuery(filters, recap.loket_id))
                            }
                            detailLabel="Detail Nomerator"
                            caption="Rekap Batal/Rusak SKPD per Loket"
                            minWidthClassName="min-w-4xl"
                            empty={
                                <EmptyState
                                    title="Belum ada data Batal/Rusak SKPD pada periode ini."
                                    description="Nomerator Batal/Rusak pada BAP yang telah selesai administratif akan masuk ke laporan ini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail Batal/Rusak</CardTitle>
                        <CardDescription>
                            Setiap Nomerator dapat ditelusuri ke BAP sumber.
                            Cetak PDF memuat seluruh baris, bukan hanya halaman
                            ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={cancellations.data}
                            columns={cancellationColumns}
                            getRowKey={(row) => row.id}
                            rowHref={(row) => showBap(row.bap_id)}
                            actions={(row) => (
                                <LaporanBapLink
                                    bapId={row.bap_id}
                                    documentNumber={row.document_number}
                                />
                            )}
                            minWidthClassName="min-w-5xl"
                            caption="Detail Nomerator Batal/Rusak SKPD"
                            empty={
                                <EmptyState
                                    title="Belum ada data Batal/Rusak SKPD pada periode ini."
                                    description="Tidak ada Nomerator Batal/Rusak pada BAP selesai administratif."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={cancellations} noun="Nomerator" />
            </div>
        </>
    );
}

LaporanBatalRusakIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Batal/Rusak SKPD', href: index() }],
};
