import { useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { StatusBadge } from '@/components/app/status-badge';
import {
    compareChecklistItem,
    emptyChecklistInput,
    parsePhysicalNumber,
    submitBlockers,
} from '@/components/bap-verification/checklist';
import { ChecklistItem } from '@/components/bap-verification/checklist-item';
import { formatSignedDifference } from '@/components/bap-verification/format';
import { ResultChoice } from '@/components/bap-verification/result-choice';
import type {
    ChecklistDefinition,
    ChecklistInput,
    ChecklistType,
    VerificationResultValue,
    VerificationStage,
} from '@/components/bap-verification/types';
import FormErrorSummary from '@/components/form-error-summary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type VerificationForm = {
    result: VerificationResultValue;
    notes: string | null;
    checklist: ChecklistInput[];
    discrepancies: { type: ChecklistType; notes: string }[];
};

type Props = {
    checklist: ChecklistDefinition[];
    stage: VerificationStage;
    completeUrl: string;
};

/**
 * Physical checklist, result choice, and confirmation for one verification.
 * Submitting stays disabled until every reason listed under the form is
 * resolved, so the verifier always knows what is missing.
 */
export function VerificationChecklistForm({
    checklist,
    stage,
    completeUrl,
}: Props) {
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [discrepancyNotes, setDiscrepancyNotes] = useState<
        Partial<Record<ChecklistType, string>>
    >({});
    const form = useForm<VerificationForm>({
        result: 'passed',
        notes: '',
        checklist: checklist.map(emptyChecklistInput),
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
    const checkedCount = comparisons.filter(
        (comparison) => comparison.is_complete && comparison.is_attested,
    ).length;
    const progress =
        comparisons.length === 0
            ? 0
            : Math.round((checkedCount / comparisons.length) * 100);
    const blockers = submitBlockers(
        comparisons,
        form.data.result,
        discrepancyNotes,
    );
    const canSubmit = blockers.length === 0;
    const isClarification = form.data.result === 'discrepancy';

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
            notes: data.result === 'discrepancy' ? null : data.notes,
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
        form.post(completeUrl, {
            onFinish: () => setConfirmationOpen(false),
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Checklist pemeriksaan fisik</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Hitung dokumen fisik, isi nilai fisik, lalu centang
                        setiap item sebagai bukti pemeriksaan. Nilai sistem
                        tidak dapat diubah dari halaman ini.
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
                        <div className="grid gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span
                                    id="checklist-progress"
                                    className="font-medium"
                                >
                                    {checkedCount} dari {comparisons.length}{' '}
                                    item diperiksa
                                </span>
                                {mismatches.length > 0 ? (
                                    <StatusBadge
                                        label={`${mismatches.length} item selisih`}
                                        tone="danger"
                                    />
                                ) : null}
                            </div>
                            <div
                                role="progressbar"
                                aria-labelledby="checklist-progress"
                                aria-valuemin={0}
                                aria-valuemax={comparisons.length}
                                aria-valuenow={checkedCount}
                                className="bg-muted h-2 overflow-hidden rounded-full"
                            >
                                <div
                                    className="bg-primary h-full rounded-full transition-[width]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {comparisons.map((comparison, itemIndex) => (
                            <ChecklistItem
                                key={comparison.type}
                                comparison={comparison}
                                errors={{
                                    quantity:
                                        form.errors[
                                            `checklist.${itemIndex}.actual_quantity`
                                        ],
                                    rangeStart:
                                        form.errors[
                                            `checklist.${itemIndex}.actual_numerator_start`
                                        ],
                                    rangeEnd:
                                        form.errors[
                                            `checklist.${itemIndex}.actual_numerator_end`
                                        ],
                                }}
                                onChange={(changes) =>
                                    updateChecklist(itemIndex, changes)
                                }
                            />
                        ))}

                        <section
                            aria-labelledby="verification-result-label"
                            className="grid gap-3 rounded-xl border p-4"
                        >
                            <h3
                                id="verification-result-label"
                                className="font-medium"
                            >
                                Hasil {stage.label}
                            </h3>
                            <ResultChoice
                                value={form.data.result}
                                onChange={(value) =>
                                    form.setData('result', value)
                                }
                                labelledBy="verification-result-label"
                            />

                            {!isClarification && mismatches.length > 0 ? (
                                <Alert className="border-warning/30 bg-warning/5 text-warning">
                                    <AlertTriangle />
                                    <AlertTitle>
                                        Nilai fisik berbeda dari nilai sistem.
                                    </AlertTitle>
                                    <AlertDescription className="grid gap-2">
                                        <p>
                                            Hasil lulus tidak dapat dikirim
                                            selama ada selisih. Catat selisih
                                            agar Loket dapat memberikan
                                            klarifikasi.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-fit"
                                            onClick={() =>
                                                form.setData(
                                                    'result',
                                                    'discrepancy',
                                                )
                                            }
                                        >
                                            Pilih “Ada selisih”
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            {isClarification && mismatches.length > 0 ? (
                                <div className="grid gap-4 pt-2">
                                    {mismatches.map((mismatch, index) => {
                                        const noteError =
                                            form.errors[
                                                `discrepancies.${index}.notes` as keyof typeof form.errors
                                            ];
                                        const noteId = `discrepancy-${mismatch.type}`;

                                        return (
                                            <div
                                                key={mismatch.type}
                                                className="border-destructive/25 bg-destructive/5 grid gap-3 rounded-xl border p-4"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="font-medium">
                                                        {mismatch.label}
                                                    </p>
                                                    <StatusBadge
                                                        label={
                                                            mismatch.difference ===
                                                            0
                                                                ? 'Range berbeda'
                                                                : `Selisih ${formatSignedDifference(mismatch.difference)}`
                                                        }
                                                        tone="danger"
                                                    />
                                                </div>
                                                <p className="text-muted-foreground text-sm">
                                                    Nilai sistem:{' '}
                                                    <span className="text-foreground font-medium">
                                                        {
                                                            mismatch.expected_value
                                                        }
                                                    </span>{' '}
                                                    · Nilai fisik:{' '}
                                                    <span className="text-foreground font-medium">
                                                        {mismatch.actual_value}
                                                    </span>
                                                </p>
                                                <div className="grid gap-2">
                                                    <Label htmlFor={noteId}>
                                                        Catatan verifier
                                                    </Label>
                                                    <Textarea
                                                        id={noteId}
                                                        value={
                                                            discrepancyNotes[
                                                                mismatch.type
                                                            ] ?? ''
                                                        }
                                                        onChange={(event) =>
                                                            setDiscrepancyNotes(
                                                                (current) => ({
                                                                    ...current,
                                                                    [mismatch.type]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder="Jelaskan temuan fisik dan hal yang perlu dikonfirmasi Loket."
                                                        aria-invalid={
                                                            Boolean(
                                                                noteError,
                                                            ) || undefined
                                                        }
                                                        aria-describedby={
                                                            noteError
                                                                ? `${noteId}-error`
                                                                : undefined
                                                        }
                                                    />
                                                    {noteError ? (
                                                        <p
                                                            id={`${noteId}-error`}
                                                            className="text-destructive text-sm"
                                                        >
                                                            {noteError}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {isClarification ? null : (
                                <div className="grid gap-2 pt-2">
                                    <Label htmlFor="verification-notes">
                                        Catatan umum (opsional)
                                    </Label>
                                    <Textarea
                                        id="verification-notes"
                                        value={form.data.notes ?? ''}
                                        onChange={(event) =>
                                            form.setData(
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Catatan tambahan untuk riwayat verifikasi."
                                    />
                                </div>
                            )}
                            {form.errors.result ? (
                                <p className="text-destructive text-sm">
                                    {form.errors.result}
                                </p>
                            ) : null}
                            {form.errors.discrepancies ? (
                                <p className="text-destructive text-sm">
                                    {form.errors.discrepancies}
                                </p>
                            ) : null}
                        </section>

                        <FormErrorSummary
                            errors={form.errors}
                            fields={['checklist.*', 'discrepancies', 'result']}
                            title="Verifikasi belum dapat diselesaikan."
                        />

                        <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-start sm:justify-between">
                            <div
                                id="verification-submit-status"
                                className="text-sm"
                                aria-live="polite"
                            >
                                {canSubmit ? (
                                    <p className="text-success flex items-center gap-2 font-medium">
                                        <CheckCircle2 className="size-4" />
                                        Semua item lengkap, siap dikirim.
                                    </p>
                                ) : (
                                    <>
                                        <p className="font-medium">
                                            Belum dapat dikirim:
                                        </p>
                                        <ul className="text-muted-foreground mt-1 grid list-disc gap-1 pl-5">
                                            {blockers.map((blocker) => (
                                                <li key={blocker}>{blocker}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="sm:shrink-0"
                                variant={
                                    isClarification ? 'destructive' : 'default'
                                }
                                disabled={!canSubmit || form.processing}
                                aria-describedby="verification-submit-status"
                            >
                                <Send data-icon="inline-start" />
                                {isClarification
                                    ? `Kirim klarifikasi ${stage.label}`
                                    : `Selesaikan ${stage.label}`}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

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
                            {isClarification
                                ? `Kirim klarifikasi ${stage.label}?`
                                : `Selesaikan ${stage.label}?`}
                        </DialogTitle>
                        <DialogDescription>
                            {isClarification
                                ? `Selisih akan dikirim ke Loket melalui tiket klarifikasi ${stage.label}.`
                                : stage.is_phase_two
                                  ? 'Pastikan seluruh pemeriksaan fisik telah dilakukan. Hasil lulus meneruskan BAP ke Bendahara Barang untuk penerimaan administratif.'
                                  : 'Pastikan seluruh pemeriksaan fisik telah dilakukan. Hasil lulus diteruskan ke antrean Verifikasi Tahap 2.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DetailList>
                        <DetailRow
                            label="Item diperiksa"
                            value={`${checkedCount} dari ${comparisons.length}`}
                            numeric
                        />
                        <DetailRow
                            label="Hasil"
                            value={
                                <StatusBadge
                                    label={
                                        isClarification
                                            ? `Ada selisih (${mismatches.length} item)`
                                            : 'Lulus verifikasi'
                                    }
                                    tone={
                                        isClarification ? 'danger' : 'success'
                                    }
                                />
                            }
                        />
                    </DetailList>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                            >
                                Kembali
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant={
                                isClarification ? 'destructive' : 'default'
                            }
                            onClick={submit}
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Menyimpan...'
                                : isClarification
                                  ? 'Kirim klarifikasi'
                                  : 'Selesaikan verifikasi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
