import { Head, Link } from '@inertiajs/react';
import {
    Archive,
    Boxes,
    CheckCircle2,
    Clock3,
    PackageCheck,
    ReceiptText,
} from 'lucide-react';
import { AllocationStatusBadge } from '@/components/allocation/allocation-status-badge';
import { EmptyState } from '@/components/app/empty-state';
import { BoxStatusBadge } from '@/components/inventory/box-status-badge';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { InventoryMetricCard } from '@/components/inventory/inventory-metric-card';
import type { SkpdBoxSummary } from '@/components/inventory/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { show as allocationShow } from '@/routes/skpd/allocations';
import { index as boxesIndex, show as boxShow } from '@/routes/skpd/boxes';
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
    status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'returned';
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

export default function SkpdInventory(props: Props) {
    return (
        <>
            <Head title="Persediaan SKPD" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                {props.scope === 'central' ? (
                    <CentralInventory {...props} />
                ) : (
                    <LoketInventory {...props} />
                )}
            </main>
        </>
    );
}

function CentralInventory({
    metrics,
    recent_boxes: recentBoxes,
}: Extract<Props, { scope: 'central' }>) {
    return (
        <>
            <section className="space-y-1.5">
                <p className="text-muted-foreground text-sm">Inventory pusat</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Persediaan SKPD
                </h1>
                <p className="text-muted-foreground max-w-3xl text-sm">
                    Ringkasan ledger Box, alokasi, dan pemakaian yang tercatat.
                    Alokasi pending masih berada fisik di pusat, tetapi sudah
                    tidak tersedia untuk alokasi baru.
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InventoryMetricCard
                    label="Total Persediaan"
                    value={`${formatQuantity(metrics.total_inventory)} set`}
                    description={`${formatQuantity(metrics.total_boxes)} Box terdaftar`}
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
                    description="Persediaan administratif Loket"
                    icon={Archive}
                />
                <InventoryMetricCard
                    label="Terpakai"
                    value={`${formatQuantity(metrics.used_quantity)} set`}
                    description="Berdasarkan segment BAP"
                    icon={ReceiptText}
                />
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <Card size="sm">
                    <CardContent className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            Handover pending
                        </p>
                        <p className="text-xl font-semibold">
                            {formatQuantity(metrics.pending_allocations)}
                        </p>
                    </CardContent>
                </Card>
                <Card size="sm">
                    <CardContent className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            Alokasi aktif
                        </p>
                        <p className="text-xl font-semibold">
                            {formatQuantity(metrics.active_allocations)}
                        </p>
                    </CardContent>
                </Card>
                <Card size="sm">
                    <CardContent className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            Box hampir habis
                        </p>
                        <p className="text-xl font-semibold">
                            {formatQuantity(metrics.nearly_depleted_boxes)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Sisa tersedia maksimal 10%
                        </p>
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader className="flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle>Box terbaru</CardTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Lima penerimaan Box SKPD terakhir.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={boxesIndex()}>Lihat Box</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentBoxes.length === 0 ? (
                        <EmptyState
                            icon={Boxes}
                            title="Belum ada Box SKPD."
                            description="Bendahara Barang dapat mendaftarkan Box saat persediaan diterima."
                        />
                    ) : (
                        <div className="divide-y">
                            {recentBoxes.map((box) => (
                                <Link
                                    key={box.id}
                                    href={boxShow(box.id)}
                                    className="hover:bg-muted/50 grid gap-3 rounded-lg py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {box.box_number}
                                        </p>
                                        <p className="text-muted-foreground font-mono text-xs">
                                            {formatRange(
                                                box.numerator_start,
                                                box.numerator_end,
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-muted-foreground text-sm sm:text-right">
                                        {formatQuantity(box.available_quantity)}{' '}
                                        set tersedia
                                    </div>
                                    <div className="flex items-center gap-2 sm:justify-end">
                                        <BoxStatusBadge status={box.status} />
                                        <span className="text-muted-foreground text-xs">
                                            {formatDate(box.received_at)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
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
    return (
        <>
            <section className="space-y-1.5">
                <p className="text-muted-foreground text-sm">
                    Persediaan administratif Loket
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {loket?.name ?? 'Loket belum ditetapkan'}
                </h1>
                <p className="text-muted-foreground max-w-3xl text-sm">
                    Hanya alokasi yang sudah diterima menjadi persediaan aktif
                    Loket ini.
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InventoryMetricCard
                    label="Total diterima"
                    value={`${formatQuantity(metrics.received_quantity)} set`}
                    description="Alokasi accepted dan completed"
                    icon={PackageCheck}
                />
                <InventoryMetricCard
                    label="Terpakai"
                    value={`${formatQuantity(metrics.used_quantity)} set`}
                    description="Berdasarkan segment BAP"
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
                    value={formatQuantity(metrics.pending_allocations)}
                    description="Belum menjadi persediaan aktif"
                    icon={Clock3}
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Alokasi terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentAllocations.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle2}
                            title="Belum ada distribusi SKPD."
                            description="Alokasi yang ditujukan ke Loket ini akan muncul di sini."
                        />
                    ) : (
                        <div className="divide-y">
                            {recentAllocations.map((allocation) => (
                                <Link
                                    key={allocation.id}
                                    href={allocationShow(allocation.id)}
                                    className="hover:bg-muted/50 grid gap-3 rounded-lg py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {allocation.box_number}
                                        </p>
                                        <p className="text-muted-foreground font-mono text-xs">
                                            {formatRange(
                                                allocation.numerator_start,
                                                allocation.numerator_end,
                                            )}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {allocation.allocation_date
                                                ? `Dialokasikan ${formatDate(allocation.allocation_date)}`
                                                : 'Tanggal alokasi belum tercatat'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 sm:justify-end">
                                        <span className="text-muted-foreground text-sm">
                                            {formatQuantity(
                                                allocation.quantity,
                                            )}{' '}
                                            set
                                        </span>
                                        <AllocationStatusBadge
                                            status={allocation.status}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

SkpdInventory.layout = {
    breadcrumbs: [{ title: 'Persediaan SKPD', href: index() }],
};
