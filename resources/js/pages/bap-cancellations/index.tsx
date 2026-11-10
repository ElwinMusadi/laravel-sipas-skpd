import { Head, Link } from '@inertiajs/react';
import { Eye, FileText, FileX } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import {
    FilterBar,
    FilterSearch,
    FilterSelect,
} from '@/components/app/filter-bar';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIndexFilters } from '@/hooks/use-index-filters';
import { index, show } from '@/routes/bap-cancellations';
import { show as showBap } from '@/routes/baps';

type Cancellation = {
    id: number;
    bap_id: number;
    bap_document_number: string;
    service_date: string;
    loket: string;
    numerator: number;
    reason: string;
    reason_label: string;
    description: string | null;
    created_by: string;
    bap_status: BapStatus;
    created_at: string;
};

type Props = {
    cancellations: Paginator & { data: Cancellation[] };
    filters: { search?: string; reason?: string };
    reasons: { value: string; label: string }[];
};

const columns: DataTableColumn<Cancellation>[] = [
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (cancellation) => (
            <span className="font-mono">
                {formatNomerator(cancellation.numerator)}
            </span>
        ),
        mono: true,
        mobile: 'title',
    },
    {
        id: 'bap',
        header: 'BAP',
        cell: (cancellation) => cancellation.bap_document_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'subtitle',
    },
    {
        id: 'reason',
        header: 'Klasifikasi',
        cell: (cancellation) => (
            <StatusBadge label={cancellation.reason_label} tone="neutral" />
        ),
        mobile: 'badge',
    },
    {
        id: 'service_date',
        header: 'Tanggal pelayanan',
        cell: (cancellation) => formatDate(cancellation.service_date),
        className: 'whitespace-nowrap',
    },
    {
        id: 'loket',
        header: 'Loket',
        cell: (cancellation) => cancellation.loket,
    },
    {
        id: 'description',
        wideOnly: true,
        header: 'Keterangan singkat',
        cell: (cancellation) => (
            <span className="line-clamp-2">
                {cancellation.description ?? '—'}
            </span>
        ),
        className: 'max-w-xs',
    },
    {
        id: 'created_by',
        wideOnly: true,
        header: 'Dicatat oleh',
        cell: (cancellation) => cancellation.created_by,
    },
    {
        id: 'bap_status',
        header: 'Status BAP',
        cell: (cancellation) => (
            <BapStatusBadge status={cancellation.bap_status} />
        ),
        className: 'min-w-44',
    },
    {
        id: 'created_at',
        wideOnly: true,
        header: 'Dicatat pada',
        cell: (cancellation) => formatDateTime(cancellation.created_at),
        className: 'text-muted-foreground whitespace-nowrap',
    },
];

export default function BapCancellationIndex({
    cancellations,
    filters,
    reasons,
}: Props) {
    const filterForm = useIndexFilters(index.url(), {
        search: filters.search ?? '',
        reason: filters.reason ?? '',
    });

    return (
        <>
            <Head title="Riwayat Batal/Rusak" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Riwayat SKPD Batal/Rusak"
                    description="Nomerator yang sudah dipakai pada BAP SKPD tetapi diklasifikasikan sebagai batal atau rusak."
                />

                <FilterBar
                    onSubmit={filterForm.apply}
                    onReset={filterForm.reset}
                    activeCount={filterForm.activeCount}
                >
                    <FilterSearch
                        id="cancellation-search"
                        label="Cari"
                        value={filterForm.values.search}
                        onChange={(value) => filterForm.set('search', value)}
                        placeholder="Nomerator, nomor BAP, Loket, pencatat, atau keterangan"
                    />
                    <FilterSelect
                        id="cancellation-reason"
                        label="Klasifikasi"
                        value={filterForm.values.reason}
                        onChange={(value) => filterForm.set('reason', value)}
                        options={reasons}
                        allLabel="Semua klasifikasi"
                    />
                </FilterBar>

                <Card>
                    <CardContent>
                        <DataTable
                            rows={cancellations.data}
                            columns={columns}
                            getRowKey={(cancellation) => cancellation.id}
                            rowHref={(cancellation) => show(cancellation.id)}
                            minWidthClassName="min-w-232"
                            caption="Riwayat SKPD Batal/Rusak"
                            actions={(cancellation) => (
                                <>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={showBap(cancellation.bap_id)}
                                            aria-label={`Lihat BAP ${cancellation.bap_document_number}`}
                                            title="Lihat BAP"
                                        >
                                            <FileText />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={show(cancellation.id)}
                                            aria-label={`Lihat detail Batal/Rusak ${formatNomerator(cancellation.numerator)}`}
                                            title="Lihat detail"
                                        >
                                            <Eye />
                                        </Link>
                                    </Button>
                                </>
                            )}
                            empty={
                                filterForm.activeCount > 0 ? (
                                    <EmptyState
                                        title="Tidak ada Batal/Rusak yang cocok."
                                        description="Ubah kata kunci atau klasifikasi, atau reset filter untuk melihat semua catatan."
                                    />
                                ) : (
                                    <EmptyState
                                        icon={FileX}
                                        title="Belum ada SKPD Batal/Rusak."
                                        description="Nomerator Batal/Rusak yang dicatat pada BAP SKPD akan muncul di sini."
                                    />
                                )
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={cancellations} noun="catatan" />
            </div>
        </>
    );
}

BapCancellationIndex.layout = {
    breadcrumbs: [{ title: 'Riwayat Batal/Rusak', href: index() }],
};
