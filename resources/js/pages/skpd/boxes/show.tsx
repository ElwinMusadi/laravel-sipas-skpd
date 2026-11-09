import { Head, Link } from '@inertiajs/react';
import { ArrowRightLeft, Eye, Pencil } from 'lucide-react';
import {
    AllocationStatusBadge,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { BoxDeleteDialog } from '@/components/inventory/box-delete-dialog';
import { BoxStatusBadge } from '@/components/inventory/box-status-badge';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import {
    RecentActivityCard,
    type ActivityEntry,
} from '@/components/inventory/recent-activity-card';
import type { SkpdBoxSummary } from '@/components/inventory/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    create as createAllocation,
    show as allocationShow,
} from '@/routes/skpd/allocations';
import { edit, index, show } from '@/routes/skpd/boxes';

type Allocation = {
    id: number;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
    used_quantity: number;
    remaining_quantity: number;
    status: AllocationStatus;
    loket: { id: number; name: string };
    allocation_date: string | null;
    created_by: string;
    created_at: string;
    accepted_by: string | null;
    accepted_at: string | null;
};

type Props = {
    box: SkpdBoxSummary & {
        creator: { id: number; name: string };
        allocations: Allocation[];
        timeline: ActivityEntry[];
    };
    can: { createAllocation: boolean; edit: boolean; delete: boolean };
};

const allocationColumns: DataTableColumn<Allocation>[] = [
    {
        id: 'loket',
        header: 'Loket',
        cell: (allocation) => allocation.loket.name,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (allocation) =>
            formatRange(allocation.numerator_start, allocation.numerator_end),
        mono: true,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (allocation) => (
            <AllocationStatusBadge status={allocation.status} />
        ),
        mobile: 'badge',
        className: 'min-w-36',
    },
    {
        id: 'quantity',
        header: 'Jumlah',
        cell: (allocation) => formatQuantity(allocation.quantity),
        numeric: true,
    },
    {
        id: 'remaining',
        header: 'Sisa',
        cell: (allocation) => formatQuantity(allocation.remaining_quantity),
        numeric: true,
    },
    {
        id: 'allocation_date',
        header: 'Tanggal alokasi',
        cell: (allocation) =>
            allocation.allocation_date
                ? formatDate(allocation.allocation_date)
                : 'Belum tercatat',
        className: 'whitespace-nowrap',
    },
    {
        id: 'created_by',
        header: 'Dibuat oleh',
        cell: (allocation) => allocation.created_by,
    },
    {
        id: 'accepted',
        header: 'Diterima',
        cell: (allocation) =>
            allocation.accepted_at
                ? `${allocation.accepted_by ?? '—'} · ${formatDateTime(allocation.accepted_at)}`
                : 'Belum diterima',
        className: 'text-muted-foreground',
    },
];

export default function ShowBox({ box, can }: Props) {
    return (
        <>
            <Head title={`Box ${box.box_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Box SKPD' }}
                    title={box.box_number}
                    badges={<BoxStatusBadge status={box.status} />}
                    meta={
                        <p className="text-muted-foreground font-mono text-sm">
                            {formatRange(
                                box.numerator_start,
                                box.numerator_end,
                            )}{' '}
                            · {formatQuantity(box.total_sets)} set
                        </p>
                    }
                    actions={
                        <>
                            {can.createAllocation &&
                            box.available_quantity > 0 ? (
                                <Button asChild>
                                    <Link
                                        href={createAllocation({
                                            query: { box: box.id },
                                        })}
                                    >
                                        <ArrowRightLeft />
                                        Buat alokasi
                                    </Link>
                                </Button>
                            ) : null}
                            {can.edit ? (
                                <Button variant="outline" asChild>
                                    <Link href={edit(box.id)}>
                                        <Pencil />
                                        Ubah metadata
                                    </Link>
                                </Button>
                            ) : null}
                            {can.delete ? <BoxDeleteDialog box={box} /> : null}
                        </>
                    }
                />

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identitas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Tanggal diterima"
                                    value={formatDate(box.received_at)}
                                />
                                <DetailRow
                                    label="Didaftarkan oleh"
                                    value={box.creator.name}
                                />
                                <DetailRow
                                    label="Lokasi penyimpanan"
                                    value={box.central_storage_location}
                                />
                                <DetailRow
                                    label="Loket penerima"
                                    value={
                                        box.loket?.name ??
                                        'Belum ada alokasi aktif'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Rentang Nomerator</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomerator awal"
                                    value={formatNomerator(box.numerator_start)}
                                    mono
                                />
                                <DetailRow
                                    label="Nomerator akhir"
                                    value={formatNomerator(box.numerator_end)}
                                    mono
                                />
                                <DetailRow
                                    label="Total"
                                    value={`${formatQuantity(box.total_sets)} set`}
                                    numeric
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Persediaan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Tersedia"
                                    value={`${formatQuantity(box.available_quantity)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Menunggu handover"
                                    value={`${formatQuantity(box.pending_quantity)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Diterima Loket"
                                    value={`${formatQuantity(box.allocated_quantity)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Terpakai"
                                    value={`${formatQuantity(box.used_quantity)} set`}
                                    numeric
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat alokasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={box.allocations}
                            columns={allocationColumns}
                            getRowKey={(allocation) => allocation.id}
                            rowHref={(allocation) =>
                                allocationShow(allocation.id)
                            }
                            minWidthClassName="min-w-240"
                            caption={`Riwayat alokasi ${box.box_number}`}
                            actions={(allocation) => (
                                <Button variant="ghost" size="icon" asChild>
                                    <Link
                                        href={allocationShow(allocation.id)}
                                        aria-label={`Lihat alokasi ${allocation.loket.name}`}
                                        title="Lihat detail"
                                    >
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            empty={
                                <EmptyState
                                    icon={ArrowRightLeft}
                                    title="Belum ada alokasi dari Box ini."
                                    description="Alokasi ke Loket yang dibuat dari Box ini akan muncul di sini."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <RecentActivityCard entries={box.timeline} />
            </div>
        </>
    );
}

ShowBox.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Box SKPD', href: index() },
        { title: props.box.box_number, href: show(props.box.id) },
    ],
});
