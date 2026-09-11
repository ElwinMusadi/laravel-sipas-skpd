import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/app/empty-state';
import { BapStatusBadge } from '@/components/bap/bap-status-badge';
import {
    formatDate,
    formatDateTime,
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
import { DatePicker } from '@/components/ui/date-picker';
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { show as showBap } from '@/routes/baps';
import { index } from '@/routes/buku-kendali';

type BukuKendaliBap = {
    id: number;
    number: string;
    service_date: string;
    loket: string;
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    cancellation_count: number;
    received_by: string | null;
    received_at: string | null;
    status: 'completed';
};

type Props = {
    baps: {
        data: BukuKendaliBap[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: {
        search: string;
        start_date: string;
        end_date: string;
        loket: number | null;
    };
    lokets: { id: number; name: string }[];
    summary: {
        total_baps: number;
        total_usage: number;
        total_online: number;
        total_cancellations: number;
    };
};

export default function BukuKendaliIndex({
    baps,
    filters,
    lokets,
    summary,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [loket, setLoket] = useState(filters.loket?.toString() ?? 'all');

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url(),
            {
                search: search || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                loket: loket === 'all' ? undefined : Number(loket),
            },
            { preserveState: true, replace: true },
        );
    }

    function resetFilters() {
        setSearch('');
        setStartDate('');
        setEndDate('');
        setLoket('all');
        router.get(index.url(), {}, { replace: true });
    }

    return (
        <>
            <Head title="Buku Kendali" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Buku Kendali
                            </h1>
                            <Badge variant="outline">Bendahara Barang</Badge>
                        </div>
                        <p className="text-muted-foreground max-w-3xl text-sm">
                            Rekap administratif BAP yang telah selesai.
                        </p>
                    </div>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter Buku Kendali</CardTitle>
                        <CardDescription>
                            Periode menggunakan tanggal pelayanan BAP.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={applyFilters}
                            className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_14rem_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                    placeholder="Cari nomor BAP, Loket, atau nomeratur"
                                    aria-label="Cari nomor BAP, Loket, atau nomeratur"
                                />
                            </div>
                            <DatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Tanggal mulai"
                                aria-label="Tanggal mulai pelayanan"
                            />
                            <DatePicker
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="Tanggal akhir"
                                aria-label="Tanggal akhir pelayanan"
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
                                <Button type="submit">Terapkan</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={resetFilters}
                                    aria-label="Reset filter"
                                >
                                    <X />
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <section
                    aria-label="Ringkasan Buku Kendali"
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
                        description="Total pemakaian BAP"
                    />
                    <SummaryCard
                        label="Online"
                        value={formatQuantity(summary.total_online)}
                        description="Termasuk dalam total pemakaian"
                    />
                    <SummaryCard
                        label="Batal/Rusak"
                        value={formatQuantity(summary.total_cancellations)}
                        description="Tetap termasuk SKPD terpakai"
                    />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Rekap BAP selesai administratif</CardTitle>
                        <CardDescription>
                            Setiap baris merujuk langsung ke BAP sumber yang
                            bersifat read-only.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {baps.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada BAP selesai administratif."
                                description="BAP yang telah diterima Bendahara Barang pada periode ini akan muncul di Buku Kendali."
                            />
                        ) : (
                            <>
                                <div className="grid gap-3 lg:hidden">
                                    {baps.data.map((bap) => (
                                        <BapMobileCard key={bap.id} bap={bap} />
                                    ))}
                                </div>
                                <div className="hidden lg:block">
                                    <Table className="min-w-[70rem]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>BAP</TableHead>
                                                <TableHead>Loket</TableHead>
                                                <TableHead>Nomeratur</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead>Online</TableHead>
                                                <TableHead>
                                                    Batal/Rusak
                                                </TableHead>
                                                <TableHead>
                                                    Diterima Bendahara Barang
                                                </TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
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
                                                    <TableCell className="tabular-nums">
                                                        {formatQuantity(
                                                            bap.total_usage,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums">
                                                        {formatQuantity(
                                                            bap.online_usage_count,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums">
                                                        {formatQuantity(
                                                            bap.cancellation_count,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        <ReceiptCell
                                                            bap={bap}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <BapStatusBadge
                                                            status={bap.status}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={showBap(
                                                                    bap.id,
                                                                )}
                                                                aria-label={
                                                                    'Detail BAP ' +
                                                                    bap.number
                                                                }
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

                <div className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
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

BukuKendaliIndex.layout = {
    breadcrumbs: [{ title: 'Buku Kendali', href: index() }],
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

function BapMobileCard({ bap }: { bap: BukuKendaliBap }) {
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
                <BapStatusBadge status={bap.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <MobileValue
                        label="Nomeratur"
                        value={formatRange(
                            bap.numerator_start,
                            bap.numerator_end,
                        )}
                        mono
                    />
                    <MobileValue
                        label="Total pemakaian"
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <ReceiptCell bap={bap} />
                    <Button variant="outline" size="sm" asChild>
                        <Link href={showBap(bap.id)}>
                            <ExternalLink data-icon="inline-start" />
                            Detail BAP
                        </Link>
                    </Button>
                </div>
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
                    mono
                        ? 'font-mono text-xs tabular-nums'
                        : 'font-medium tabular-nums'
                }
            >
                {value}
            </span>
        </div>
    );
}

function ReceiptCell({ bap }: { bap: BukuKendaliBap }) {
    return (
        <div className="flex flex-col gap-1 text-sm">
            <span>{bap.received_by ?? '—'}</span>
            <span className="text-muted-foreground text-xs">
                {bap.received_at ? formatDateTime(bap.received_at) : '—'}
            </span>
        </div>
    );
}
