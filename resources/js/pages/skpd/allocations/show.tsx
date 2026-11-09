import { Head, Link, usePage } from '@inertiajs/react';
import { Info, PackageCheck, Pencil, Undo2, XCircle } from 'lucide-react';
import SkpdAllocationController from '@/actions/App/Http/Controllers/SkpdAllocationController';
import {
    AllocationStatusBadge,
    type AllocationStatus,
} from '@/components/allocation/allocation-status-badge';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import FormErrorSummary from '@/components/form-error-summary';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { edit, index, show } from '@/routes/skpd/allocations';
import { show as boxShow } from '@/routes/skpd/boxes';

type Allocation = {
    id: number;
    box: { id: number; box_number: string };
    loket: { id: number; name: string };
    allocation_date: string | null;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
    used_quantity: number;
    remaining_quantity: number;
    status: AllocationStatus;
    created_by: string;
    created_at: string;
    accepted_by: string | null;
    accepted_at: string | null;
    can: {
        accept: boolean;
        edit: boolean;
        cancel: boolean;
        return_remainder: boolean;
    };
    timeline: ActivityEntry[];
};

type Props = { allocation: Allocation };

export default function ShowAllocation({ allocation }: Props) {
    const { errors } = usePage().props;

    return (
        <>
            <Head title={`Alokasi ${allocation.box.box_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke daftar alokasi' }}
                    title={`Alokasi ${allocation.box.box_number}`}
                    badges={
                        <AllocationStatusBadge status={allocation.status} />
                    }
                    meta={
                        <p className="text-muted-foreground text-sm">
                            <span className="font-mono">
                                {formatRange(
                                    allocation.numerator_start,
                                    allocation.numerator_end,
                                )}
                            </span>{' '}
                            · {formatQuantity(allocation.quantity)} set untuk{' '}
                            {allocation.loket.name}
                        </p>
                    }
                    actions={
                        <>
                            {allocation.can.edit ? (
                                <Button variant="outline" asChild>
                                    <Link href={edit(allocation.id)}>
                                        <Pencil />
                                        Ubah alokasi
                                    </Link>
                                </Button>
                            ) : null}
                            {allocation.can.accept ? (
                                <ConfirmActionDialog
                                    action={SkpdAllocationController.accept(
                                        allocation.id,
                                    )}
                                    trigger={
                                        <Button>
                                            <PackageCheck />
                                            Terima handover
                                        </Button>
                                    }
                                    title="Terima handover alokasi?"
                                    description="Setelah diterima, alokasi menjadi persediaan Loket dan tidak dapat diubah atau dibatalkan. Pastikan Box dan rentang Nomerator fisik sudah sesuai."
                                    confirmLabel="Ya, terima handover"
                                    processingLabel="Menerima..."
                                    errorTitle="Handover tidak dapat diterima."
                                >
                                    <AllocationSummary
                                        allocation={allocation}
                                    />
                                </ConfirmActionDialog>
                            ) : null}
                            {allocation.can.cancel ? (
                                <ConfirmActionDialog
                                    action={SkpdAllocationController.cancel(
                                        allocation.id,
                                    )}
                                    trigger={
                                        <Button variant="destructive">
                                            <XCircle />
                                            Batalkan alokasi
                                        </Button>
                                    }
                                    title="Batalkan alokasi ini?"
                                    description="Alokasi akan berstatus Dibatalkan dan rentang Nomerator-nya kembali tersedia di Box untuk dialokasikan ulang. Riwayat audit tetap disimpan."
                                    confirmLabel="Ya, batalkan alokasi"
                                    processingLabel="Membatalkan..."
                                    errorTitle="Alokasi tidak dapat dibatalkan."
                                    destructive
                                >
                                    <AllocationSummary
                                        allocation={allocation}
                                    />
                                </ConfirmActionDialog>
                            ) : null}
                            {allocation.can.return_remainder ? (
                                <ConfirmActionDialog
                                    action={SkpdAllocationController.returnRemainder(
                                        allocation.id,
                                    )}
                                    trigger={
                                        <Button variant="outline">
                                            <Undo2 />
                                            Kembalikan sisa ke pusat
                                        </Button>
                                    }
                                    title="Kembalikan sisa Nomerator ke pusat?"
                                    description={`Sisa ${formatQuantity(allocation.remaining_quantity)} set yang belum dipakai Loket akan ditarik ke Box dan dapat dialokasikan ulang. Nomerator yang sudah tercatat di BAP (termasuk draft) tetap milik Loket.`}
                                    confirmLabel="Ya, kembalikan sisa"
                                    processingLabel="Mengembalikan..."
                                    errorTitle="Sisa alokasi tidak dapat dikembalikan."
                                >
                                    <AllocationSummary
                                        allocation={allocation}
                                    />
                                    <div className="grid gap-2">
                                        <Label htmlFor="return-remainder-reason">
                                            Alasan pengembalian
                                        </Label>
                                        <Textarea
                                            id="return-remainder-reason"
                                            name="reason"
                                            rows={3}
                                            maxLength={1000}
                                            required
                                            placeholder="Contoh: Loket ditutup sementara, sisa Bukti SKPD ditarik ke gudang."
                                        />
                                    </div>
                                </ConfirmActionDialog>
                            ) : null}
                        </>
                    }
                />

                <FormErrorSummary
                    errors={errors}
                    title="Aksi alokasi tidak dapat diproses."
                />

                {allocation.status === 'pending' ? (
                    <p className="border-info/30 bg-info/10 flex gap-3 rounded-xl border p-4 text-sm">
                        <Info className="text-info mt-0.5 size-4 shrink-0" />
                        <span>
                            Alokasi ini menunggu diterima Petugas Loket{' '}
                            {allocation.loket.name}. Persediaan Loket baru aktif
                            setelah handover diterima.
                        </span>
                    </p>
                ) : null}

                {allocation.status === 'accepted' ? (
                    <p className="text-muted-foreground rounded-xl border p-4 text-sm">
                        Alokasi yang sudah diterima Loket tidak dapat diubah.
                        Sisa yang belum dipakai hanya dapat dikembalikan ke
                        pusat oleh Bendahara Barang.
                    </p>
                ) : null}

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribusi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Box"
                                    value={
                                        <Link
                                            href={boxShow(allocation.box.id)}
                                            className="hover:underline"
                                        >
                                            {allocation.box.box_number}
                                        </Link>
                                    }
                                />
                                <DetailRow
                                    label="Loket"
                                    value={allocation.loket.name}
                                />
                                <DetailRow
                                    label="Tanggal alokasi"
                                    value={
                                        allocation.allocation_date
                                            ? formatDate(
                                                  allocation.allocation_date,
                                              )
                                            : 'Belum tercatat'
                                    }
                                />
                                <DetailRow
                                    label="Dibuat oleh"
                                    value={allocation.created_by}
                                />
                                <DetailRow
                                    label="Dibuat pada"
                                    value={formatDateTime(
                                        allocation.created_at,
                                    )}
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Rentang dan jumlah</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomerator awal"
                                    value={formatNomerator(
                                        allocation.numerator_start,
                                    )}
                                    mono
                                />
                                <DetailRow
                                    label="Nomerator akhir"
                                    value={formatNomerator(
                                        allocation.numerator_end,
                                    )}
                                    mono
                                />
                                <DetailRow
                                    label="Jumlah"
                                    value={`${formatQuantity(allocation.quantity)} set`}
                                    numeric
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Persediaan Loket</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Terpakai"
                                    value={`${formatQuantity(allocation.used_quantity)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Sisa"
                                    value={`${formatQuantity(allocation.remaining_quantity)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Diterima oleh"
                                    value={
                                        allocation.accepted_at
                                            ? `${allocation.accepted_by ?? '—'} · ${formatDateTime(allocation.accepted_at)}`
                                            : 'Belum diterima'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                </section>

                <RecentActivityCard entries={allocation.timeline} />
            </div>
        </>
    );
}

function AllocationSummary({ allocation }: { allocation: Allocation }) {
    return (
        <DetailList className="bg-muted rounded-xl p-4">
            <DetailRow label="Box" value={allocation.box.box_number} />
            <DetailRow label="Loket" value={allocation.loket.name} />
            <DetailRow
                label="Rentang Nomerator"
                value={formatRange(
                    allocation.numerator_start,
                    allocation.numerator_end,
                )}
                mono
            />
            <DetailRow
                label="Jumlah"
                value={`${formatQuantity(allocation.quantity)} set`}
                numeric
            />
            <DetailRow
                label="Sudah dipakai"
                value={`${formatQuantity(allocation.used_quantity)} set`}
                numeric
            />
        </DetailList>
    );
}

ShowAllocation.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Distribusi / Alokasi', href: index() },
        {
            title: `Alokasi ${props.allocation.box.box_number}`,
            href: show(props.allocation.id),
        },
    ],
});
