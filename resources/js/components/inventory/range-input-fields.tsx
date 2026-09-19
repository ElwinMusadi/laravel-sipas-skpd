import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatQuantity } from './format';

type Props = {
    numeratorStart: string;
    numeratorEnd: string;
    onNumeratorStartChange: (value: string) => void;
    onNumeratorEndChange: (value: string) => void;
    errors: {
        numerator_start?: string;
        numerator_end?: string;
    };
};

function onlyNomeratorDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 7);
}

function quantityForRange(start: string, end: string): number | null {
    if (!/^\d{7}$/.test(start) || !/^\d{7}$/.test(end)) {
        return null;
    }

    const quantity = Number(end) - Number(start) + 1;

    return quantity > 0 ? quantity : null;
}

export function RangeInputFields({
    numeratorStart,
    numeratorEnd,
    onNumeratorStartChange,
    onNumeratorEndChange,
    errors,
}: Props) {
    const quantity = quantityForRange(numeratorStart, numeratorEnd);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor="numerator_start">Nomerator awal</Label>
                <Input
                    id="numerator_start"
                    name="numerator_start"
                    value={numeratorStart}
                    onChange={(event) =>
                        onNumeratorStartChange(
                            onlyNomeratorDigits(event.target.value),
                        )
                    }
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="0582608"
                    aria-invalid={Boolean(errors.numerator_start)}
                />
                <InputError message={errors.numerator_start} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="numerator_end">Nomerator akhir</Label>
                <Input
                    id="numerator_end"
                    name="numerator_end"
                    value={numeratorEnd}
                    onChange={(event) =>
                        onNumeratorEndChange(
                            onlyNomeratorDigits(event.target.value),
                        )
                    }
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="0582620"
                    aria-invalid={Boolean(errors.numerator_end)}
                />
                <InputError message={errors.numerator_end} />
            </div>
            <div className="bg-muted text-muted-foreground flex items-center justify-between rounded-xl px-4 py-3 text-sm sm:col-span-2">
                <span>Jumlah set dihitung otomatis</span>
                <strong className="text-foreground">
                    {quantity === null
                        ? 'Masukkan rentang valid'
                        : `${formatQuantity(quantity)} set`}
                </strong>
            </div>
        </div>
    );
}
