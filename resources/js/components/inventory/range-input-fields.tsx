import { NomeratorInput } from '@/components/app/nomerator-input';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatQuantity, formatRange } from './format';

type Props = {
    numeratorStart: string;
    numeratorEnd: string;
    onNumeratorStartChange: (value: string) => void;
    onNumeratorEndChange: (value: string) => void;
    errors: {
        numerator_start?: string;
        numerator_end?: string;
    };
    /** The range the entry must stay inside, such as the selected Box. */
    bounds?: { start: number; end: number } | null;
};

type RangeSummary =
    | { kind: 'incomplete' }
    | { kind: 'reversed' }
    | { kind: 'outside'; quantity: number }
    | { kind: 'valid'; quantity: number };

function summarizeRange(
    start: string,
    end: string,
    bounds: Props['bounds'],
): RangeSummary {
    if (start === '' || end === '') {
        return { kind: 'incomplete' };
    }

    const first = Number(start);
    const last = Number(end);

    if (last <= first) {
        return { kind: 'reversed' };
    }

    const quantity = last - first + 1;

    if (bounds && (first < bounds.start || last > bounds.end)) {
        return { kind: 'outside', quantity };
    }

    return { kind: 'valid', quantity };
}

/**
 * Nomerator awal/akhir pair with a live set count, so the operator sees the
 * quantity (and an obviously wrong range) before submitting.
 */
export function RangeInputFields({
    numeratorStart,
    numeratorEnd,
    onNumeratorStartChange,
    onNumeratorEndChange,
    errors,
    bounds = null,
}: Props) {
    const summary = summarizeRange(numeratorStart, numeratorEnd, bounds);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor="numerator_start">Nomerator awal</Label>
                <NomeratorInput
                    id="numerator_start"
                    name="numerator_start"
                    value={numeratorStart}
                    onValueChange={onNumeratorStartChange}
                    placeholder="0582608"
                    required
                    aria-invalid={Boolean(errors.numerator_start)}
                    aria-describedby="numerator-range-summary"
                />
                <InputError message={errors.numerator_start} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="numerator_end">Nomerator akhir</Label>
                <NomeratorInput
                    id="numerator_end"
                    name="numerator_end"
                    value={numeratorEnd}
                    onValueChange={onNumeratorEndChange}
                    placeholder="0583607"
                    required
                    aria-invalid={Boolean(errors.numerator_end)}
                    aria-describedby="numerator-range-summary"
                />
                <InputError message={errors.numerator_end} />
            </div>
            <div
                id="numerator-range-summary"
                aria-live="polite"
                className={cn(
                    'bg-muted flex flex-col gap-1 rounded-xl px-4 py-3 text-sm sm:col-span-2 sm:flex-row sm:items-center sm:justify-between',
                    summary.kind === 'reversed' && 'bg-destructive/10',
                    summary.kind === 'outside' && 'bg-warning/10',
                )}
            >
                <span className="text-muted-foreground">Jumlah set</span>
                {summary.kind === 'incomplete' ? (
                    <span className="text-muted-foreground">
                        Isi Nomerator awal dan akhir
                    </span>
                ) : null}
                {summary.kind === 'reversed' ? (
                    <span className="text-destructive font-medium">
                        Nomerator akhir harus lebih besar dari Nomerator awal
                    </span>
                ) : null}
                {summary.kind === 'outside' && bounds ? (
                    <span className="text-warning font-medium">
                        {formatQuantity(summary.quantity)} set · di luar rentang
                        Box {formatRange(bounds.start, bounds.end)}
                    </span>
                ) : null}
                {summary.kind === 'valid' ? (
                    <strong className="text-foreground tabular-nums">
                        {formatQuantity(summary.quantity)} set
                    </strong>
                ) : null}
            </div>
        </div>
    );
}
