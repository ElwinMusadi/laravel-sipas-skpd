import { NomeratorInput } from '@/components/app/nomerator-input';
import InputError from '@/components/input-error';
import { formatRange } from '@/components/inventory/format';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export type CancellationReason = { value: string; label: string };

export type CancellationItem = {
    numerator: string;
    reason: string;
    description: string;
};

type Props = {
    items: CancellationItem[];
    reasons: CancellationReason[];
    formId: string;
    errors: Partial<Record<string, string>>;
    /** The BAP range, when valid, to flag Nomerator outside it before saving. */
    range: { start: number; end: number } | null;
    onChange: (
        index: number,
        field: keyof CancellationItem,
        value: string,
    ) => void;
};

/**
 * One Nomerator + reason row per SKPD Batal/Rusak. Values are submitted through
 * hidden inputs so the visible controls can stay controlled components.
 */
export function BapCancellationFields({
    items,
    reasons,
    formId,
    errors,
    range,
    onChange,
}: Props) {
    return (
        <section className="grid gap-4 border-t pt-4 sm:col-span-2">
            <div className="grid gap-1">
                <h2 className="font-medium">Detail SKPD Batal/Rusak</h2>
                <p className="text-muted-foreground text-sm">
                    Lengkapi Nomerator dan alasan untuk setiap SKPD Batal/Rusak.
                </p>
            </div>

            {items.map((item, index) => {
                const numeratorError =
                    errors[`cancellations.${index}.numerator`];
                const reasonError = errors[`cancellations.${index}.reason`];
                const descriptionError =
                    errors[`cancellations.${index}.description`];
                const numeratorWarning = numeratorHint(
                    item.numerator,
                    index,
                    items,
                    range,
                );
                const numeratorId = `cancellations-${index}-numerator`;

                return (
                    <div key={index} className="grid gap-3">
                        {index > 0 ? <Separator /> : null}
                        <p className="text-muted-foreground text-xs font-medium">
                            Batal/Rusak #{index + 1}
                        </p>
                        <input
                            type="hidden"
                            name={`cancellations[${index}][numerator]`}
                            form={formId}
                            value={item.numerator}
                        />
                        <input
                            type="hidden"
                            name={`cancellations[${index}][reason]`}
                            form={formId}
                            value={item.reason}
                        />
                        <input
                            type="hidden"
                            name={`cancellations[${index}][description]`}
                            form={formId}
                            value={item.description}
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor={numeratorId}>Nomerator</Label>
                                <NomeratorInput
                                    id={numeratorId}
                                    value={item.numerator}
                                    onValueChange={(value) =>
                                        onChange(index, 'numerator', value)
                                    }
                                    placeholder="0582612"
                                    aria-invalid={Boolean(numeratorError)}
                                    aria-describedby={
                                        numeratorWarning
                                            ? `${numeratorId}-hint`
                                            : undefined
                                    }
                                />
                                {numeratorWarning ? (
                                    <p
                                        id={`${numeratorId}-hint`}
                                        className="text-warning text-xs"
                                    >
                                        {numeratorWarning}
                                    </p>
                                ) : null}
                                <InputError message={numeratorError} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor={`cancellations-${index}-reason`}
                                >
                                    Alasan Batal/Rusak
                                </Label>
                                <Select
                                    value={item.reason}
                                    onValueChange={(value) =>
                                        onChange(index, 'reason', value)
                                    }
                                >
                                    <SelectTrigger
                                        id={`cancellations-${index}-reason`}
                                        className="w-full"
                                        aria-invalid={Boolean(reasonError)}
                                    >
                                        <SelectValue placeholder="Pilih alasan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {reasons.map((reason) => (
                                                <SelectItem
                                                    key={reason.value}
                                                    value={reason.value}
                                                >
                                                    {reason.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <InputError message={reasonError} />
                            </div>
                        </div>

                        {item.reason === 'custom' || descriptionError ? (
                            <div className="grid gap-2">
                                <Label
                                    htmlFor={`cancellations-${index}-description`}
                                >
                                    Keterangan
                                </Label>
                                <Textarea
                                    id={`cancellations-${index}-description`}
                                    value={item.description}
                                    onChange={(event) =>
                                        onChange(
                                            index,
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={1000}
                                    placeholder="Jelaskan kondisi batal atau rusak secara singkat."
                                    aria-invalid={Boolean(descriptionError)}
                                />
                                <InputError message={descriptionError} />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </section>
    );
}

/**
 * Early warning for a complete Nomerator that the server would reject: outside
 * the BAP range or already used on an earlier row.
 */
function numeratorHint(
    numerator: string,
    index: number,
    items: CancellationItem[],
    range: Props['range'],
): string | null {
    if (numerator.length !== 7) {
        return null;
    }

    const value = Number(numerator);

    if (range !== null && (value < range.start || value > range.end)) {
        return `Di luar range BAP ${formatRange(range.start, range.end)}.`;
    }

    const isDuplicate = items
        .slice(0, index)
        .some((item) => item.numerator === numerator);

    return isDuplicate ? 'Nomerator ini sudah diisi pada baris lain.' : null;
}
