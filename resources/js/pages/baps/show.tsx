import { Head, Link } from '@inertiajs/react';
import { Eye, History, MessageSquare, Pencil, Printer } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge, type StatusMeta } from '@/components/app/status-badge';
import {
    BapCorrectionNotice,
    type BapCorrectionRequest,
} from '@/components/bap/bap-correction-notice';
import { BapDeleteDialog } from '@/components/bap/bap-delete-dialog';
import { BapHardDeleteDialog } from '@/components/bap/bap-hard-delete-dialog';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import { BapSubmitDialog } from '@/components/bap/bap-submit-dialog';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { show as showCancellation } from '@/routes/bap-cancellations';
import { show as showClarification } from '@/routes/bap-clarifications';
import { edit, index, pdf, show } from '@/routes/baps';

type Segment = {
    id: number;
    allocation_id: number;
    box_number: string;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
};

type Cancellation = {
    id: number;
    numerator: number;
    reason:
        | 'cancelled'
        | 'damaged'
        | 'network_error'
        | 'printer_error'
        | 'custom';
    reason_label: string;
    description: string | null;
    created_by: string;
    created_at: string;
};

type Verification = {
    id: number;
    stage: 'phase_1' | 'phase_2';
    stage_label: string;
    attempt: number;
    verifier: string;
    result: 'passed' | 'discrepancy' | null;
    started_at: string;
    completed_at: string | null;
    clarification: {
        id: number;
        status: 'waiting_response' | 'responded' | 'resolved' | 'reopened';
        status_label: string;
        can_view: boolean;
    } | null;
};

type Props = {
    bap: {
        id: number;
        document_number: string;
        service_date: string;
        loket: { id: number; name: string };
        numerator_start: number;
        numerator_end: number;
        total_usage: number;
        online_usage_count: number;
        non_online_usage_count: number;
        cancellation_count: number;
        status: BapStatus;
        created_by: string;
        creator_role: string;
        created_at: string;
        submitted_at: string | null;
        can: {
            edit: boolean;
            submit: boolean;
            delete: boolean;
            hard_delete: boolean;
        };
        segments: Segment[];
        cancellations: {
            items: Cancellation[];
            quantity: number;
            normal_usage_quantity: number;
        };
        timeline: {
            id: number;
            event: string;
            actor: string;
            created_at: string;
        }[];
        verification_history: Verification[];
        correction_request: BapCorrectionRequest | null;
    };
};

const verificationResultMeta: Record<
    'passed' | 'discrepancy' | 'in_progress',
    StatusMeta
> = {
    passed: { label: 'Lulus', tone: 'success' },
    discrepancy: { label: 'Ada selisih', tone: 'danger' },
    in_progress: { label: 'Sedang diperiksa', tone: 'info' },
};

const segmentColumns: DataTableColumn<Segment>[] = [
    {
        id: 'box',
        header: 'Box',
        cell: (segment) => segment.box_number,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'allocation',
        header: 'Alokasi',
        cell: (segment) => `#${segment.allocation_id}`,
        className: 'tabular-nums',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (segment) =>
            formatRange(segment.numerator_start, segment.numerator_end),
        mono: true,
    },
    {
        id: 'quantity',
        header: 'Jumlah',
        cell: (segment) => `${formatQuantity(segment.quantity)} set`,
        numeric: true,
    },
];

const cancellationColumns: DataTableColumn<Cancellation>[] = [
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
        id: 'reason',
        header: 'Klasifikasi',
        cell: (cancellation) => (
            <StatusBadge label={cancellation.reason_label} tone="neutral" />
        ),
        mobile: 'badge',
    },
    {
        id: 'description',
        header: 'Keterangan singkat',
        cell: (cancellation) => (
            <span className="line-clamp-2">
                {cancellation.description ?? '—'}
            </span>
        ),
        className: 'max-w-sm',
    },
    {
        id: 'created_by',
        header: 'Dicatat oleh',
        cell: (cancellation) => cancellation.created_by,
    },
];

export default function ShowBap({ bap }: Props) {
    return (
        <>
            <Head title={bap.document_number} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke BAP SKPD' }}
                    title={bap.document_number}
                    badges={<BapStatusBadge status={bap.status} />}
                    description={`${bap.loket.name} · ${formatDate(bap.service_date)}`}
                    meta={
                        <p className="text-muted-foreground font-mono text-sm">
                            {formatRange(
                                bap.numerator_start,
                                bap.numerator_end,
                            )}
                        </p>
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <a
                                    href={pdf.url(bap.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Printer data-icon="inline-start" />
                                    Cetak BAP
                                </a>
                            </Button>
                            {bap.can.edit ? (
                                <Button variant="outline" asChild>
                                    <Link href={edit(bap.id)}>
                                        <Pencil data-icon="inline-start" />
                                        Ubah draft
                                    </Link>
                                </Button>
                            ) : null}
                            {bap.can.submit ? (
                                <BapSubmitDialog bap={bap} />
                            ) : null}
                            {bap.can.delete ? (
                                <BapDeleteDialog bap={bap} />
                            ) : null}
                            {bap.can.hard_delete ? (
                                <BapHardDeleteDialog bap={bap} />
                            ) : null}
                        </>
                    }
                />

                {bap.correction_request ? (
                    <BapCorrectionNotice correction={bap.correction_request} />
                ) : bap.status !== 'draft' ? (
                    <p className="border-primary/25 bg-primary/8 rounded-xl border p-4 text-sm">
                        BAP yang sudah diajukan tidak dapat diubah. Status
                        verifikasi dan riwayat pemeriksaannya tersedia di
                        halaman ini.
                    </p>
                ) : (
                    <p className="text-muted-foreground rounded-xl border p-4 text-sm">
                        Periksa detail pemakaian berikut sebelum mengajukan BAP.
                        Setelah diajukan, data tidak dapat diubah bebas.
                    </p>
                )}

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi BAP</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomor dokumen"
                                    value={bap.document_number}
                                />
                                <DetailRow
                                    label="Dibuat oleh"
                                    value={bap.created_by}
                                />
                                <DetailRow
                                    label="Peran pembuat"
                                    value={bap.creator_role}
                                />
                                <DetailRow
                                    label="Dibuat pada"
                                    value={formatDateTime(bap.created_at)}
                                />
                                <DetailRow
                                    label="Diajukan pada"
                                    value={
                                        bap.submitted_at
                                            ? formatDateTime(bap.submitted_at)
                                            : 'Belum diajukan'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Loket dan tanggal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Loket"
                                    value={bap.loket.name}
                                />
                                <DetailRow
                                    label="Tanggal pelayanan"
                                    value={formatDate(bap.service_date)}
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Pemakaian</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomerator awal"
                                    value={formatNomerator(bap.numerator_start)}
                                    mono
                                />
                                <DetailRow
                                    label="Nomerator akhir"
                                    value={formatNomerator(bap.numerator_end)}
                                    mono
                                />
                                <DetailRow
                                    label="Total pemakaian"
                                    value={`${formatQuantity(bap.total_usage)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Online"
                                    value={`${formatQuantity(bap.online_usage_count)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Non-online"
                                    value={`${formatQuantity(bap.non_online_usage_count)} set`}
                                    numeric
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Riwayat verifikasi dan klarifikasi
                        </CardTitle>
                        <CardDescription>
                            Setiap pemeriksaan dan klarifikasi tersimpan
                            terpisah dari data BAP.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bap.verification_history.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                BAP belum memiliki riwayat verifikasi.
                            </p>
                        ) : (
                            <ul className="grid gap-3">
                                {bap.verification_history.map(
                                    (verification) => (
                                        <VerificationItem
                                            key={verification.id}
                                            verification={verification}
                                        />
                                    ),
                                )}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Batal/Rusak</CardTitle>
                        <CardDescription>
                            Nomerator Batal/Rusak tetap dihitung sebagai
                            pemakaian BAP.
                        </CardDescription>
                        <CardAction className="text-muted-foreground text-sm tabular-nums">
                            {formatQuantity(bap.cancellations.quantity)} dari{' '}
                            {formatQuantity(bap.total_usage)} set
                        </CardAction>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <SummaryValue
                                label="Total pemakaian"
                                value={`${formatQuantity(bap.total_usage)} set`}
                            />
                            <SummaryValue
                                label="Batal/Rusak"
                                value={`${formatQuantity(bap.cancellations.quantity)} set`}
                            />
                            <SummaryValue
                                label="Pemakaian normal (termasuk online)"
                                value={`${formatQuantity(bap.cancellations.normal_usage_quantity)} set`}
                            />
                        </div>

                        <DataTable
                            rows={bap.cancellations.items}
                            columns={cancellationColumns}
                            getRowKey={(cancellation) => cancellation.id}
                            rowHref={(cancellation) =>
                                showCancellation(cancellation.id)
                            }
                            breakpoint="md"
                            minWidthClassName="min-w-2xl"
                            caption="Nomerator Batal/Rusak pada BAP ini"
                            actions={(cancellation) => (
                                <Button variant="ghost" size="icon" asChild>
                                    <Link
                                        href={showCancellation(cancellation.id)}
                                        aria-label={`Lihat detail Batal/Rusak ${formatNomerator(cancellation.numerator)}`}
                                        title="Lihat detail"
                                    >
                                        <Eye />
                                    </Link>
                                </Button>
                            )}
                            empty={
                                <p className="text-muted-foreground text-sm">
                                    Tidak ada Nomerator Batal/Rusak pada BAP
                                    ini.
                                </p>
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rincian pemakaian per Box</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={bap.segments}
                            columns={segmentColumns}
                            getRowKey={(segment) => segment.id}
                            breakpoint="md"
                            minWidthClassName="min-w-152"
                            caption="Rincian pemakaian per Box"
                            empty={
                                <p className="text-muted-foreground text-sm">
                                    Belum ada rincian pemakaian per Box.
                                </p>
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex-row items-center gap-2">
                        <History className="text-muted-foreground size-4" />
                        <CardTitle>Riwayat singkat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {bap.timeline.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Belum ada riwayat yang dapat ditampilkan.
                            </p>
                        ) : (
                            <ol className="space-y-4">
                                {bap.timeline.map((entry, entryIndex) => (
                                    <li key={entry.id}>
                                        {entryIndex > 0 ? (
                                            <Separator className="mb-4" />
                                        ) : null}
                                        <p className="font-medium">
                                            {entry.event}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            {entry.actor} ·{' '}
                                            {formatDateTime(entry.created_at)}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function VerificationItem({ verification }: { verification: Verification }) {
    const result = verificationResultMeta[verification.result ?? 'in_progress'];
    const clarification = verification.clarification;

    return (
        <li className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div className="grid gap-1 text-sm">
                <p className="font-medium">
                    {`${verification.stage_label} · Pemeriksaan ke-${verification.attempt}`}
                </p>
                <p className="text-muted-foreground">
                    {verification.verifier} ·{' '}
                    {verification.completed_at
                        ? `Selesai ${formatDateTime(verification.completed_at)}`
                        : `Dimulai ${formatDateTime(verification.started_at)}`}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusBadge {...result} />
                {clarification === null ? null : clarification.can_view ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={showClarification(clarification.id)}>
                            <MessageSquare data-icon="inline-start" />
                            Klarifikasi: {clarification.status_label}
                        </Link>
                    </Button>
                ) : (
                    <span className="text-muted-foreground text-sm">
                        Klarifikasi: {clarification.status_label}
                    </span>
                )}
            </div>
        </li>
    );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-muted rounded-xl p-4">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-1 font-semibold tabular-nums">{value}</p>
        </div>
    );
}

ShowBap.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: props.bap.document_number, href: show(props.bap.id) },
    ],
});
