import { Head, Link, router } from '@inertiajs/react';
import {
    FileDown,
    FileSpreadsheet,
    Printer,
    ExternalLink,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/app/empty-state';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Pagination } from '@/components/inventory/pagination';
import type { PaginationLink } from '@/components/inventory/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { excel, index, pdf } from '@/routes/laporan-pemakaian';

const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
] as const;

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

type Props = {
    baps: {
        data: LaporanBap[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: {
        month: number;
        year: number;
        loket: number | null;
    };
    lokets: { id: number; name: string }[];
    summary: {
        total_baps: number;
        total_usage: number;
        total_online: number;
        total_cancellations: number;
    };
    loket_recaps: LaporanLoketRecap[];
};

export default function LaporanPemakaianIndex({
    baps,
    filters,
    lokets,
    summary,
    loket_recaps: loketRecaps,
}: Props) {
    const [month, setMonth] = useState(filters.month.toString());
    const [year, setYear] = useState(filters.year.toString());
    const [loket, setLoket] = useState(filters.loket?.toString() ?? 'all');
    const periodLabel = formatPeriod(filters.month, filters.year);
    const exportOptions = {
        query: {
            month: filters.month,
            year: filters.year,
            ...(filters.loket === null ? {} : { loket: filters.loket }),
        },
    };

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url(),
            {
                month: Number(month),
                year: Number(year),
                loket: loket === 'all' ? undefined : Number(loket),
            },
            { preserveState: true, replace: true },
        );
    }

    function resetFilters() {
        router.get(index.url(), {}, { preserveState: false, replace: true });
    }

    return (
        <>
            <Head title="Laporan Pemakaian SKPD" />

            <main
                data-print-document
                className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
            >
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Laporan Pemakaian SKPD
                            </h1>
                            <Badge data-print-hidden variant="outline">
                                Read-only
                            </Badge>
                        </div>
                        <p className="text-muted-foreground max-w-3xl text-sm">
                            Rekap pemakaian Bukti SKPD berdasarkan BAP yang
                            telah selesai administratif.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                        <p className="text-muted-foreground text-sm">
                            Periode:{' '}
                            <span className="text-foreground font-medium">
                                {periodLabel}
                            </span>
                        </p>
                        <div
                            data-print-hidden
                            className="flex flex-wrap gap-2 sm:justify-end"
                        >
                            <Button variant="outline" size="sm" asChild>
                                <a href={pdf.url(exportOptions)}>
                                    <FileDown data-icon="inline-start" />
                                    PDF
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href={excel.url(exportOptions)}>
                                    <FileSpreadsheet data-icon="inline-start" />
                                    Excel
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.print()}
                            >
                                <Printer data-icon="inline-start" />
                                Cetak
                            </Button>
                        </div>
                    </div>
                </section>

                <Card data-print-hidden>
                    <CardHeader>
                        <CardTitle>Filter laporan</CardTitle>
                        <CardDescription>
                            Periode menggunakan tanggal pelayanan BAP pada
                            timezone aplikasi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={applyFilters}
                            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_13rem_auto]"
                        >
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger aria-label="Pilih bulan">
                                    <SelectValue placeholder="Pilih bulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {monthOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value.toString()}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                min="2000"
                                max="9999"
                                value={year}
                                onChange={(event) =>
                                    setYear(event.target.value)
                                }
                                aria-label="Pilih tahun"
                            />
                            <Select value={loket} onValueChange={setLoket}>
                                <SelectTrigger aria-label="Filter Loket">
                                    <SelectValue placeholder="Semua Loket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua Loket
                                        </SelectItem>
                                        {lokets.map((option) => (
                                            <SelectItem
                                                key={option.id}
                                                value={option.id.toString()}
                                            >
                                                {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button type="submit">Tampilkan</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={resetFilters}
                                    aria-label="Reset filter laporan"
                                >
                                    <X />
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <section
                    aria-label="Ringkasan laporan pemakaian SKPD"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <SummaryCard
                        label="Total BAP"
                        value={formatQuantity(summary.total_baps)}
                        description="BAP selesai administratif"
                    />
                    <SummaryCard
                        label="SKPD Terpakai"
                        value={formatQuantity(summary.total_usage)}
                        description="Tidak dikurangi batal/rusak"
                    />
                    <SummaryCard
                        label="Online"
                        value={formatQuantity(summary.total_online)}
                        description="Termasuk SKPD terpakai"
                    />
                    <SummaryCard
                        label="Batal/Rusak"
                        value={formatQuantity(summary.total_cancellations)}
                        description="Nomerator pada BAP completed"
                    />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Rekap per Loket</CardTitle>
                        <CardDescription>
                            Tampilan operasional provisional; belum merupakan
                            format administrasi resmi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loketRecaps.length === 0 ? (
                            <EmptyState
                                title="Belum ada data pemakaian SKPD pada periode ini."
                                description="BAP yang telah selesai administratif akan masuk ke laporan ini."
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
                                                    BAP
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Terpakai
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Online
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Batal/Rusak
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
                                                <TableCell className="text-right tabular-nums">
                                                    {formatQuantity(
                                                        summary.total_baps,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatQuantity(
                                                        summary.total_usage,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatQuantity(
                                                        summary.total_online,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatQuantity(
                                                        summary.total_cancellations,
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
                        <CardTitle>Detail BAP</CardTitle>
                        <CardDescription>
                            Setiap angka dapat ditelusuri ke BAP sumber,
                            termasuk range nomerator tujuh digit.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {baps.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada data pemakaian SKPD pada periode ini."
                                description="Tidak ada BAP selesai administratif yang dapat ditelusuri."
                            />
                        ) : (
                            <>
                                <div
                                    data-print-mobile
                                    className="grid gap-3 lg:hidden"
                                >
                                    {baps.data.map((bap) => (
                                        <BapMobileCard key={bap.id} bap={bap} />
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
                                                <TableHead>BAP</TableHead>
                                                <TableHead>Loket</TableHead>
                                                <TableHead>Nomerator</TableHead>
                                                <TableHead className="text-right">
                                                    Terpakai
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Online
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Batal/Rusak
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
                                            {baps.data.map((bap) => (
                                                <TableRow key={bap.id}>
                                                    <TableCell>
                                                        {formatDate(
                                                            bap.service_date,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium tabular-nums">
                                                        {bap.number}
                                                    </TableCell>
                                                    <TableCell>
                                                        {bap.loket}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {formatRange(
                                                            bap.numerator_start,
                                                            bap.numerator_end,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatQuantity(
                                                            bap.total_usage,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatQuantity(
                                                            bap.online_usage_count,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatQuantity(
                                                            bap.cancellation_count,
                                                        )}
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
                                                                    bap.id,
                                                                )}
                                                                aria-label={`Detail BAP ${bap.number}`}
                                                            >
                                                                <ExternalLink />
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

                <div
                    data-print-hidden
                    className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center"
                >
                    <p className="text-muted-foreground">
                        Menampilkan {baps.from ?? 0}–{baps.to ?? 0} dari{' '}
                        {baps.total} BAP
                    </p>
                    <Pagination links={baps.links} />
                </div>
            </main>
        </>
    );
}

LaporanPemakaianIndex.layout = {
    breadcrumbs: [{ title: 'Laporan Pemakaian SKPD', href: index() }],
};

function SummaryCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card>
            <CardHeader className="gap-1">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
                {description}
            </CardContent>
        </Card>
    );
}

function LoketRecapRow({
    recap,
    filters,
}: {
    recap: LaporanLoketRecap;
    filters: Props['filters'];
}) {
    return (
        <TableRow>
            <TableCell className="font-medium">{recap.loket}</TableCell>
            <TableCell className="text-right tabular-nums">
                {formatQuantity(recap.total_baps)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatQuantity(recap.total_usage)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatQuantity(recap.total_online)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatQuantity(recap.total_cancellations)}
            </TableCell>
            <TableCell data-print-action className="text-right">
                <Button data-print-hidden variant="outline" size="sm" asChild>
                    <Link href={recapDetailUrl(filters, recap.loket_id)}>
                        Detail BAP
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
    recap: LaporanLoketRecap;
    filters: Props['filters'];
}) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{recap.loket}</CardTitle>
                    <CardDescription>
                        Rekap {formatPeriod(filters.month, filters.year)}
                    </CardDescription>
                </div>
                <Badge variant="outline">
                    {formatQuantity(recap.total_baps)} BAP
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <MobileValue
                        label="Terpakai"
                        value={formatQuantity(recap.total_usage)}
                    />
                    <MobileValue
                        label="Online"
                        value={formatQuantity(recap.total_online)}
                    />
                    <MobileValue
                        label="Batal/rusak"
                        value={formatQuantity(recap.total_cancellations)}
                    />
                </div>
                <Button data-print-hidden variant="outline" size="sm" asChild>
                    <Link href={recapDetailUrl(filters, recap.loket_id)}>
                        Detail BAP
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function BapMobileCard({ bap }: { bap: LaporanBap }) {
    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base tabular-nums">
                        {bap.number}
                    </CardTitle>
                    <CardDescription>
                        {formatDate(bap.service_date)} · {bap.loket}
                    </CardDescription>
                </div>
                <Badge variant="outline">Selesai administratif</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <MobileValue
                        label="Nomerator"
                        value={formatRange(
                            bap.numerator_start,
                            bap.numerator_end,
                        )}
                        mono
                    />
                    <MobileValue
                        label="Terpakai"
                        value={formatQuantity(bap.total_usage)}
                    />
                    <MobileValue
                        label="Online"
                        value={formatQuantity(bap.online_usage_count)}
                    />
                    <MobileValue
                        label="Batal/rusak"
                        value={formatQuantity(bap.cancellation_count)}
                    />
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={showBap(bap.id)}>
                        <ExternalLink data-icon="inline-start" />
                        Detail BAP
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function MobileValue({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span
                className={
                    mono ? 'font-mono text-xs' : 'font-medium tabular-nums'
                }
            >
                {value}
            </span>
        </div>
    );
}

function recapDetailUrl(filters: Props['filters'], loketId: number) {
    return index({
        query: {
            month: filters.month,
            year: filters.year,
            loket: loketId,
        },
    });
}

function formatPeriod(month: number, year: number): string {
    const option = monthOptions.find((item) => item.value === month);

    return `${option?.label ?? month} ${year}`;
}
