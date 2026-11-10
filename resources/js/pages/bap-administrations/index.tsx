import { Head, Link } from '@inertiajs/react';
import { ClipboardCheck, Eye, FileCheck2 } from 'lucide-react';
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
    BapStatusBadge,
    bapStatusMeta,
} from '@/components/bap/bap-status-badge';
import { formatWaitingDuration } from '@/components/bap-verification/format';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/bap-administrations';

type QueueVerification = {
    verifier: string;
    attempt: number;
    completed_at: string | null;
} | null;

type QueueBap = {
    id: number;
    number: string;
    service_date: string;
    loket: string;
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    cancellation_count: number;
    phase_one: QueueVerification;
    phase_two: QueueVerification;
    administrative_status: 'ready' | 'completed';
    received_by: string | null;
    received_at: string | null;
};

type QueueStatus = 'waiting' | 'completed';

type Props = {
    baps: Paginator & { data: QueueBap[] };
    filters: {
        search: string;
        service_date: string | null;
        loket: number | null;
        status: QueueStatus;
    };
    lokets: { id: number; name: string }[];
};

const queueTabs: { value: QueueStatus; label: string }[] = [
    { value: 'waiting', label: bapStatusMeta.verified_phase_2.label },
    { value: 'completed', label: bapStatusMeta.completed.label },
];

/**
 * The queue URL; `filters` carries the applied search, date, and Loket over
 * when switching between the waiting and completed queues.
 */
function queueUrl(
    status: QueueStatus,
    filters: Partial<Record<'search' | 'service_date' | 'loket', string>> = {},
): string {
    const query = Object.fromEntries(
        Object.entries({
            ...filters,
            status: status === 'completed' ? 'completed' : undefined,
        }).filter(([, value]) => value !== undefined && value !== ''),
    );

    return index.url(Object.keys(query).length > 0 ? { query } : undefined);
}

function VerifierLine({
    stage,
    verification,
}: {
    stage: string;
    verification: QueueVerification;
}) {
    return (
        <span className="block text-xs">
            <span className="text-muted-foreground">{stage}: </span>
            {verification ? (
                <>
                    {verification.verifier}
                    <span className="text-muted-foreground">
                        {' '}
                        · ke-{verification.attempt}
                    </span>
                </>
            ) : (
                '—'
            )}
        </span>
    );
}

function queueColumns(isCompletedQueue: boolean): DataTableColumn<QueueBap>[] {
    return [
        {
            id: 'number',
            header: 'Nomor BAP',
            cell: (bap) => bap.number,
            className: 'font-medium whitespace-nowrap',
            mobile: 'title',
        },
        {
            id: 'service',
            header: 'Tanggal · Loket',
            cell: (bap) => (
                <>
                    <span className="block whitespace-nowrap">
                        {formatDate(bap.service_date)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                        {bap.loket}
                    </span>
                </>
            ),
            mobile: 'subtitle',
        },
        {
            id: 'status',
            status: true,
            header: 'Status',
            cell: (bap) => (
                <BapStatusBadge
                    status={
                        bap.administrative_status === 'completed'
                            ? 'completed'
                            : 'verified_phase_2'
                    }
                />
            ),
            mobile: 'badge',
        },
        {
            id: 'numerator',
            header: 'Nomerator',
            cell: (bap) => formatRange(bap.numerator_start, bap.numerator_end),
            mono: true,
        },
        {
            id: 'total',
            header: 'Total',
            cell: (bap) => formatQuantity(bap.total_usage),
            numeric: true,
        },
        {
            id: 'online',
            wideOnly: true,
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
            id: 'verifiers',
            wideOnly: true,
            header: 'Pemeriksa',
            cell: (bap) => (
                <>
                    <VerifierLine
                        stage="Tahap 1"
                        verification={bap.phase_one}
                    />
                    <VerifierLine
                        stage="Tahap 2"
                        verification={bap.phase_two}
                    />
                </>
            ),
        },
        isCompletedQueue
            ? {
                  id: 'received',
                  header: 'Diterima',
                  cell: (bap) => (
                      <>
                          <span className="block">
                              {bap.received_by ?? '—'}
                          </span>
                          <span className="text-muted-foreground block text-xs whitespace-nowrap">
                              {bap.received_at
                                  ? formatDateTime(bap.received_at)
                                  : '—'}
                          </span>
                      </>
                  ),
              }
            : {
                  id: 'phase_two_completed',
                  header: 'Lulus Tahap 2',
                  cell: (bap) =>
                      bap.phase_two?.completed_at ? (
                          <>
                              <span className="block whitespace-nowrap">
                                  {formatDateTime(bap.phase_two.completed_at)}
                              </span>
                              <span className="text-muted-foreground block text-xs">
                                  Menunggu{' '}
                                  {formatWaitingDuration(
                                      bap.phase_two.completed_at,
                                  )}
                              </span>
                          </>
                      ) : (
                          '—'
                      ),
              },
    ];
}

export default function BapAdministrationIndex({
    baps,
    filters,
    lokets,
}: Props) {
    const isCompletedQueue = filters.status === 'completed';
    const appliedFilters = {
        search: filters.search,
        service_date: filters.service_date ?? '',
        loket: filters.loket?.toString() ?? '',
    };
    const filterForm = useIndexFilters(
        queueUrl(filters.status),
        appliedFilters,
    );
    const title = isCompletedQueue
        ? 'BAP Selesai Administratif'
        : 'BAP Menunggu Penerimaan';

    return (
        <>
            <Head title={title} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={title}
                    badges={<Badge variant="outline">Bendahara Barang</Badge>}
                    description={
                        isCompletedQueue
                            ? 'Riwayat BAP yang telah diterima dan dicatat secara administratif. Data hanya dapat dibaca.'
                            : 'BAP yang telah lulus Verifikasi Tahap 1, Verifikasi Tahap 2, dan seluruh klarifikasinya selesai. Buka BAP untuk mencatat penerimaan administratif.'
                    }
                />

                <nav
                    aria-label="Antrean administrasi"
                    className="bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg p-1"
                    data-print-hidden
                >
                    {queueTabs.map((tab) => {
                        const isActive = tab.value === filters.status;

                        return (
                            <Link
                                key={tab.value}
                                href={queueUrl(tab.value, appliedFilters)}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'focus-visible:ring-ring/50 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3',
                                    isActive
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                <FilterBar
                    onSubmit={filterForm.apply}
                    onReset={filterForm.reset}
                    activeCount={filterForm.activeCount}
                >
                    <FilterSearch
                        id="administration-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Nomor BAP, Loket, atau Nomerator"
                    />
                    <FilterField
                        id="administration-service-date"
                        label="Tanggal pelayanan"
                    >
                        <DatePicker
                            id="administration-service-date"
                            value={filterForm.values.service_date}
                            onChange={(value) =>
                                filterForm.set('service_date', value)
                            }
                            placeholder="Semua tanggal"
                        />
                    </FilterField>
                    <FilterSelect
                        id="administration-loket"
                        label="Loket"
                        value={filterForm.values.loket}
                        onChange={(value) => filterForm.set('loket', value)}
                        options={lokets.map((loket) => ({
                            value: loket.id.toString(),
                            label: loket.name,
                        }))}
                        allLabel="Semua Loket"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={baps.data}
                            columns={queueColumns(isCompletedQueue)}
                            getRowKey={(bap) => bap.id}
                            rowHref={(bap) => show(bap.id)}
                            minWidthClassName="min-w-232"
                            caption={title}
                            actions={(bap) =>
                                bap.administrative_status === 'ready' ? (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={show(bap.id)}
                                            aria-label={`Tinjau dan terima BAP ${bap.number}`}
                                            title="Tinjau dan terima secara administratif"
                                        >
                                            <ClipboardCheck data-icon="inline-start" />
                                            Tinjau
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(bap.id)}
                                            aria-label={`Lihat BAP ${bap.number}`}
                                            title="Lihat detail"
                                        >
                                            <Eye />
                                        </Link>
                                    </Button>
                                )
                            }
                            empty={
                                filterForm.activeCount > 0 ? (
                                    <EmptyState
                                        title="Tidak ada BAP yang cocok."
                                        description="Ubah kata kunci, tanggal, atau Loket, atau reset filter untuk melihat semua BAP pada antrean ini."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={FileCheck2}
                                        title={
                                            isCompletedQueue
                                                ? 'Belum ada BAP selesai administratif.'
                                                : 'Tidak ada BAP menunggu penerimaan.'
                                        }
                                        description={
                                            isCompletedQueue
                                                ? 'BAP yang telah diterima Bendahara Barang akan muncul di sini.'
                                                : 'BAP yang lulus Verifikasi Tahap 1, Verifikasi Tahap 2, dan seluruh klarifikasinya akan muncul di sini.'
                                        }
                                    />
                                )
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={baps} noun="BAP" />
            </div>
        </>
    );
}

BapAdministrationIndex.layout = {
    breadcrumbs: [{ title: 'Administrasi BAP', href: index() }],
};
