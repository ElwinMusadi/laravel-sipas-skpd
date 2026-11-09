import { Head, Link } from '@inertiajs/react';
import { EmptyState } from '@/components/app/empty-state';
import { formatQuantity, formatRange } from '@/components/inventory/format';
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
    boxes: {
        data: PersediaanBox[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
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

            <main
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
                    pdfUrl={pdf.url(exportOptions)}
                    xlsxUrl={xlsx.url(exportOptions)}
                >
                    <p className="text-muted-foreground text-sm">
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
                    description="Posisi akhir bulan (WITA); bulan berjalan memakai posisi saat ini."
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
                        {loketRecaps.length === 0 ? (
                            <EmptyState
                                title="Belum ada persediaan SKPD di Loket pada posisi ini."
                                description="Alokasi yang diterima Loket akan masuk ke laporan ini."
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
                                    <Table className="min-w-3xl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Loket</TableHead>
                                                <TableHead className="text-right">
                                                    Diterima
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Menunggu handover
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Terpakai
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Sisa di Loket
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
                                                    <NumberCell
                                                        value={
                                                            recap.received_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            recap.pending_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            recap.used_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            recap.remaining_quantity
                                                        }
                                                    />
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
                                                                Detail Box
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Persediaan per Box</CardTitle>
                        <CardDescription>
                            {filters.loket === null
                                ? 'Sisa di pusat = total set − dialokasikan ke Loket − menunggu handover.'
                                : 'Filter Loket aktif: kolom pusat hanya memperhitungkan alokasi Loket terpilih.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {boxes.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada Box SKPD pada posisi ini."
                                description="Box yang diterima pusat sampai posisi laporan akan tampil di sini."
                            />
                        ) : (
                            <>
                                <div
                                    data-print-mobile
                                    className="grid gap-3 lg:hidden"
                                >
                                    {boxes.data.map((box) => (
                                        <BoxMobileCard key={box.id} box={box} />
                                    ))}
                                </div>
                                <div
                                    data-print-table
                                    className="hidden lg:block"
                                >
                                    <Table className="min-w-5xl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Box</TableHead>
                                                <TableHead>Nomerator</TableHead>
                                                <TableHead className="text-right">
                                                    Total set
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Dialokasikan ke Loket
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Menunggu handover
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Terpakai
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Sisa di pusat
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Sisa di Loket
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {boxes.data.map((box) => (
                                                <TableRow key={box.id}>
                                                    <TableCell className="font-medium">
                                                        {box.box_number}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {formatRange(
                                                            box.numerator_start,
                                                            box.numerator_end,
                                                        )}
                                                    </TableCell>
                                                    <NumberCell
                                                        value={box.total_sets}
                                                    />
                                                    <NumberCell
                                                        value={
                                                            box.allocated_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            box.pending_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            box.used_quantity
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            box.central_remaining
                                                        }
                                                    />
                                                    <NumberCell
                                                        value={
                                                            box.loket_remaining
                                                        }
                                                    />
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2}>
                                                    Total
                                                </TableCell>
                                                <NumberCell
                                                    value={summary.total_sets}
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.allocated_quantity
                                                    }
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.pending_quantity
                                                    }
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.used_quantity
                                                    }
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.central_remaining
                                                    }
                                                />
                                                <NumberCell
                                                    value={
                                                        summary.loket_remaining
                                                    }
                                                />
                                            </TableRow>
                                        </TableFooter>
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
                        Menampilkan {boxes.from ?? 0}–{boxes.to ?? 0} dari{' '}
                        {boxes.total} Box
                    </p>
                    <Pagination links={boxes.links} />
                </div>

                <p className="text-muted-foreground text-xs">
                    Alokasi yang ditarik ke pusat dihitung dengan jumlah saat
                    ini, sehingga periode sebelum penarikan menampilkan angka
                    yang sudah berkurang. Alokasi dibatalkan tidak dihitung.
                </p>
            </main>
        </>
    );
}

LaporanPersediaanIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Persediaan SKPD', href: index() }],
};

function NumberCell({ value }: { value: number }) {
    return (
        <TableCell className="text-right tabular-nums">
            {formatQuantity(value)}
        </TableCell>
    );
}

function LoketMobileCard({
    recap,
    filters,
}: {
    recap: PersediaanLoketRecap;
    filters: LaporanFilters;
}) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-base">{recap.loket}</CardTitle>
                <Badge variant="outline">
                    Sisa {formatQuantity(recap.remaining_quantity)}
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <LaporanMobileValue
                        label="Diterima"
                        value={formatQuantity(recap.received_quantity)}
                    />
                    <LaporanMobileValue
                        label="Menunggu handover"
                        value={formatQuantity(recap.pending_quantity)}
                    />
                    <LaporanMobileValue
                        label="Terpakai"
                        value={formatQuantity(recap.used_quantity)}
                    />
                </div>
                <Button data-print-hidden variant="outline" size="sm" asChild>
                    <Link href={index(laporanQuery(filters, recap.loket_id))}>
                        Detail Box
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function BoxMobileCard({ box }: { box: PersediaanBox }) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">
                        {box.box_number}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                        {formatRange(box.numerator_start, box.numerator_end)}
                    </CardDescription>
                </div>
                <Badge variant="outline">
                    {formatQuantity(box.total_sets)} set
                </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <LaporanMobileValue
                    label="Dialokasikan ke Loket"
                    value={formatQuantity(box.allocated_quantity)}
                />
                <LaporanMobileValue
                    label="Menunggu handover"
                    value={formatQuantity(box.pending_quantity)}
                />
                <LaporanMobileValue
                    label="Terpakai"
                    value={formatQuantity(box.used_quantity)}
                />
                <LaporanMobileValue
                    label="Sisa di pusat"
                    value={formatQuantity(box.central_remaining)}
                />
                <LaporanMobileValue
                    label="Sisa di Loket"
                    value={formatQuantity(box.loket_remaining)}
                />
            </CardContent>
        </Card>
    );
}
