import { Head, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardCheck,
    FileText,
    History,
    MessageSquareText,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { BapStatusBadge } from '@/components/bap/bap-status-badge';
import {
    ClarificationResponseList,
    type ClarificationResponse,
} from '@/components/bap-clarification/clarification-response-list';
import { ClarificationStatusBadge } from '@/components/bap-clarification/clarification-status';
import { formatSignedDifference } from '@/components/bap-verification/format';
import { VerificationResultBadge } from '@/components/bap-verification/verification-result-badge';
import FormErrorSummary from '@/components/form-error-summary';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { index, receive, show } from '@/routes/bap-administrations';

type ChecklistItem = {
    type: string;
    label: string;
    is_attested: boolean;
    expected_quantity: number | null;
    actual_quantity: number | null;
    quantity_difference: number | null;
    expected_numerator_start: number | null;
    expected_numerator_end: number | null;
    actual_numerator_start: number | null;
    actual_numerator_end: number | null;
};

type Discrepancy = {
    type: string;
    label: string;
    expected_value: string;
    actual_value: string;
    difference: number | null;
    notes: string;
};

type Verification = {
    id: number;
    attempt: number;
    verifier: string;
    status: 'in_progress' | 'completed';
    result: 'passed' | 'discrepancy' | null;
    notes: string | null;
    started_at: string;
    completed_at: string | null;
    checklist: ChecklistItem[];
    discrepancies: Discrepancy[];
    clarification: {
        id: number;
        status: string;
        status_label: string;
    } | null;
};

type Segment = {
    id: number;
    allocation_id: number;
    box_number: string;
    numerator_start: number;
    numerator_end: number;
    quantity: number;
};

type Props = {
    bap: {
        id: number;
        number: string;
        service_date: string;
        loket: string;
        created_by: string;
        created_at: string;
        submitted_at: string | null;
        status: 'verified_phase_2' | 'completed';
        total_usage: number;
        online_usage_count: number;
        cancellation_count: number;
        numerator_start: number;
        numerator_end: number;
        receipt: {
            received_by: string | null;
            received_at: string | null;
            receipt_notes: string | null;
        };
        can: { receive: boolean };
        segments: Segment[];
        cancellations: {
            id: number;
            numerator: number;
            reason: string;
            reason_label: string;
            description: string | null;
            created_by: string;
            created_at: string;
        }[];
        phase_one: Verification[];
        phase_two: Verification[];
        clarifications: {
            id: number;
            stage_label: string;
            attempt: number;
            status: string;
            status_label: string;
            requested_by: string;
            requested_at: string;
            request_notes: string | null;
            opened_by: string | null;
            opened_at: string | null;
            responses: ClarificationResponse[];
        }[];
        history: {
            id: number;
            event: string;
            actor: string;
            created_at: string;
        }[];
    };
};

const segmentColumns: DataTableColumn<Segment>[] = [
    {
        id: 'box',
        header: 'Box sumber',
        cell: (segment) => segment.box_number,
        className: 'font-medium',
        mobile: 'title',
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
        header: 'Jumlah (set)',
        cell: (segment) => formatQuantity(segment.quantity),
        numeric: true,
    },
];

const checklistColumns: DataTableColumn<ChecklistItem>[] = [
    {
        id: 'label',
        header: 'Item',
        cell: (item) => item.label,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'expected',
        header: 'Nilai sistem',
        cell: (item) => checklistValue(item, 'expected'),
        className: 'tabular-nums whitespace-nowrap',
    },
    {
        id: 'actual',
        header: 'Nilai fisik',
        cell: (item) => checklistValue(item, 'actual'),
        className: 'tabular-nums whitespace-nowrap',
    },
    {
        id: 'difference',
        header: 'Selisih',
        cell: (item) => formatSignedDifference(item.quantity_difference),
        numeric: true,
    },
    {
        id: 'attested',
        header: 'Konfirmasi',
        cell: (item) =>
            item.is_attested ? (
                <StatusBadge label="Diperiksa" tone="success" />
            ) : (
                <StatusBadge label="Belum dikonfirmasi" tone="neutral" />
            ),
        mobile: 'badge',
    },
];

export default function BapAdministrationShow({ bap }: Props) {
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const form = useForm({ receipt_notes: '' });

    function submitReceipt(): void {
        form.post(receive.url(bap.id), {
            onSuccess: () => setConfirmationOpen(false),
        });
    }

    return (
        <>
            <Head title={`Administrasi ${bap.number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={`Administrasi BAP ${bap.number}`}
                    back={{ href: index(), label: 'Kembali ke antrean' }}
                    badges={<BapStatusBadge status={bap.status} />}
                    description={`${bap.loket} · ${formatDate(bap.service_date)}`}
                    actions={
                        bap.can.receive ? (
                            <Button
                                onClick={() => setConfirmationOpen(true)}
                                disabled={form.processing}
                            >
                                <ClipboardCheck data-icon="inline-start" />
                                Terima secara administratif
                            </Button>
                        ) : null
                    }
                />

                {bap.can.receive ? (
                    <Alert>
                        <ShieldCheck />
                        <AlertTitle>
                            Menunggu penerimaan Bendahara Barang
                        </AlertTitle>
                        <AlertDescription>
                            BAP ini telah lulus Verifikasi Tahap 1 dan Tahap 2.
                            Penerimaan hanya mencatat finalisasi administratif;
                            sumber data inventaris tidak diubah.
                        </AlertDescription>
                    </Alert>
                ) : bap.status === 'completed' ? (
                    <ReceiptSummary receipt={bap.receipt} />
                ) : null}

                <Tabs defaultValue="summary" className="gap-4">
                    <TabsList className="bg-muted/60 h-auto w-full justify-start overflow-x-auto rounded-2xl p-1">
                        <TabsTrigger value="summary">
                            <FileText />
                            Ringkasan
                        </TabsTrigger>
                        <TabsTrigger value="verification">
                            <ShieldCheck />
                            Riwayat Verifikasi
                        </TabsTrigger>
                        <TabsTrigger value="clarification">
                            <MessageSquareText />
                            Klarifikasi
                            {bap.clarifications.length > 0 ? (
                                <span className="text-muted-foreground tabular-nums">
                                    ({bap.clarifications.length})
                                </span>
                            ) : null}
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <History />
                            Riwayat Audit
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="grid gap-6">
                        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Identitas dan pemakaian
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6">
                                    <DetailList className="gap-x-8 md:grid-cols-2">
                                        <DetailRow
                                            label="Nomor BAP"
                                            value={bap.number}
                                        />
                                        <DetailRow
                                            label="Tanggal pelayanan"
                                            value={formatDate(bap.service_date)}
                                        />
                                        <DetailRow
                                            label="Loket"
                                            value={bap.loket}
                                        />
                                        <DetailRow
                                            label="Dibuat oleh"
                                            value={bap.created_by}
                                        />
                                        <DetailRow
                                            label="Dibuat pada"
                                            value={formatDateTime(
                                                bap.created_at,
                                            )}
                                        />
                                        <DetailRow
                                            label="Diajukan pada"
                                            value={
                                                bap.submitted_at
                                                    ? formatDateTime(
                                                          bap.submitted_at,
                                                      )
                                                    : '—'
                                            }
                                        />
                                        <DetailRow
                                            label="Nomerator"
                                            value={formatRange(
                                                bap.numerator_start,
                                                bap.numerator_end,
                                            )}
                                            mono
                                        />
                                        <DetailRow
                                            label="Total pemakaian"
                                            value={formatQuantity(
                                                bap.total_usage,
                                            )}
                                            numeric
                                        />
                                        <DetailRow
                                            label="Pemakaian online"
                                            value={formatQuantity(
                                                bap.online_usage_count,
                                            )}
                                            numeric
                                        />
                                        <DetailRow
                                            label="Batal/rusak"
                                            value={formatQuantity(
                                                bap.cancellation_count,
                                            )}
                                            numeric
                                        />
                                    </DetailList>

                                    <div className="grid gap-3">
                                        <h2 className="font-medium">
                                            Rincian pemakaian per Box
                                        </h2>
                                        <DataTable
                                            rows={bap.segments}
                                            columns={segmentColumns}
                                            getRowKey={(segment) => segment.id}
                                            breakpoint="md"
                                            caption="Rincian pemakaian per Box"
                                            empty={
                                                <p className="text-muted-foreground text-sm">
                                                    Belum ada rincian pemakaian.
                                                </p>
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Batal/rusak</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {bap.cancellations.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            Tidak ada Nomerator batal atau
                                            rusak.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-3">
                                            {bap.cancellations.map(
                                                (cancellation) => (
                                                    <li
                                                        key={cancellation.id}
                                                        className="rounded-xl border p-3 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-mono font-medium">
                                                                {formatNomerator(
                                                                    cancellation.numerator,
                                                                )}
                                                            </span>
                                                            <StatusBadge
                                                                label={
                                                                    cancellation.reason_label
                                                                }
                                                                tone="neutral"
                                                            />
                                                        </div>
                                                        {cancellation.description ? (
                                                            <p className="text-muted-foreground mt-2">
                                                                {
                                                                    cancellation.description
                                                                }
                                                            </p>
                                                        ) : null}
                                                        <p className="text-muted-foreground mt-2 text-xs">
                                                            Dicatat{' '}
                                                            {
                                                                cancellation.created_by
                                                            }{' '}
                                                            ·{' '}
                                                            {formatDateTime(
                                                                cancellation.created_at,
                                                            )}
                                                        </p>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>

                    <TabsContent value="verification" className="grid gap-6">
                        <VerificationHistory
                            title="Verifikasi Tahap 1"
                            verifications={bap.phase_one}
                        />
                        <VerificationHistory
                            title="Verifikasi Tahap 2"
                            verifications={bap.phase_two}
                        />
                    </TabsContent>

                    <TabsContent value="clarification">
                        <Card>
                            <CardHeader>
                                <CardTitle>Riwayat klarifikasi</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {bap.clarifications.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Tidak ada klarifikasi pada BAP ini.
                                    </p>
                                ) : (
                                    bap.clarifications.map((clarification) => (
                                        <article
                                            key={clarification.id}
                                            className="grid gap-4 rounded-xl border p-4"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <h2 className="font-medium">
                                                        {
                                                            clarification.stage_label
                                                        }{' '}
                                                        · Pemeriksaan ke-
                                                        {clarification.attempt}
                                                    </h2>
                                                    <p className="text-muted-foreground mt-1 text-sm">
                                                        Diminta oleh{' '}
                                                        {
                                                            clarification.requested_by
                                                        }{' '}
                                                        ·{' '}
                                                        {formatDateTime(
                                                            clarification.requested_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <ClarificationStatusBadge
                                                    status={
                                                        clarification.status
                                                    }
                                                    fallbackLabel={
                                                        clarification.status_label
                                                    }
                                                />
                                            </div>
                                            {clarification.request_notes ? (
                                                <p className="bg-muted/50 rounded-lg border-l-4 p-3 text-sm whitespace-pre-wrap">
                                                    {
                                                        clarification.request_notes
                                                    }
                                                </p>
                                            ) : null}
                                            {clarification.opened_at ? (
                                                <p className="text-muted-foreground text-xs">
                                                    Dibuka oleh{' '}
                                                    {clarification.opened_by ??
                                                        'Loket'}{' '}
                                                    ·{' '}
                                                    {formatDateTime(
                                                        clarification.opened_at,
                                                    )}
                                                </p>
                                            ) : null}
                                            <ClarificationResponseList
                                                responses={
                                                    clarification.responses
                                                }
                                            />
                                        </article>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>Riwayat aktivitas BAP</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {bap.history.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Belum ada aktivitas yang tercatat.
                                    </p>
                                ) : (
                                    <ol className="grid gap-4">
                                        {bap.history.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="border-l-2 pl-4"
                                            >
                                                <p className="font-medium">
                                                    {entry.event}
                                                </p>
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                    {entry.actor} ·{' '}
                                                    {formatDateTime(
                                                        entry.created_at,
                                                    )}
                                                </p>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog
                open={confirmationOpen}
                onOpenChange={(open) => {
                    if (!form.processing) {
                        setConfirmationOpen(open);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Terima BAP secara administratif?
                        </DialogTitle>
                        <DialogDescription>
                            Penerimaan menandai BAP {bap.number} selesai secara
                            administratif dan tidak mengubah data sumber
                            inventaris. Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitReceipt();
                        }}
                    >
                        <DetailList>
                            <DetailRow label="Loket" value={bap.loket} />
                            <DetailRow
                                label="Tanggal pelayanan"
                                value={formatDate(bap.service_date)}
                            />
                            <DetailRow
                                label="Total pemakaian"
                                value={formatQuantity(bap.total_usage)}
                                numeric
                            />
                        </DetailList>
                        <div className="grid gap-2">
                            <Label htmlFor="receipt-notes">
                                Catatan penerimaan (opsional)
                            </Label>
                            <Textarea
                                id="receipt-notes"
                                value={form.data.receipt_notes}
                                onChange={(event) =>
                                    form.setData(
                                        'receipt_notes',
                                        event.target.value,
                                    )
                                }
                                disabled={form.processing}
                                placeholder="Catatan administratif tambahan."
                                aria-invalid={
                                    Boolean(form.errors.receipt_notes) ||
                                    undefined
                                }
                                aria-describedby={
                                    form.errors.receipt_notes
                                        ? 'receipt-notes-error'
                                        : undefined
                                }
                            />
                            {form.errors.receipt_notes ? (
                                <p
                                    id="receipt-notes-error"
                                    className="text-destructive text-sm"
                                >
                                    {form.errors.receipt_notes}
                                </p>
                            ) : null}
                        </div>
                        <FormErrorSummary
                            errors={form.errors}
                            fields={['receipt_notes']}
                            title="BAP tidak dapat diterima."
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfirmationOpen(false)}
                                disabled={form.processing}
                            >
                                Kembali
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <CheckCircle2 data-icon="inline-start" />
                                {form.processing
                                    ? 'Menyimpan...'
                                    : 'Ya, terima BAP'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

BapAdministrationShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Administrasi BAP', href: index() },
        { title: props.bap.number, href: show(props.bap.id) },
    ],
});

function ReceiptSummary({ receipt }: { receipt: Props['bap']['receipt'] }) {
    return (
        <Alert className="border-success/30 bg-success/5">
            <CheckCircle2 className="text-success" />
            <AlertTitle>Selesai administratif</AlertTitle>
            <AlertDescription className="grid gap-1">
                <p>
                    Diterima oleh {receipt.received_by ?? '—'} pada{' '}
                    {receipt.received_at
                        ? formatDateTime(receipt.received_at)
                        : '—'}
                    .
                </p>
                {receipt.receipt_notes ? (
                    <p className="whitespace-pre-wrap">
                        Catatan: {receipt.receipt_notes}
                    </p>
                ) : null}
            </AlertDescription>
        </Alert>
    );
}

function VerificationHistory({
    title,
    verifications,
}: {
    title: string;
    verifications: Verification[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                {verifications.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Belum ada riwayat {title}.
                    </p>
                ) : (
                    verifications.map((entry) => (
                        <article
                            key={entry.id}
                            className="grid gap-4 rounded-xl border p-4"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-medium">
                                        Pemeriksaan ke-{entry.attempt} ·{' '}
                                        {entry.verifier}
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Dimulai{' '}
                                        {formatDateTime(entry.started_at)}
                                        {entry.completed_at
                                            ? ` · Selesai ${formatDateTime(entry.completed_at)}`
                                            : ''}
                                    </p>
                                </div>
                                <VerificationResultBadge
                                    result={entry.result}
                                />
                            </div>
                            {entry.notes ? (
                                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                                    {entry.notes}
                                </p>
                            ) : null}
                            {entry.clarification ? (
                                <p className="flex flex-wrap items-center gap-2 text-sm">
                                    Klarifikasi:
                                    <ClarificationStatusBadge
                                        status={entry.clarification.status}
                                        fallbackLabel={
                                            entry.clarification.status_label
                                        }
                                    />
                                </p>
                            ) : null}
                            <div className="grid gap-3">
                                <h3 className="text-sm font-medium">
                                    Checklist
                                </h3>
                                <DataTable
                                    rows={entry.checklist}
                                    columns={checklistColumns}
                                    getRowKey={(item) => item.type}
                                    breakpoint="md"
                                    caption={`Checklist pemeriksaan ke-${entry.attempt}`}
                                    empty={
                                        <p className="text-muted-foreground text-sm">
                                            Checklist belum diisi.
                                        </p>
                                    }
                                />
                            </div>
                            {entry.discrepancies.length > 0 ? (
                                <div className="grid gap-3">
                                    <h3 className="text-sm font-medium">
                                        Selisih tercatat
                                    </h3>
                                    <ul className="grid gap-3">
                                        {entry.discrepancies.map(
                                            (discrepancy) => (
                                                <li
                                                    key={discrepancy.type}
                                                    className="bg-destructive/5 border-destructive/20 grid gap-1 rounded-xl border p-3 text-sm"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="font-medium">
                                                            {discrepancy.label}
                                                        </p>
                                                        <StatusBadge
                                                            label={`Selisih ${formatSignedDifference(discrepancy.difference)}`}
                                                            tone="danger"
                                                        />
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        Nilai sistem:{' '}
                                                        {
                                                            discrepancy.expected_value
                                                        }{' '}
                                                        · Nilai fisik:{' '}
                                                        {
                                                            discrepancy.actual_value
                                                        }
                                                    </p>
                                                    <p className="whitespace-pre-wrap">
                                                        {discrepancy.notes}
                                                    </p>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            ) : null}
                        </article>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function checklistValue(
    item: ChecklistItem,
    source: 'expected' | 'actual',
): string {
    const quantity =
        source === 'expected' ? item.expected_quantity : item.actual_quantity;
    const rangeStart =
        source === 'expected'
            ? item.expected_numerator_start
            : item.actual_numerator_start;
    const rangeEnd =
        source === 'expected'
            ? item.expected_numerator_end
            : item.actual_numerator_end;

    if (rangeStart !== null && rangeEnd !== null) {
        return formatRange(rangeStart, rangeEnd);
    }

    return quantity === null ? '—' : formatQuantity(quantity);
}
