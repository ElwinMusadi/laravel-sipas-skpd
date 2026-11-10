import { Head, Link, usePage } from '@inertiajs/react';
import {
    Archive,
    ArrowRightLeft,
    Boxes,
    CheckCircle2,
    Clock3,
    Eye,
    PackageCheck,
    PackagePlus,
    Plus,
    ReceiptText,
    TriangleAlert,
    UserX,
} from 'lucide-react';
import {
    AllocationStatusBadge,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { BoxStatusBadge } from '@/components/inventory/box-status-badge';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { InventoryMetricCard } from '@/components/inventory/inventory-metric-card';
import type { SkpdBoxSummary } from '@/components/inventory/types';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    create as allocationCreate,
    index as allocationsIndex,
    show as allocationShow,
} from '@/routes/skpd/allocations';
import {
    create as boxCreate,
    index as boxesIndex,
    show as boxShow,
} from '@/routes/skpd/boxes';
import { index } from '@/routes/skpd/inventory';

type CentralMetrics = {
    total_boxes: number;
    total_inventory: number;
    available_quantity: number;
    allocated_quantity: number;
    used_quantity: number;
    pending_allocations: number;
    active_allocations: number;
    nearly_depleted_boxes: number;
};

type LoketAllocation = {
    id: number;
    box_number: string;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
    status: AllocationStatus;
    allocation_date: string | null;
};

type LoketMetrics = {
    received_quantity: number;
    used_quantity: number;
    remaining_quantity: number;
    pending_allocations: number;
};

type Props =
    | {
          scope: 'central';
          metrics: CentralMetrics;
          recent_boxes: SkpdBoxSummary[];
      }
    | {
          scope: 'loket';
          loket: { id: number; name: string } | null;
          metrics: LoketMetrics;
          recent_allocations: LoketAllocation[];
      };

const pendingAllocationsHref = allocationsIndex({
    query: { status: 'pending' },
});

const boxColumns: DataTableColumn<SkpdBoxSummary>[] = [
    {
        id: 'box_number',
        header: 'Nomor Box',
        cell: (box) => box.box_number,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (box) => formatRange(box.numerator_start, box.numerator_end),
        mono: true,
        mobile: 'subtitle',
    },
    {
        id: 'status',
        status: true,
        header: 'Status',
        cell: (box) => <BoxStatusBadge status={box.status} />,
        mobile: 'badge',
    },
    {
        id: 'available',
        header: 'Tersedia',
        cell: (box) => `${formatQuantity(box.available_quantity)} set`,
        numeric: true,
    },
    {
        id: 'received_at',
        header: 'Diterima',
        cell: (box) => formatDate(box.received_at),
        className: 'whitespace-nowrap',
    },
];

const allocationColumns: DataTableColumn<LoketAllocation>[] = [
    {
        id: 'box_number',
        header: 'Box',
        cell: (allocation) => allocation.box_number,
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
        status: true,
        header: 'Status',
        cell: (allocation) => (
            <AllocationStatusBadge status={allocation.status} />
        ),
        mobile: 'badge',
    },
    {
        id: 'quantity',
        header: 'Jumlah',
        cell: (allocation) => `${formatQuantity(allocation.quantity)} set`,
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
];

export default function SkpdInventory(props: Props) {
    return (
        <>
            <Head title="Persediaan SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                {props.scope === 'central' ? (
                    <CentralInventory {...props} />
                ) : (
                    <LoketInventory {...props} />
                )}
            </div>
        </>
    );
}

function CentralInventory({
    metrics,
    recent_boxes: recentBoxes,
}: Extract<Props, { scope: 'central' }>) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.manageSkpdInventory;

    return (
        <>
            <PageHeader
                title="Persediaan SKPD"
                description="Ringkasan Box, alokasi, dan pemakaian Bukti SKPD yang tercatat. Alokasi yang menunggu handover masih tersimpan di pusat, tetapi tidak lagi tersedia untuk alokasi baru."
                actions={
                    canManage ? (
                        <>
                            <Button variant="outline" asChild>
                                <Link href={boxCreate()}>
                                    <Plus />
                                    Tambah Box
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={allocationCreate()}>
                                    <PackagePlus />
                                    Buat alokasi
                                </Link>
                            </Button>
                        </>
                    ) : null
                }
            />

            <section
                aria-label="Ringkasan persediaan"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <InventoryMetricCard
                    label="Total persediaan"
                    value={`${formatQuantity(metrics.total_inventory)} set`}
                    description={`Dari ${formatQuantity(metrics.total_boxes)} Box, di luar yang sudah terpakai`}
                    icon={Boxes}
                />
                <InventoryMetricCard
                    label="Tersedia"
                    value={`${formatQuantity(metrics.available_quantity)} set`}
                    description="Siap untuk alokasi baru"
                    icon={PackageCheck}
                />
                <InventoryMetricCard
                    label="Dialokasikan"
                    value={`${formatQuantity(metrics.allocated_quantity)} set`}
                    description="Sudah diterima Loket"
                    icon={Archive}
                />
                <InventoryMetricCard
                    label="Terpakai"
                    value={`${formatQuantity(metrics.used_quantity)} set`}
                    description="Tercatat pada BAP"
                    icon={ReceiptText}
                />
            </section>

            <section
                aria-label="Status alokasi"
                className="grid gap-4 sm:grid-cols-3"
            >
                <InventoryMetricCard
                    label="Menunggu handover"
                    value={`${formatQuantity(metrics.pending_allocations)} alokasi`}
                    description="Belum diterima Petugas Loket"
                    icon={Clock3}
                    href={pendingAllocationsHref}
                    linkLabel="Lihat alokasi"
                />
                <InventoryMetricCard
                    label="Alokasi aktif"
                    value={`${formatQuantity(metrics.active_allocations)} alokasi`}
                    description="Sudah diterima dan masih dipakai Loket"
                    icon={ArrowRightLeft}
                    href={allocationsIndex({ query: { status: 'accepted' } })}
                    linkLabel="Lihat alokasi"
                />
                <InventoryMetricCard
                    label="Box hampir habis"
                    value={`${formatQuantity(metrics.nearly_depleted_boxes)} Box`}
                    description="Sisa tersedia maksimal 10%"
                    icon={TriangleAlert}
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Box terbaru</CardTitle>
                    <CardDescription>
                        Lima penerimaan Box SKPD terakhir.
                    </CardDescription>
                    <CardAction>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={boxesIndex()}>Lihat semua Box</Link>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <DataTable
                        rows={recentBoxes}
                        columns={boxColumns}
                        getRowKey={(box) => box.id}
                        rowHref={(box) => boxShow(box.id)}
                        breakpoint="md"
                        caption="Box SKPD terbaru"
                        actions={(box) => (
                            <Button variant="ghost" size="icon" asChild>
                                <Link
                                    href={boxShow(box.id)}
                                    aria-label={`Lihat ${box.box_number}`}
                                    title="Lihat detail"
                                >
                                    <Eye />
                                </Link>
                            </Button>
                        )}
                        empty={
                            <EmptyState
                                icon={Boxes}
                                title="Belum ada Box SKPD."
                                description="Bendahara Barang dapat mendaftarkan Box saat persediaan diterima."
                                action={
                                    canManage ? (
                                        <Button asChild>
                                            <Link href={boxCreate()}>
                                                <Plus />
                                                Tambah Box
                                            </Link>
                                        </Button>
                                    ) : null
                                }
                            />
                        }
                    />
                </CardContent>
            </Card>
        </>
    );
}

function LoketInventory({
    loket,
    metrics,
    recent_allocations: recentAllocations,
}: Extract<Props, { scope: 'loket' }>) {
    if (loket === null) {
        return (
            <>
                <PageHeader title="Persediaan SKPD" />
                <Card>
                    <CardContent>
                        <EmptyState
                            icon={UserX}
                            title="Akun Anda belum ditugaskan ke Loket."
                            description="Persediaan Loket akan tampil setelah Superadmin menetapkan Loket untuk akun Anda."
                        />
                    </CardContent>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={`Persediaan ${loket.name}`}
                description="Persediaan administratif Loket. Hanya alokasi yang sudah diterima menjadi persediaan aktif Loket ini."
            />

            <section
                aria-label="Ringkasan persediaan Loket"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <InventoryMetricCard
                    label="Total diterima"
                    value={`${formatQuantity(metrics.received_quantity)} set`}
                    description="Dari alokasi yang sudah diterima"
                    icon={PackageCheck}
                />
                <InventoryMetricCard
                    label="Terpakai"
                    value={`${formatQuantity(metrics.used_quantity)} set`}
                    description="Tercatat pada BAP"
                    icon={ReceiptText}
                />
                <InventoryMetricCard
                    label="Tersisa"
                    value={`${formatQuantity(metrics.remaining_quantity)} set`}
                    description="Belum tercatat sebagai pemakaian"
                    icon={Archive}
                />
                <InventoryMetricCard
                    label="Menunggu handover"
                    value={`${formatQuantity(metrics.pending_allocations)} alokasi`}
                    description="Belum menjadi persediaan aktif"
                    icon={Clock3}
                    href={pendingAllocationsHref}
                    linkLabel={
                        metrics.pending_allocations > 0
                            ? 'Terima handover'
                            : 'Lihat alokasi'
                    }
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Alokasi terbaru</CardTitle>
                    <CardDescription>
                        Lima alokasi terakhir untuk Loket ini.
                    </CardDescription>
                    <CardAction>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={allocationsIndex()}>
                                Lihat semua alokasi
                            </Link>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <DataTable
                        rows={recentAllocations}
                        columns={allocationColumns}
                        getRowKey={(allocation) => allocation.id}
                        rowHref={(allocation) => allocationShow(allocation.id)}
                        breakpoint="md"
                        caption="Alokasi terbaru Loket"
                        actions={(allocation) => (
                            <Button variant="ghost" size="icon" asChild>
                                <Link
                                    href={allocationShow(allocation.id)}
                                    aria-label={`Lihat alokasi ${allocation.box_number}`}
                                    title="Lihat detail"
                                >
                                    <Eye />
                                </Link>
                            </Button>
                        )}
                        empty={
                            <EmptyState
                                icon={CheckCircle2}
                                title="Belum ada alokasi untuk Loket ini."
                                description="Alokasi dari Bendahara Barang akan muncul di sini dan perlu diterima sebelum dipakai."
                            />
                        }
                    />
                </CardContent>
            </Card>
        </>
    );
}

SkpdInventory.layout = {
    breadcrumbs: [{ title: 'Persediaan SKPD', href: index() }],
};
