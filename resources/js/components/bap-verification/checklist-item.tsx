import { NomeratorInput } from '@/components/app/nomerator-input';
import { StatusBadge, type StatusMeta } from '@/components/app/status-badge';
import { formatSignedDifference } from '@/components/bap-verification/format';
import type {
    ChecklistComparison,
    ChecklistInput,
} from '@/components/bap-verification/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    comparison: ChecklistComparison;
    errors: {
        quantity?: string;
        rangeStart?: string;
        rangeEnd?: string;
    };
    onChange: (changes: Partial<ChecklistInput>) => void;
};

function comparisonStatus(comparison: ChecklistComparison): StatusMeta {
    if (comparison.issue) {
        return { label: 'Belum valid', tone: 'warning' };
    }

    if (!comparison.is_complete) {
        return { label: 'Belum diisi', tone: 'neutral' };
    }

    if (comparison.matches) {
        return { label: 'Sesuai', tone: 'success' };
    }

    return {
        label:
            comparison.difference === 0
                ? 'Range berbeda'
                : `Selisih ${formatSignedDifference(comparison.difference)}`,
        tone: 'danger',
    };
}

/**
 * One physical check: the system value beside the counted value, the
 * attestation checkbox, and the live comparison result.
 */
export function ChecklistItem({ comparison, errors, onChange }: Props) {
    const id = comparison.type;
    const status = comparisonStatus(comparison);
    const isMismatch = comparison.is_complete && comparison.matches === false;
    const isNumerator = comparison.type === 'numerator';
    const rangeError = errors.rangeStart ?? errors.rangeEnd;

    return (
        <fieldset
            className={cn(
                'grid gap-4 rounded-xl border p-4',
                isMismatch && 'border-destructive/40',
                comparison.matches &&
                    comparison.is_attested &&
                    'border-success/40',
            )}
        >
            <legend className="sr-only">{comparison.label}</legend>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium" aria-hidden="true">
                    {comparison.label}
                </p>
                <StatusBadge {...status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                    <span className="text-muted-foreground text-xs">
                        Nilai sistem
                    </span>
                    <p
                        className={cn(
                            'bg-muted/50 rounded-md border px-3 py-2 text-sm font-medium tabular-nums',
                            isNumerator && 'font-mono',
                        )}
                    >
                        {comparison.expected_value}
                    </p>
                </div>

                {isNumerator ? (
                    <div className="grid content-start gap-1.5">
                        <span className="text-muted-foreground text-xs">
                            Nilai fisik (range Nomerator)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1">
                                <Label
                                    htmlFor={`physical-${id}-start`}
                                    className="text-xs font-normal"
                                >
                                    Awal
                                </Label>
                                <NomeratorInput
                                    id={`physical-${id}-start`}
                                    value={comparison.actual_numerator_start}
                                    onValueChange={(value) =>
                                        onChange({
                                            actual_numerator_start: value,
                                        })
                                    }
                                    aria-invalid={
                                        Boolean(errors.rangeStart) ||
                                        Boolean(comparison.issue) ||
                                        undefined
                                    }
                                    aria-describedby={
                                        rangeError || comparison.issue
                                            ? `physical-${id}-error`
                                            : undefined
                                    }
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label
                                    htmlFor={`physical-${id}-end`}
                                    className="text-xs font-normal"
                                >
                                    Akhir
                                </Label>
                                <NomeratorInput
                                    id={`physical-${id}-end`}
                                    value={comparison.actual_numerator_end}
                                    onValueChange={(value) =>
                                        onChange({
                                            actual_numerator_end: value,
                                        })
                                    }
                                    aria-invalid={
                                        Boolean(errors.rangeEnd) ||
                                        Boolean(comparison.issue) ||
                                        undefined
                                    }
                                    aria-describedby={
                                        rangeError || comparison.issue
                                            ? `physical-${id}-error`
                                            : undefined
                                    }
                                />
                            </div>
                        </div>
                        {rangeError || comparison.issue ? (
                            <p
                                id={`physical-${id}-error`}
                                className="text-destructive text-sm"
                            >
                                {rangeError ?? comparison.issue}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div className="grid content-start gap-1.5">
                        <Label
                            htmlFor={`physical-${id}`}
                            className="text-muted-foreground text-xs font-normal"
                        >
                            Nilai fisik ({comparison.unit})
                        </Label>
                        <Input
                            id={`physical-${id}`}
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
                            autoComplete="off"
                            className="tabular-nums"
                            placeholder="Hasil hitung fisik"
                            aria-invalid={Boolean(errors.quantity) || undefined}
                            aria-describedby={
                                errors.quantity
                                    ? `physical-${id}-error`
                                    : undefined
                            }
                        />
                        {errors.quantity ? (
                            <p
                                id={`physical-${id}-error`}
                                className="text-destructive text-sm"
                            >
                                {errors.quantity}
                            </p>
                        ) : null}
                    </div>
                )}
            </div>

            {isMismatch ? (
                <p className="text-destructive text-sm">
                    Nilai sistem {comparison.expected_value}, nilai fisik{' '}
                    {comparison.actual_value}
                    {comparison.difference === 0
                        ? '. Jumlahnya sama, tetapi range Nomerator berbeda.'
                        : `: selisih ${formatSignedDifference(comparison.difference)} ${comparison.unit}.`}
                </p>
            ) : null}

            <div className="flex items-start gap-3">
                <Checkbox
                    id={`attested-${id}`}
                    checked={comparison.is_attested}
                    onCheckedChange={(checked) =>
                        onChange({ is_attested: checked === true })
                    }
                    className="mt-0.5"
                />
                <Label
                    htmlFor={`attested-${id}`}
                    className="leading-snug font-normal"
                >
                    {comparison.label} telah diperiksa secara fisik
                </Label>
            </div>
        </fieldset>
    );
}
