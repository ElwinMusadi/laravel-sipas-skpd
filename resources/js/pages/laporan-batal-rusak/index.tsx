import { Head, Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import {
    formatDate,
    formatNomerator,
    formatQuantity,
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
    cancellations: {
        data: BatalRusakRow[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
    summary: {
        total: number;
        reasons: ReasonTotal[];
    };
    loket_recaps: BatalRusakLoketRecap[];
};

const legacyReasons = ['cancelled', 'damaged'];

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

            <main
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
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                />

                <LaporanFilterCard
                    indexUrl={index.url()}
                    filters={filters}
                    lokets={lokets}
                    description="Periode menggunakan tanggal pelayanan BAP (WITA)."
                />

                <section
                    aria-label="Ringkasan laporan Batal/Rusak SKPD"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <LaporanSummaryCard
                        label="Total Batal/Rusak"
                        value={formatQuantity(summary.total)}
                        description="Nomerator pada BAP completed"
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
                        {loketRecaps.length === 0 ? (
                            <EmptyState
                                title="Belum ada data Batal/Rusak SKPD pada periode ini."
                                description="Nomerator Batal/Rusak pada BAP yang telah selesai administratif akan masuk ke laporan ini."
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
                                            reasons={summary.reasons}
                                            filters={filters}
                                        />
                                    ))}
                                </div>
                                <div
                                    data-print-table
                                    className="hidden lg:block"
                                >
                                    <Table className="min-w-4xl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Loket</TableHead>
                                                {summary.reasons.map(
                                                    (reason) => (
                                                        <TableHead
                                                            key={reason.reason}
                                                            className="text-right"
                                                        >
                                                            {reason.label}
                                                        </TableHead>
                                                    ),
                                                )}
                                                <TableHead className="text-right">
                                                    Total
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
                                                <TableRow key={recap.loket_id}>
                                                    <TableCell className="font-medium">
                                                        {recap.loket}
                                                    </TableCell>
                                                    {summary.reasons.map(
                                                        (reason) => (
                                                            <TableCell
                                                                key={
                                                                    reason.reason
                                                                }
                                                                className="text-right tabular-nums"
                                                            >
                                                                {formatQuantity(
                                                                    recap
                                                                        .reasons[
                                                                        reason
                                                                            .reason
                                                                    ] ?? 0,
                                                                )}
                                                            </TableCell>
                                                        ),
                                                    )}
                                                    <TableCell className="text-right font-medium tabular-nums">
                                                        {formatQuantity(
                                                            recap.total,
                                                        )}
                                                    </TableCell>
                                                    <TableCell
                                                        data-print-action
                                                        className="text-right"
                                                    >
                                                        <Button
                                                            data-print-hidden
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={index(
                                                                    laporanQuery(
                                                                        filters,
                                                                        recap.loket_id,
                                                                    ),
                                                                )}
                                                            >
                                                                Detail
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell>Total</TableCell>
                                                {summary.reasons.map(
                                                    (reason) => (
                                                        <TableCell
                                                            key={reason.reason}
                                                            className="text-right tabular-nums"
                                                        >
                                                            {formatQuantity(
                                                                reason.total,
                                                            )}
                                                        </TableCell>
                                                    ),
                                                )}
                                                <TableCell className="text-right tabular-nums">
                                                    {formatQuantity(
                                                        summary.total,
                                                    )}
                                                </TableCell>
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
                        <CardTitle>Detail Batal/Rusak</CardTitle>
                        <CardDescription>
                            Setiap Nomerator dapat ditelusuri ke BAP sumber.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {cancellations.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada data Batal/Rusak SKPD pada periode ini."
                                description="Tidak ada Nomerator Batal/Rusak pada BAP selesai administratif."
                            />
                        ) : (
                            <>
                                <div
                                    data-print-mobile
                                    className="grid gap-3 lg:hidden"
                                >
                                    {cancellations.data.map((cancellation) => (
                                        <CancellationMobileCard
                                            key={cancellation.id}
                                            cancellation={cancellation}
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
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>
                                                    Nomor Dokumen BAP
                                                </TableHead>
                                                <TableHead>Loket</TableHead>
                                                <TableHead>Nomerator</TableHead>
                                                <TableHead>Alasan</TableHead>
                                                <TableHead>
                                                    Keterangan
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
                                            {cancellations.data.map(
                                                (cancellation) => (
                                                    <TableRow
                                                        key={cancellation.id}
                                                    >
                                                        <TableCell>
                                                            {formatDate(
                                                                cancellation.service_date,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium tabular-nums">
                                                            {
                                                                cancellation.document_number
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            {cancellation.loket}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {formatNomerator(
                                                                cancellation.numerator,
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {
                                                                    cancellation.reason_label
                                                                }
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground max-w-xs text-sm whitespace-normal">
                                                            {cancellation.description ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell
                                                            data-print-action
                                                            className="text-right"
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={showBap(
                                                                        cancellation.bap_id,
                                                                    )}
                                                                    aria-label={`Detail BAP ${cancellation.document_number}`}
                                                                >
                                                                    <ExternalLink />
                                                                </Link>
                                                            </Button>
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
                        Menampilkan {cancellations.from ?? 0}–
                        {cancellations.to ?? 0} dari {cancellations.total}{' '}
                        Nomerator
                    </p>
                    <Pagination links={cancellations.links} />
                </div>
            </main>
        </>
    );
}

LaporanBatalRusakIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Batal/Rusak SKPD', href: index() }],
};

function LoketMobileCard({
    recap,
    reasons,
    filters,
}: {
    recap: BatalRusakLoketRecap;
    reasons: ReasonTotal[];
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
                    {formatQuantity(recap.total)} Batal/Rusak
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {reasons.map((reason) => (
                        <LaporanMobileValue
                            key={reason.reason}
                            label={reason.label}
                            value={formatQuantity(
                                recap.reasons[reason.reason] ?? 0,
                            )}
                        />
                    ))}
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

function CancellationMobileCard({
    cancellation,
}: {
    cancellation: BatalRusakRow;
}) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="font-mono text-base">
                        {formatNomerator(cancellation.numerator)}
                    </CardTitle>
                    <CardDescription>
                        {formatDate(cancellation.service_date)} ·{' '}
                        {cancellation.loket}
                    </CardDescription>
                </div>
                <Badge variant="outline">{cancellation.reason_label}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <LaporanMobileValue
                        label="Nomor dokumen BAP"
                        value={cancellation.document_number}
                    />
                    <LaporanMobileValue
                        label="Keterangan"
                        value={cancellation.description ?? '—'}
                    />
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={showBap(cancellation.bap_id)}>
                        <ExternalLink data-icon="inline-start" />
                        Detail BAP
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
