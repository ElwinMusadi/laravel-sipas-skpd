import { Form, Head, Link, useForm, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    CheckCircle2,
    FilePenLine,
    FileText,
    MessageSquareMore,
    RotateCcw,
    Send,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import {
    ClarificationResponseList,
    type ClarificationResponse,
} from '@/components/bap-clarification/clarification-response-list';
import {
    ClarificationStatusBadge,
    type ClarificationOutcome,
    type ClarificationStatus,
} from '@/components/bap-clarification/clarification-status';
import { formatSignedDifference } from '@/components/bap-verification/format';
import FormErrorSummary from '@/components/form-error-summary';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import bapClarifications, {
    index,
    open,
    review,
    show,
} from '@/routes/bap-clarifications';
import { show as showBap } from '@/routes/baps';

type Discrepancy = {
    type: string;
    label: string;
    expected_value: string;
    actual_value: string;
    difference: number | null;
    notes: string;
};

type Props = {
    clarification: {
        id: number;
        status: ClarificationStatus;
        status_label: string;
        request: {
            message: string | null;
            requested_by: string;
            requested_at: string;
            opened_by: string | null;
            opened_at: string | null;
        };
        bap: {
            id: number;
            document_number: string;
            loket: string;
            service_date: string;
            status: BapStatus;
            numerator_start: number;
            numerator_end: number;
            total_usage: number;
            online_usage_count: number;
        };
        verification: {
            id: number;
            stage: 'phase_1' | 'phase_2';
            stage_label: string;
            attempt: number;
            verifier: string;
            completed_at: string | null;
            discrepancies: Discrepancy[];
        };
        responses: ClarificationResponse[];
        history: {
            id: number;
            event: string;
            actor: string;
            created_at: string;
        }[];
    };
    can: { open: boolean; respond: boolean; review: boolean };
};

const discrepancyColumns: DataTableColumn<Discrepancy>[] = [
    {
        id: 'label',
        header: 'Jenis',
        cell: (discrepancy) => discrepancy.label,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'difference',
        header: 'Selisih',
        cell: (discrepancy) => formatSignedDifference(discrepancy.difference),
        numeric: true,
        className: 'text-destructive font-medium',
        mobile: 'badge',
    },
    {
        id: 'expected',
        header: 'Nilai sistem',
        cell: (discrepancy) => discrepancy.expected_value,
        mono: true,
    },
    {
        id: 'actual',
        header: 'Nilai fisik',
        cell: (discrepancy) => discrepancy.actual_value,
        mono: true,
    },
    {
        id: 'notes',
        header: 'Catatan verifier',
        cell: (discrepancy) => discrepancy.notes,
        className: 'max-w-md whitespace-pre-wrap',
    },
];

type ReviewOption = {
    outcome: ClarificationOutcome;
    icon: LucideIcon;
    iconClassName: string;
    title: string;
    description: (stageLabel: string) => string;
};

const reviewOptions: ReviewOption[] = [
    {
        outcome: 'resolved',
        icon: CheckCircle2,
        iconClassName: 'text-success',
        title: 'Terima penyelesaian',
        description: (stageLabel) =>
            `Tanggapan cukup. BAP masuk antrean verifikasi ulang ${stageLabel}.`,
    },
    {
        outcome: 'reopened',
        icon: RotateCcw,
        iconClassName: 'text-destructive',
        title: 'Minta klarifikasi ulang',
        description: () =>
            'Tanggapan belum cukup. Loket memberikan tanggapan baru pada tiket yang sama.',
    },
    {
        outcome: 'returned_for_correction',
        icon: FilePenLine,
        iconClassName: 'text-warning',
        title: 'Kembalikan untuk koreksi',
        description: () =>
            'Data BAP salah input. BAP kembali menjadi draft, dikoreksi Loket, lalu diverifikasi ulang mulai Tahap 1.',
    },
];

export default function ShowBapClarification({ clarification, can }: Props) {
    const { errors: pageErrors } = usePage().props;
    const [reviewOutcome, setReviewOutcome] =
        useState<ClarificationOutcome | null>(null);
    const responseForm = useForm({ response: '' });
    const reviewForm = useForm<{
        outcome: ClarificationOutcome;
        notes: string;
    }>({
        outcome: 'resolved',
        notes: '',
    });
    const stageLabel = clarification.verification.stage_label;
    const nextRound = (clarification.responses.at(-1)?.round ?? 0) + 1;

    const submitResponse = (): void => {
        responseForm.post(
            bapClarifications.responses.store(clarification.id).url,
            {
                preserveScroll: true,
                onSuccess: () => responseForm.reset(),
            },
        );
    };

    const openReview = (outcome: ClarificationOutcome): void => {
        reviewForm.setData('outcome', outcome);
        reviewForm.clearErrors();
        setReviewOutcome(outcome);
    };

    const reviewCopy = reviewDialogCopy(reviewOutcome, stageLabel);

    const submitReview = (): void => {
        reviewForm.post(review(clarification.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                reviewForm.reset();
                setReviewOutcome(null);
            },
        });
    };

    return (
        <>
            <Head title={`Klarifikasi ${clarification.bap.document_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={`Klarifikasi ${clarification.bap.document_number}`}
                    back={{
                        href: index(),
                        label: 'Kembali ke antrean klarifikasi',
                    }}
                    badges={
                        <ClarificationStatusBadge
                            status={clarification.status}
                            fallbackLabel={clarification.status_label}
                        />
                    }
                    description={`${clarification.bap.loket} · ${formatDate(clarification.bap.service_date)} · ${stageLabel}`}
                    actions={
                        <>
                            {can.open &&
                            clarification.request.opened_at === null ? (
                                <Form action={open(clarification.id)}>
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            <MessageSquareMore data-icon="inline-start" />
                                            {processing
                                                ? 'Memproses...'
                                                : 'Tandai telah dibuka'}
                                        </Button>
                                    )}
                                </Form>
                            ) : null}
                            <Button variant="outline" asChild>
                                <Link href={showBap(clarification.bap.id)}>
                                    <FileText data-icon="inline-start" />
                                    Lihat detail BAP
                                </Link>
                            </Button>
                        </>
                    }
                />

                <FormErrorSummary
                    errors={pageErrors}
                    fields={['response', 'notes', 'outcome']}
                    title="Klarifikasi tidak dapat diproses."
                />

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi BAP</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Loket"
                                    value={clarification.bap.loket}
                                />
                                <DetailRow
                                    label="Tanggal pelayanan"
                                    value={formatDate(
                                        clarification.bap.service_date,
                                    )}
                                />
                                <DetailRow
                                    label="Nomerator"
                                    value={formatRange(
                                        clarification.bap.numerator_start,
                                        clarification.bap.numerator_end,
                                    )}
                                    mono
                                />
                                <DetailRow
                                    label="Total pemakaian"
                                    value={`${formatQuantity(clarification.bap.total_usage)} set`}
                                    numeric
                                />
                                <DetailRow
                                    label="Status BAP"
                                    value={
                                        <BapStatusBadge
                                            status={clarification.bap.status}
                                        />
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Sumber pemeriksaan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow label="Tahap" value={stageLabel} />
                                <DetailRow
                                    label="Pemeriksaan"
                                    value={`Pemeriksaan ke-${clarification.verification.attempt}`}
                                />
                                <DetailRow
                                    label="Pemeriksa"
                                    value={clarification.verification.verifier}
                                />
                                <DetailRow
                                    label="Selesai diperiksa"
                                    value={
                                        clarification.verification.completed_at
                                            ? formatDateTime(
                                                  clarification.verification
                                                      .completed_at,
                                              )
                                            : '—'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Permintaan klarifikasi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Diminta oleh"
                                    value={clarification.request.requested_by}
                                />
                                <DetailRow
                                    label="Diminta pada"
                                    value={formatDateTime(
                                        clarification.request.requested_at,
                                    )}
                                />
                                <DetailRow
                                    label="Pertama dibuka"
                                    value={
                                        clarification.request.opened_at
                                            ? `${clarification.request.opened_by ?? 'Loket'} · ${formatDateTime(clarification.request.opened_at)}`
                                            : 'Belum dibuka'
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Selisih yang ditemukan</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Nilai sistem dan nilai fisik adalah bukti
                            pemeriksaan; keduanya tidak dapat diubah dari proses
                            klarifikasi. Selisih = nilai fisik dikurangi nilai
                            sistem.
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="bg-muted/50 grid gap-1 rounded-lg border-l-4 p-3 text-sm">
                            <p className="font-medium">Pesan verifier</p>
                            <p className="whitespace-pre-wrap">
                                {clarification.request.message ??
                                    'Verifier tidak menambahkan pertanyaan terpisah; gunakan temuan di bawah sebagai dasar pengecekan ulang.'}
                            </p>
                        </div>
                        <DataTable
                            rows={clarification.verification.discrepancies}
                            columns={discrepancyColumns}
                            getRowKey={(discrepancy) => discrepancy.type}
                            breakpoint="md"
                            minWidthClassName="min-w-180"
                            caption="Selisih yang ditemukan"
                            empty={
                                <p className="text-muted-foreground text-sm">
                                    Tidak ada selisih yang tercatat.
                                </p>
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tanggapan dan keputusan verifier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ClarificationResponseList
                            responses={clarification.responses}
                        />
                    </CardContent>
                </Card>

                {can.respond ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {`Berikan tanggapan ke-${nextRound}`}
                            </CardTitle>
                            <p className="text-muted-foreground text-sm">
                                {nextRound > 1
                                    ? 'Baca keputusan verifier pada tanggapan sebelumnya, lalu jelaskan hasil pengecekan ulang Loket.'
                                    : 'Jelaskan hasil pengecekan ulang Loket terhadap setiap selisih di atas.'}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submitResponse();
                                }}
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="clarification-response">
                                        Tanggapan
                                    </Label>
                                    <Textarea
                                        id="clarification-response"
                                        value={responseForm.data.response}
                                        onChange={(event) =>
                                            responseForm.setData(
                                                'response',
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={
                                            responseForm.errors.response
                                                ? true
                                                : undefined
                                        }
                                        aria-describedby={
                                            responseForm.errors.response
                                                ? 'clarification-response-error'
                                                : undefined
                                        }
                                        placeholder="Jelaskan hasil pengecekan ulang Loket."
                                        rows={5}
                                    />
                                    {responseForm.errors.response ? (
                                        <p
                                            id="clarification-response-error"
                                            className="text-destructive text-sm"
                                        >
                                            {responseForm.errors.response}
                                        </p>
                                    ) : null}
                                </div>
                                <div>
                                    <Button
                                        type="submit"
                                        disabled={responseForm.processing}
                                    >
                                        <Send data-icon="inline-start" />
                                        {responseForm.processing
                                            ? 'Memproses...'
                                            : 'Kirim tanggapan'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                ) : null}

                {can.review ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Tinjau tanggapan Loket</CardTitle>
                            <p className="text-muted-foreground text-sm">
                                Pilih keputusan untuk tanggapan terakhir di
                                atas. Anda akan diminta menulis catatan
                                tinjauan.
                            </p>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                            {reviewOptions.map((option) => (
                                <button
                                    key={option.outcome}
                                    type="button"
                                    onClick={() => openReview(option.outcome)}
                                    className="hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/30 grid content-start gap-1 rounded-xl border p-4 text-left text-sm transition-colors outline-none focus-visible:ring-3"
                                >
                                    <span className="flex items-center gap-2 font-medium">
                                        <option.icon
                                            className={cn(
                                                'size-4',
                                                option.iconClassName,
                                            )}
                                        />
                                        {option.title}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {option.description(stageLabel)}
                                    </span>
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat aktivitas klarifikasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {clarification.history.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Belum ada aktivitas klarifikasi yang tercatat.
                            </p>
                        ) : (
                            <ol className="grid gap-4">
                                {clarification.history.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="border-l-2 pl-4"
                                    >
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

            <Dialog
                open={reviewOutcome !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen && !reviewForm.processing) {
                        setReviewOutcome(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{reviewCopy.title}</DialogTitle>
                        <DialogDescription>
                            {reviewCopy.description}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitReview();
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="review-notes">
                                Catatan tinjauan
                            </Label>
                            <Textarea
                                id="review-notes"
                                value={reviewForm.data.notes}
                                onChange={(event) =>
                                    reviewForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={
                                    reviewForm.errors.notes ? true : undefined
                                }
                                aria-describedby={
                                    reviewForm.errors.notes
                                        ? 'review-notes-error'
                                        : undefined
                                }
                                placeholder={reviewCopy.placeholder}
                                rows={4}
                            />
                            {reviewForm.errors.notes ? (
                                <p
                                    id="review-notes-error"
                                    className="text-destructive text-sm"
                                >
                                    {reviewForm.errors.notes}
                                </p>
                            ) : null}
                        </div>
                        <FormErrorSummary
                            errors={reviewForm.errors}
                            fields={['notes']}
                            title="Tinjauan klarifikasi tidak dapat disimpan."
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setReviewOutcome(null)}
                                disabled={reviewForm.processing}
                            >
                                Kembali
                            </Button>
                            <Button
                                type="submit"
                                disabled={reviewForm.processing}
                            >
                                {reviewOutcome === 'resolved' ? (
                                    <CheckCircle2 data-icon="inline-start" />
                                ) : reviewOutcome ===
                                  'returned_for_correction' ? (
                                    <FilePenLine data-icon="inline-start" />
                                ) : (
                                    <RotateCcw data-icon="inline-start" />
                                )}
                                {reviewForm.processing
                                    ? 'Memproses...'
                                    : reviewCopy.submitLabel}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function reviewDialogCopy(
    outcome: ClarificationOutcome | null,
    stageLabel: string,
): {
    title: string;
    description: string;
    placeholder: string;
    submitLabel: string;
} {
    switch (outcome) {
        case 'resolved':
            return {
                title: 'Terima penyelesaian klarifikasi',
                description: `BAP akan masuk antrean verifikasi ulang ${stageLabel}.`,
                placeholder: 'Jelaskan dasar penerimaan penyelesaian.',
                submitLabel: 'Terima penyelesaian',
            };
        case 'returned_for_correction':
            return {
                title: 'Kembalikan BAP untuk koreksi',
                description:
                    'BAP kembali menjadi draft milik Loket. Setelah dikoreksi dan diajukan ulang, BAP diverifikasi kembali mulai Verifikasi Tahap 1. Riwayat verifikasi dan klarifikasi tetap tersimpan.',
                placeholder:
                    'Jelaskan data yang harus dikoreksi, misalnya jumlah online fisik yang benar.',
                submitLabel: 'Kembalikan ke Loket',
            };
        default:
            return {
                title: 'Minta klarifikasi ulang',
                description:
                    'Loket dapat memberikan tanggapan baru pada tiket yang sama.',
                placeholder:
                    'Jelaskan informasi tambahan yang masih diperlukan.',
                submitLabel: 'Kirim permintaan ulang',
            };
    }
}

ShowBapClarification.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Klarifikasi', href: index() },
        {
            title: props.clarification.bap.document_number,
            href: show(props.clarification.id),
        },
    ],
});
