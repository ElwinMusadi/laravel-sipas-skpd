import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    History,
    MessageSquare,
    Pencil,
    Printer,
} from 'lucide-react';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import { BapSubmitDialog } from '@/components/bap/bap-submit-dialog';
import { BapDeleteDialog } from '@/components/bap/bap-delete-dialog';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { show as showCancellation } from '@/routes/bap-cancellations';
import { edit, index, pdf } from '@/routes/baps';
import { show as showClarification } from '@/routes/bap-clarifications';

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
        status: BapStatus;
        created_by: string;
        creator_role: string;
        created_at: string;
        submitted_at: string | null;
        can: {
            edit: boolean;
            submit: boolean;
            delete: boolean;
        };
        segments: {
            id: number;
            allocation_id: number;
            box_number: string;
            numerator_start: number;
            numerator_end: number;
            quantity: number;
        }[];
        cancellations: {
            items: {
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
            }[];
            quantity: number;
            normal_usage_quantity: number;
        };
        timeline: {
            id: number;
            event: string;
            actor: string;
            created_at: string;
        }[];
        verification_history: {
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
                status:
                    | 'waiting_response'
                    | 'responded'
                    | 'resolved'
                    | 'reopened';
                status_label: string;
                can_view: boolean;
            } | null;
        }[];
    };
};

export default function ShowBap({ bap }: Props) {
    return (
        <>
            <Head title={bap.document_number} />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-2">
                        <Button
                            className="pl-0 hover:no-underline"
                            variant="link"
                            size="sm"
                            asChild
                        >
                            <Link href={index()}>
                                <ArrowLeft />
                                Kembali ke BAP
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {bap.document_number}
                            </h1>
                            <BapStatusBadge status={bap.status} />
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">
                            {formatRange(
                                bap.numerator_start,
                                bap.numerator_end,
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={pdf.url(bap.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Printer />
                                Cetak BAP SKPD
                            </a>
                        </Button>
                        {bap.can.edit ? (
                            <Button variant="outline" asChild>
                                <Link href={edit(bap.id)}>
                                    <Pencil />
                                    Ubah draft
                                </Link>
                            </Button>
                        ) : null}
                        {bap.can.submit ? <BapSubmitDialog bap={bap} /> : null}
                        {bap.can.delete ? <BapDeleteDialog bap={bap} /> : null}
                    </div>
                </div>

                {bap.status !== 'draft' ? (
                    <p className="border-primary/25 bg-primary/8 rounded-xl border p-4 text-sm">
                        BAP ini bersifat read-only setelah diajukan. Status
                        verifikasi dan riwayat pemeriksaannya tersedia pada
                        lifecycle BAP.
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
                        <CardContent className="grid gap-3 text-sm">
                            <DetailRow
                                label="Nomor dokumen"
                                value={bap.document_number}
                            />
                            <DetailRow
                                label="Status"
                                value={<BapStatusBadge status={bap.status} />}
                            />
                            <DetailRow label="Aktor" value={bap.created_by} />
                            <DetailRow
                                label="Role aktor"
                                value={bap.creator_role}
                            />
                            <DetailRow
                                label="Dibuat pada"
                                value={formatDateTime(bap.created_at)}
                            />
                            <DetailRow
                                label="Waktu submit"
                                value={
                                    bap.submitted_at
                                        ? formatDateTime(bap.submitted_at)
                                        : 'Belum diajukan'
                                }
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Loket dan tanggal</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                            <DetailRow label="Loket" value={bap.loket.name} />
                            <DetailRow
                                label="Tanggal pelayanan"
                                value={formatDate(bap.service_date)}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Pemakaian</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
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
                            />
                            <DetailRow
                                label="Online"
                                value={`${formatQuantity(bap.online_usage_count)} set`}
                            />
                            <DetailRow
                                label="Non-online"
                                value={`${formatQuantity(bap.non_online_usage_count)} set`}
                            />
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                        <div className="grid gap-1">
                            <CardTitle>
                                Riwayat verifikasi dan klarifikasi
                            </CardTitle>
                            <p className="text-muted-foreground text-sm">
                                Attempt pemeriksaan dan klarifikasi tersimpan
                                terpisah dari data sumber BAP.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {bap.verification_history.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                BAP belum memiliki riwayat verifikasi.
                            </p>
                        ) : (
                            <div className="grid gap-3">
                                {bap.verification_history.map(
                                    (verification) => (
                                        <div
                                            key={verification.id}
                                            className="border-border flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                                        >
                                            <div className="grid gap-1 text-sm">
                                                <p className="font-medium">
                                                    {verification.stage_label} ·
                                                    Attempt #
                                                    {verification.attempt}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {verification.verifier} ·{' '}
                                                    {verification.completed_at
                                                        ? formatDateTime(
                                                              verification.completed_at,
                                                          )
                                                        : 'Sedang berlangsung'}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {verification.result ===
                                                    'passed'
                                                        ? 'Hasil: Lulus'
                                                        : verification.result ===
                                                            'discrepancy'
                                                          ? 'Hasil: Ada selisih'
                                                          : 'Hasil belum tersedia'}
                                                </p>
                                            </div>
                                            {verification.clarification ? (
                                                verification.clarification
                                                    .can_view ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={showClarification(
                                                                verification
                                                                    .clarification
                                                                    .id,
                                                            )}
                                                        >
                                                            <MessageSquare data-icon="inline-start" />
                                                            {
                                                                verification
                                                                    .clarification
                                                                    .status_label
                                                            }
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">
                                                        {
                                                            verification
                                                                .clarification
                                                                .status_label
                                                        }
                                                    </span>
                                                )
                                            ) : null}
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                        <div className="grid gap-1">
                            <CardTitle>Batal / Rusak</CardTitle>
                            <p className="text-muted-foreground text-sm">
                                Klasifikasi nomerator yang tetap dihitung
                                sebagai pemakaian BAP.
                            </p>
                        </div>
                        <p className="text-muted-foreground text-sm tabular-nums">
                            {formatQuantity(bap.cancellations.quantity)} dari{' '}
                            {formatQuantity(bap.total_usage)} set
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <SummaryValue
                                label="Total pemakaian"
                                value={`${formatQuantity(bap.total_usage)} set`}
                            />
                            <SummaryValue
                                label="Batal/rusak"
                                value={`${formatQuantity(bap.cancellations.quantity)} set`}
                            />
                            <SummaryValue
                                label="Pemakaian normal"
                                value={`${formatQuantity(bap.cancellations.normal_usage_quantity)} set`}
                            />
                        </div>

                        {bap.cancellations.items.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Belum ada nomerator batal atau rusak pada BAP
                                ini.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full min-w-2xl text-sm">
                                    <TableHeader className="text-muted-foreground border-b text-left">
                                        <TableRow>
                                            <TableHead className="px-2 py-3 font-medium">
                                                Nomerator
                                            </TableHead>
                                            <TableHead className="px-2 py-3 font-medium">
                                                Klasifikasi
                                            </TableHead>
                                            <TableHead className="px-2 py-3 font-medium">
                                                Keterangan singkat
                                            </TableHead>
                                            <TableHead className="px-2 py-3 font-medium">
                                                Dicatat oleh
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y">
                                        {bap.cancellations.items.map(
                                            (cancellation) => (
                                                <TableRow key={cancellation.id}>
                                                    <TableCell className="px-2 py-3 font-mono text-xs whitespace-nowrap">
                                                        <Link
                                                            href={showCancellation(
                                                                cancellation.id,
                                                            )}
                                                            className="font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {formatNomerator(
                                                                cancellation.numerator,
                                                            )}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-3">
                                                        {
                                                            cancellation.reason_label
                                                        }
                                                    </TableCell>
                                                    <TableCell className="max-w-sm px-2 py-3">
                                                        <span className="line-clamp-2">
                                                            {cancellation.description ??
                                                                '—'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-3">
                                                        {
                                                            cancellation.created_by
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Usage segment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="w-full min-w-152 text-sm">
                                <TableHeader className="text-muted-foreground border-b text-left">
                                    <TableRow>
                                        <TableHead className="px-2 py-3 font-medium">
                                            Allocation
                                        </TableHead>
                                        <TableHead className="px-2 py-3 font-medium">
                                            Box
                                        </TableHead>
                                        <TableHead className="px-2 py-3 font-medium">
                                            Nomerator
                                        </TableHead>
                                        <TableHead className="px-2 py-3 text-right font-medium">
                                            Quantity
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y">
                                    {bap.segments.map((segment) => (
                                        <TableRow key={segment.id}>
                                            <TableCell className="px-2 py-3 tabular-nums">
                                                #{segment.allocation_id}
                                            </TableCell>
                                            <TableCell className="px-2 py-3 font-medium">
                                                {segment.box_number}
                                            </TableCell>
                                            <TableCell className="px-2 py-3 font-mono text-xs whitespace-nowrap">
                                                {formatRange(
                                                    segment.numerator_start,
                                                    segment.numerator_end,
                                                )}
                                            </TableCell>
                                            <TableCell className="px-2 py-3 text-right tabular-nums">
                                                {formatQuantity(
                                                    segment.quantity,
                                                )}{' '}
                                                set
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
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
                            <div className="space-y-4">
                                {bap.timeline.map((entry, entryIndex) => (
                                    <div key={entry.id}>
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </>
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

function DetailRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={`text-right font-medium ${mono ? 'font-mono text-xs whitespace-nowrap' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}

ShowBap.layout = {
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: 'Detail BAP', href: index() },
    ],
};
