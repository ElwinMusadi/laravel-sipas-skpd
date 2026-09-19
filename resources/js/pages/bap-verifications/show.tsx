import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileWarning,
    Play,
    Send,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import * as phaseOneRoutes from '@/routes/bap-verifications';
import * as phaseTwoRoutes from '@/routes/bap-verifications-phase-2';

type ChecklistType =
    | 'usage_quantity'
    | 'numerator'
    | 'tindisan_sets'
    | 'cancellation'
    | 'online';

type ChecklistDefinition = {
    type: ChecklistType;
    label: string;
    expected_quantity: number;
    actual_quantity: number | null;
    quantity_difference: number | null;
    expected_numerator_start: number | null;
    expected_numerator_end: number | null;
    actual_numerator_start: number | null;
    actual_numerator_end: number | null;
    is_attested: boolean;
};

type Verification = {
    id: number;
    verifier: string;
    status: 'in_progress' | 'completed';
    result: 'passed' | 'discrepancy' | null;
    notes: string | null;
    started_at: string;
    completed_at: string | null;
    clarification_requested: boolean;
    discrepancies: {
        type: ChecklistType;
        label: string;
        expected_value: string;
        actual_value: string;
        difference: number | null;
        notes: string;
    }[];
};

type Props = {
    bap: {
        id: number;
        document_number: string;
        service_date: string;
        loket: string;
        created_by: string;
        submitted_at: string | null;
        status: BapStatus;
        numerator_start: number;
        numerator_end: number;
        total_usage: number;
        online_usage_count: number;
        segments: {
            id: number;
            allocation_id: number;
            box_number: string;
            numerator_start: number;
            numerator_end: number;
            quantity: number;
        }[];
        cancellations: {
            id: number;
            numerator: number;
            reason: 'cancelled' | 'damaged';
            reason_label: string;
            description: string | null;
            created_by: string;
        }[];
    };
    verification: Verification | null;
    phase_one_verification: Verification | null;
    checklist: ChecklistDefinition[];
    can: { start: boolean; complete: boolean };
    verification_stage: {
        value: 'phase_1' | 'phase_2';
        label: string;
        verifier_label: string;
        is_phase_two: boolean;
    };
};

type ChecklistInput = {
    type: ChecklistType;
    is_attested: boolean;
    actual_quantity: string;
    actual_numerator_start: string;
    actual_numerator_end: string;
};

type VerificationForm = {
    result: 'passed' | 'discrepancy';
    notes: string;
    checklist: ChecklistInput[];
    discrepancies: { type: ChecklistType; notes: string }[];
};

export default function ShowBapVerification({
    bap,
    verification,
    phase_one_verification: phaseOneVerification,
    checklist,
    can,
    verification_stage: stage,
}: Props) {
    const routes = stage.is_phase_two ? phaseTwoRoutes : phaseOneRoutes;
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [discrepancyNotes, setDiscrepancyNotes] = useState<
        Partial<Record<ChecklistType, string>>
    >({});
    const form = useForm<VerificationForm>({
        result: 'passed',
        notes: '',
        checklist: checklist.map((item) => ({
            type: item.type,
            is_attested: false,
            actual_quantity: '',
            actual_numerator_start: '',
            actual_numerator_end: '',
        })),
        discrepancies: [],
    });
    const comparisons = useMemo(
        () =>
            checklist.map((item, index) =>
                compareChecklistItem(item, form.data.checklist[index]),
            ),
        [checklist, form.data.checklist],
    );
    const mismatches = comparisons.filter(
        (comparison) => comparison.matches === false,
    );
    const isComplete = comparisons.every(
        (comparison) => comparison.is_complete && comparison.is_attested,
    );
    const canSubmit =
        isComplete &&
        (form.data.result === 'passed'
            ? mismatches.length === 0
            : mismatches.length > 0);
    const isClarification = form.data.result === 'discrepancy';
    const submitLabel = isClarification
        ? `Klarifikasi ${stage.label}`
        : `Selesaikan ${stage.label}`;
    const confirmationTitle = isClarification
        ? `Klarifikasi ${stage.label}?`
        : `Selesaikan ${stage.label}?`;
    const confirmationActionLabel = isClarification
        ? 'Lakukan klarifikasi'
        : 'Selesaikan verifikasi';

    const updateChecklist = (
        index: number,
        changes: Partial<ChecklistInput>,
    ): void => {
        form.setData(
            'checklist',
            form.data.checklist.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
            ),
        );
    };

    const submit = (): void => {
        form.transform((data) => ({
            ...data,
            checklist: data.checklist.map((item) => ({
                ...item,
                actual_quantity: parsePhysicalNumber(item.actual_quantity),
                actual_numerator_start: parsePhysicalNumber(
                    item.actual_numerator_start,
                ),
                actual_numerator_end: parsePhysicalNumber(
                    item.actual_numerator_end,
                ),
            })),
            discrepancies: mismatches.map((mismatch) => ({
                type: mismatch.type,
                notes: discrepancyNotes[mismatch.type] ?? '',
            })),
        }));
        form.post(routes.complete(bap.id).url, {
            onSuccess: () => setConfirmationOpen(false),
        });
    };

    return (
        <>
            <Head title={`${stage.label} ${bap.document_number}`} />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="grid gap-2">
                        <Button
                            variant="link"
                            size="sm"
                            className="w-fit pl-0 hover:no-underline"
                            asChild
                        >
                            <Link href={routes.index()}>
                                <ArrowLeft />
                                Kembali ke antrean
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {stage.label} {bap.document_number}
                            </h1>
                            <BapStatusBadge status={bap.status} />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {bap.loket} • {formatDate(bap.service_date)}
                        </p>
                    </div>
                    {can.start ? (
                        <Button asChild>
                            <Link
                                href={routes.start(bap.id)}
                                method="post"
                                as="button"
                            >
                                <Play />
                                Mulai {stage.label}
                            </Link>
                        </Button>
                    ) : null}
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data BAP</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                            <DetailRow label="Loket" value={bap.loket} />
                            <DetailRow
                                label="Dibuat oleh"
                                value={bap.created_by}
                            />
                            <DetailRow
                                label="Diajukan pada"
                                value={
                                    bap.submitted_at
                                        ? formatDateTime(bap.submitted_at)
                                        : 'Belum diajukan'
                                }
                            />
                            <DetailRow
                                label="Status"
                                value={<BapStatusBadge status={bap.status} />}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Nomerator dan pemakaian</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
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
                                value={`${formatQuantity(bap.total_usage)} set`}
                            />
                            <DetailRow
                                label="Online"
                                value={`${formatQuantity(bap.online_usage_count)} set`}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Status {stage.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                            {verification ? (
                                <>
                                    <DetailRow
                                        label="Verifier"
                                        value={verification.verifier}
                                    />
                                    <DetailRow
                                        label="Dimulai"
                                        value={formatDateTime(
                                            verification.started_at,
                                        )}
                                    />
                                    <DetailRow
                                        label="Hasil"
                                        value={resultLabel(
                                            verification.result,
                                            stage.label,
                                        )}
                                    />
                                </>
                            ) : (
                                <p className="text-muted-foreground">
                                    Pemeriksaan fisik belum dimulai.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage segment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className="w-full min-w-155 text-sm">
                                    <TableHeader className="text-muted-foreground border-b text-left">
                                        <TableRow>
                                            <TableHead className="pb-3 font-medium">
                                                Box
                                            </TableHead>
                                            <TableHead className="pb-3 font-medium">
                                                Alokasi
                                            </TableHead>
                                            <TableHead className="pb-3 font-medium">
                                                Range
                                            </TableHead>
                                            <TableHead className="pb-3 text-right font-medium">
                                                Jumlah
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y">
                                        {bap.segments.map((segment) => (
                                            <TableRow key={segment.id}>
                                                <TableCell className="py-3">
                                                    {segment.box_number}
                                                </TableCell>
                                                <TableCell className="py-3 tabular-nums">
                                                    #{segment.allocation_id}
                                                </TableCell>
                                                <TableCell className="py-3 font-mono text-xs whitespace-nowrap">
                                                    {formatRange(
                                                        segment.numerator_start,
                                                        segment.numerator_end,
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3 text-right tabular-nums">
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
                        <CardHeader>
                            <CardTitle>Batal / Rusak</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {bap.cancellations.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Tidak ada BAP batal/rusak pada pemakaian
                                    ini.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="w-full min-w-155 text-sm">
                                        <TableHeader className="text-muted-foreground border-b text-left">
                                            <TableRow>
                                                <TableHead className="pb-3 font-medium">
                                                    Nomerator
                                                </TableHead>
                                                <TableHead className="pb-3 font-medium">
                                                    Alasan
                                                </TableHead>
                                                <TableHead className="pb-3 font-medium">
                                                    Keterangan
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y">
                                            {bap.cancellations.map(
                                                (cancellation) => (
                                                    <TableRow
                                                        key={cancellation.id}
                                                    >
                                                        <TableCell className="py-3 font-mono text-xs">
                                                            {formatNomerator(
                                                                cancellation.numerator,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            {
                                                                cancellation.reason_label
                                                            }
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground py-3">
                                                            {cancellation.description ??
                                                                '—'}
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
                </section>

                {stage.is_phase_two ? (
                    <section className="grid gap-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Verifikasi Tahap 1
                        </h2>
                        {phaseOneVerification ? (
                            <VerificationResult
                                verification={phaseOneVerification}
                                stageLabel="Verifikasi Tahap 1"
                                isPhaseTwo={false}
                            />
                        ) : (
                            <ValidationNotice>
                                Hasil Verifikasi Tahap 1 tidak ditemukan. BAP
                                ini tidak dapat diselesaikan pada Tahap 2.
                            </ValidationNotice>
                        )}
                    </section>
                ) : null}

                {verification?.status === 'completed' ? (
                    <VerificationResult
                        verification={verification}
                        stageLabel={stage.label}
                        isPhaseTwo={stage.is_phase_two}
                    />
                ) : null}

                {can.complete ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Checklist pemeriksaan fisik</CardTitle>
                            <p className="text-muted-foreground text-sm">
                                Checklist adalah attestasi bahwa pemeriksaan
                                fisik telah dilakukan. Nilai sistem tidak dapat
                                diubah dari halaman ini.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-5"
                                onSubmit={(event) => {
                                    event.preventDefault();

                                    if (canSubmit) {
                                        setConfirmationOpen(true);
                                    }
                                }}
                            >
                                {comparisons.map((comparison, itemIndex) => (
                                    <ChecklistRow
                                        key={comparison.type}
                                        comparison={comparison}
                                        error={
                                            form.errors[
                                                `checklist.${itemIndex}.actual_quantity`
                                            ]
                                        }
                                        rangeStartError={
                                            form.errors[
                                                `checklist.${itemIndex}.actual_numerator_start`
                                            ]
                                        }
                                        rangeEndError={
                                            form.errors[
                                                `checklist.${itemIndex}.actual_numerator_end`
                                            ]
                                        }
                                        onChange={(changes) =>
                                            updateChecklist(itemIndex, changes)
                                        }
                                    />
                                ))}

                                <fieldset className="grid gap-3 rounded-xl border p-4">
                                    <legend className="px-1 font-medium">
                                        Hasil {stage.label}
                                    </legend>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant={
                                                form.data.result === 'passed'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                form.setData('result', 'passed')
                                            }
                                        >
                                            <CheckCircle2 />
                                            Lulus verifikasi
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                form.data.result ===
                                                'discrepancy'
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    'result',
                                                    'discrepancy',
                                                )
                                            }
                                        >
                                            <AlertTriangle />
                                            Ada selisih
                                        </Button>
                                    </div>

                                    {form.data.result === 'passed' &&
                                    mismatches.length > 0 ? (
                                        <ValidationNotice>
                                            Nilai fisik yang berbeda harus
                                            dicatat sebagai selisih; hasil lulus
                                            tidak dapat diselesaikan.
                                        </ValidationNotice>
                                    ) : null}
                                    {form.data.result === 'discrepancy' &&
                                    mismatches.length === 0 ? (
                                        <ValidationNotice>
                                            Belum ada perbedaan antara nilai
                                            sistem dan fisik untuk dicatat.
                                        </ValidationNotice>
                                    ) : null}

                                    {form.data.result === 'discrepancy' &&
                                    mismatches.length > 0 ? (
                                        <div className="grid gap-4 pt-2">
                                            {mismatches.map((mismatch) => (
                                                <div
                                                    key={mismatch.type}
                                                    className="border-destructive/25 bg-destructive/5 grid gap-3 rounded-xl border p-4"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="font-medium">
                                                            {mismatch.label}
                                                        </p>
                                                        <span className="text-destructive text-sm tabular-nums">
                                                            Selisih{' '}
                                                            {formatDifference(
                                                                mismatch.difference,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm">
                                                        Sistem:{' '}
                                                        <span className="text-foreground font-medium">
                                                            {
                                                                mismatch.expected_value
                                                            }
                                                        </span>{' '}
                                                        • Fisik:{' '}
                                                        <span className="text-foreground font-medium">
                                                            {
                                                                mismatch.actual_value
                                                            }
                                                        </span>
                                                    </p>
                                                    <div className="grid gap-2">
                                                        <Label
                                                            htmlFor={`discrepancy-${mismatch.type}`}
                                                        >
                                                            Catatan verifier
                                                        </Label>
                                                        <Textarea
                                                            id={`discrepancy-${mismatch.type}`}
                                                            value={
                                                                discrepancyNotes[
                                                                    mismatch
                                                                        .type
                                                                ] ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                setDiscrepancyNotes(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [mismatch.type]:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            placeholder="Jelaskan temuan fisik dan kebutuhan konfirmasi."
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="grid gap-2 pt-2">
                                        <Label htmlFor="verification-notes">
                                            Catatan umum (opsional)
                                        </Label>
                                        <Textarea
                                            id="verification-notes"
                                            value={form.data.notes}
                                            onChange={(event) =>
                                                form.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Catatan tambahan untuk riwayat verifikasi."
                                        />
                                    </div>
                                    {form.errors.result ? (
                                        <ValidationNotice>
                                            {form.errors.result}
                                        </ValidationNotice>
                                    ) : null}
                                    {form.errors.discrepancies ? (
                                        <ValidationNotice>
                                            {form.errors.discrepancies}
                                        </ValidationNotice>
                                    ) : null}
                                </fieldset>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={!canSubmit || form.processing}
                                    >
                                        <Send />
                                        {submitLabel}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                ) : null}
            </main>

            <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{confirmationTitle}</DialogTitle>
                        <DialogDescription>
                            {isClarification
                                ? `Hasil selisih akan dikirim ke proses klarifikasi ${stage.label}.`
                                : stage.is_phase_two
                                  ? 'Pastikan seluruh pemeriksaan fisik telah dilakukan. Hasil lulus menyiapkan BAP untuk proses Bendahara Barang berikutnya.'
                                  : 'Pastikan seluruh pemeriksaan fisik telah dilakukan. Hasil lulus diteruskan ke antrean Verifikasi Tahap 2.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter showCloseButton>
                        <Button onClick={submit} disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : confirmationActionLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ChecklistRow({
    comparison,
    error,
    rangeStartError,
    rangeEndError,
    onChange,
}: {
    comparison: ChecklistComparison;
    error?: string;
    rangeStartError?: string;
    rangeEndError?: string;
    onChange: (changes: Partial<ChecklistInput>) => void;
}) {
    return (
        <fieldset className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)]">
            <legend className="sr-only">{comparison.label}</legend>
            <div className="grid gap-2">
                <div className="flex items-center gap-3">
                    <Checkbox
                        id={`attested-${comparison.type}`}
                        checked={comparison.is_attested}
                        onCheckedChange={(checked) =>
                            onChange({ is_attested: checked === true })
                        }
                    />
                    <Label
                        htmlFor={`attested-${comparison.type}`}
                        className="font-medium"
                    >
                        {comparison.label} telah diperiksa secara fisik
                    </Label>
                </div>
                <p className="text-muted-foreground pl-7 text-sm">
                    Nilai sistem:{' '}
                    <span className="text-foreground font-medium">
                        {comparison.expected_value}
                    </span>
                </p>
            </div>

            {comparison.type === 'numerator' ? (
                <div className="grid gap-2">
                    <Label>Range nomerator fisik</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            value={comparison.actual_numerator_start}
                            onChange={(event) =>
                                onChange({
                                    actual_numerator_start:
                                        event.target.value.replace(/\D/g, ''),
                                })
                            }
                            inputMode="numeric"
                            maxLength={7}
                            placeholder="Awal"
                            aria-label="Nomerator fisik awal"
                        />
                        <Input
                            value={comparison.actual_numerator_end}
                            onChange={(event) =>
                                onChange({
                                    actual_numerator_end:
                                        event.target.value.replace(/\D/g, ''),
                                })
                            }
                            inputMode="numeric"
                            maxLength={7}
                            placeholder="Akhir"
                            aria-label="Nomerator fisik akhir"
                        />
                    </div>
                    {rangeStartError || rangeEndError ? (
                        <p className="text-destructive text-sm">
                            {rangeStartError ?? rangeEndError}
                        </p>
                    ) : null}
                </div>
            ) : (
                <div className="grid gap-2">
                    <Label htmlFor={`physical-${comparison.type}`}>
                        Nilai fisik ({comparison.unit})
                    </Label>
                    <Input
                        id={`physical-${comparison.type}`}
                        value={comparison.actual_quantity}
                        onChange={(event) =>
                            onChange({
                                actual_quantity: event.target.value.replace(
                                    /\D/g,
                                    '',
                                ),
                            })
                        }
                        inputMode="numeric"
                        placeholder="Masukkan nilai fisik"
                    />
                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}
                </div>
            )}

            {comparison.is_complete ? (
                <p
                    className={`text-sm lg:col-span-2 ${comparison.matches ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}
                >
                    {comparison.matches
                        ? 'Nilai fisik sesuai dengan nilai sistem.'
                        : `Ada selisih. Sistem: ${comparison.expected_value}; fisik: ${comparison.actual_value}; selisih: ${formatDifference(comparison.difference)}.`}
                </p>
            ) : null}
        </fieldset>
    );
}

function VerificationResult({
    verification,
    stageLabel,
    isPhaseTwo,
}: {
    verification: Verification;
    stageLabel: string;
    isPhaseTwo: boolean;
}) {
    const passed = verification.result === 'passed';

    return (
        <Card
            className={
                passed
                    ? 'border-emerald-600/30 bg-emerald-500/5'
                    : 'border-destructive/30 bg-destructive/5'
            }
        >
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    {passed ? <CheckCircle2 /> : <FileWarning />}
                    {passed
                        ? `${stageLabel} lulus`
                        : `${stageLabel} menemukan selisih`}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <DetailRow label="Verifier" value={verification.verifier} />
                    <DetailRow
                        label="Diselesaikan"
                        value={
                            verification.completed_at
                                ? formatDateTime(verification.completed_at)
                                : 'Belum selesai'
                        }
                    />
                </div>
                <p className="text-sm">
                    {passed
                        ? isPhaseTwo
                            ? 'BAP siap menjadi input proses Bendahara Barang berikutnya. Finalisasi dan pelaporan belum diimplementasikan.'
                            : 'BAP telah diteruskan ke antrean Verifikasi Tahap 2.'
                        : 'BAP tetap perlu klarifikasi. Tidak ada alur klarifikasi dua arah atau verifikasi ulang pada Phase 09.'}
                </p>
                {verification.notes ? (
                    <p className="text-muted-foreground bg-background/60 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                        {verification.notes}
                    </p>
                ) : null}
                {verification.discrepancies.length > 0 ? (
                    <div className="grid gap-3">
                        {verification.discrepancies.map((discrepancy) => (
                            <div
                                key={discrepancy.type}
                                className="bg-background/60 rounded-lg border p-3 text-sm"
                            >
                                <div className="flex flex-wrap justify-between gap-2">
                                    <p className="font-medium">
                                        {discrepancy.label}
                                    </p>
                                    <span className="text-destructive tabular-nums">
                                        Selisih{' '}
                                        {formatDifference(
                                            discrepancy.difference,
                                        )}
                                    </span>
                                </div>
                                <p className="text-muted-foreground mt-1">
                                    Sistem: {discrepancy.expected_value} •
                                    Fisik: {discrepancy.actual_value}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap">
                                    {discrepancy.notes}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </CardContent>
        </Card>
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

function ValidationNotice({ children }: { children: React.ReactNode }) {
    return (
        <p className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm">
            {children}
        </p>
    );
}

type ChecklistComparison = ChecklistInput & {
    label: string;
    unit: string;
    expected_value: string;
    actual_value: string;
    difference: number | null;
    matches: boolean | null;
    is_complete: boolean;
};

function compareChecklistItem(
    definition: ChecklistDefinition,
    input: ChecklistInput | undefined,
): ChecklistComparison {
    const current = input ?? {
        type: definition.type,
        is_attested: false,
        actual_quantity: '',
        actual_numerator_start: '',
        actual_numerator_end: '',
    };

    if (definition.type === 'numerator') {
        const actualStart = parsePhysicalNumber(current.actual_numerator_start);
        const actualEnd = parsePhysicalNumber(current.actual_numerator_end);
        const isComplete =
            actualStart !== null &&
            actualEnd !== null &&
            actualEnd >= actualStart;
        const actualQuantity = isComplete ? actualEnd - actualStart + 1 : null;
        const difference =
            actualQuantity === null
                ? null
                : actualQuantity - definition.expected_quantity;

        return {
            ...current,
            label: definition.label,
            unit: 'set',
            expected_value: formatRange(
                definition.expected_numerator_start ?? 0,
                definition.expected_numerator_end ?? 0,
            ),
            actual_value:
                actualStart === null || actualEnd === null
                    ? 'Belum diisi'
                    : formatRange(actualStart, actualEnd),
            difference,
            matches:
                isComplete &&
                actualStart === definition.expected_numerator_start &&
                actualEnd === definition.expected_numerator_end,
            is_complete: isComplete,
        };
    }

    const actualQuantity = parsePhysicalNumber(current.actual_quantity);
    const difference =
        actualQuantity === null
            ? null
            : actualQuantity - definition.expected_quantity;

    return {
        ...current,
        label: definition.label,
        unit: definition.type === 'tindisan_sets' ? 'set' : 'SKPD',
        expected_value: `${formatQuantity(definition.expected_quantity)} ${definition.type === 'tindisan_sets' ? 'set' : 'SKPD'}`,
        actual_value:
            actualQuantity === null
                ? 'Belum diisi'
                : `${formatQuantity(actualQuantity)} ${definition.type === 'tindisan_sets' ? 'set' : 'SKPD'}`,
        difference,
        matches: actualQuantity === null ? null : difference === 0,
        is_complete: actualQuantity !== null,
    };
}

function parsePhysicalNumber(value: string): number | null {
    if (!/^\d+$/.test(value)) {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) ? number : null;
}

function formatDifference(value: number | null): string {
    if (value === null) {
        return '—';
    }

    return `${value > 0 ? '+' : ''}${formatQuantity(value)}`;
}

function resultLabel(
    result: Verification['result'],
    stageLabel: string,
): string {
    return matchResult(result, stageLabel);
}

function matchResult(
    result: Verification['result'],
    stageLabel: string,
): string {
    switch (result) {
        case 'passed':
            return `Lulus ${stageLabel}`;
        case 'discrepancy':
            return 'Ada Selisih';
        default:
            return 'Sedang diperiksa';
    }
}

ShowBapVerification.layout = {
    breadcrumbs: [
        { title: 'Antrean Verifikasi', href: phaseOneRoutes.index() },
        { title: 'Detail Verifikasi', href: phaseOneRoutes.index() },
    ],
};
