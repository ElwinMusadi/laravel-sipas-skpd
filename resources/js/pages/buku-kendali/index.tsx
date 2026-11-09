import { Head, router, usePage } from '@inertiajs/react';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import {
    FilterBar,
    FilterField,
    FilterSearch,
    FilterSelect,
} from '@/components/app/filter-bar';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { PageHeader } from '@/components/app/page-header';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { LaporanBapLink } from '@/components/laporan/laporan-bap-link';
import { LaporanSummaryCard } from '@/components/laporan/laporan-summary-card';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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

type Filters = {
    search: string;
    start_date: string;
    end_date: string;
    loket: number | null;
};

type LoketOption = { id: number; name: string };

type Props = {
    baps: Paginator & { data: BukuKendaliBap[] };
    filters: Filters;
    lokets: LoketOption[];
    summary: {
        total_baps: number;
        total_usage: number;
        total_online: number;
        total_cancellations: number;
    };
};

const columns: DataTableColumn<BukuKendaliBap>[] = [
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
    {
        id: 'received',
        header: 'Diterima Bendahara Barang',
        cell: (bap) => <ReceiptCell bap={bap} />,
    },
];

export default function BukuKendaliIndex({
    baps,
    filters,
    lokets,
    summary,
}: Props) {
    const { url } = usePage();

    return (
        <>
            <Head title="Buku Kendali" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Buku Kendali"
                    description="Rekap administratif BAP yang telah selesai dan diterima Bendahara Barang."
                    badges={<Badge variant="outline">Hanya baca</Badge>}
                    meta={
                        <p className="text-muted-foreground text-sm">
                            Periode:{' '}
                            <span className="text-foreground font-medium">
                                {formatDate(filters.start_date)} –{' '}
                                {formatDate(filters.end_date)}
                            </span>
                        </p>
                    }
                />

                <BukuKendaliFilters
                    key={url}
                    url={url}
                    filters={filters}
                    lokets={lokets}
                />

                <section
                    aria-label="Ringkasan Buku Kendali"
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
                        description="Total pemakaian BAP"
                    />
                    <LaporanSummaryCard
                        label="Online"
                        value={formatQuantity(summary.total_online)}
                        description="Termasuk dalam total pemakaian"
                    />
                    <LaporanSummaryCard
                        label="Batal/Rusak"
                        value={formatQuantity(summary.total_cancellations)}
                        description="Tetap termasuk SKPD terpakai"
                    />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Rekap BAP selesai administratif</CardTitle>
                        <CardDescription>
                            Setiap baris merujuk langsung ke BAP sumbernya. Data
                            hanya dapat dibaca.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={baps.data}
                            columns={columns}
                            getRowKey={(bap) => bap.id}
                            rowHref={(bap) => showBap(bap.id)}
                            actions={(bap) => (
                                <LaporanBapLink
                                    bapId={bap.id}
                                    documentNumber={bap.number}
                                />
                            )}
                            minWidthClassName="min-w-5xl"
                            caption="Rekap BAP selesai administratif"
                            empty={
                                <EmptyState
                                    title="Belum ada BAP selesai administratif."
                                    description="BAP yang telah diterima Bendahara Barang pada periode ini akan muncul di Buku Kendali."
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

BukuKendaliIndex.layout = {
    breadcrumbs: [{ title: 'Buku Kendali', href: index() }],
};

/**
 * Keyed by the page URL by its parent, so after every visit the fields show
 * the filters the server applied, including its default period.
 */
function BukuKendaliFilters({
    url,
    filters,
    lokets,
}: {
    url: string;
    filters: Filters;
    lokets: LoketOption[];
}) {
    const [search, setSearch] = useState(filters.search);
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [loket, setLoket] = useState(filters.loket?.toString() ?? '');

    function visit(query: Record<string, string>): void {
        router.get(index.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function applyFilters(): void {
        visit(
            Object.fromEntries(
                Object.entries({
                    search: search.trim(),
                    start_date: startDate,
                    end_date: endDate,
                    loket,
                }).filter(([, value]) => value !== ''),
            ),
        );
    }

    return (
        <FilterBar
            onSubmit={applyFilters}
            onReset={() => visit({})}
            activeCount={appliedFilterCount(url)}
        >
            <FilterSearch
                id="buku-kendali-search"
                label="Cari"
                value={search}
                onChange={setSearch}
                placeholder="Nomor BAP, Loket, atau Nomerator"
                className="sm:col-span-2 xl:col-span-1"
            />
            <FilterField id="buku-kendali-start-date" label="Tanggal mulai">
                <DatePicker
                    id="buku-kendali-start-date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Pilih tanggal mulai"
                    clearable={false}
                    disabledDays={
                        endDate === ''
                            ? undefined
                            : { after: parseISO(endDate) }
                    }
                />
            </FilterField>
            <FilterField id="buku-kendali-end-date" label="Tanggal akhir">
                <DatePicker
                    id="buku-kendali-end-date"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Pilih tanggal akhir"
                    clearable={false}
                    disabledDays={
                        startDate === ''
                            ? undefined
                            : { before: parseISO(startDate) }
                    }
                />
            </FilterField>
            <FilterSelect
                id="buku-kendali-loket"
                label="Loket"
                value={loket}
                onChange={setLoket}
                options={lokets.map((option) => ({
                    value: option.id.toString(),
                    label: option.name,
                }))}
                allLabel="Semua Loket"
            />
        </FilterBar>
    );
}

/**
 * Filters the user chose explicitly: search, the date range (once), and the
 * Loket. Without a range the server shows the current month up to today.
 */
function appliedFilterCount(url: string): number {
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const hasValue = (key: string): boolean => (query.get(key) ?? '') !== '';

    return (
        Number(hasValue('search')) +
        Number(hasValue('start_date') || hasValue('end_date')) +
        Number(hasValue('loket'))
    );
}

function ReceiptCell({ bap }: { bap: BukuKendaliBap }) {
    return (
        <span className="flex flex-col">
            <span>{bap.received_by ?? '—'}</span>
            <span className="text-muted-foreground text-xs">
                {bap.received_at ? formatDateTime(bap.received_at) : '—'}
            </span>
        </span>
    );
}
