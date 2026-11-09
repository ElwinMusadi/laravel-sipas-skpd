import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = Omit<
    ComponentProps<typeof Input>,
    'value' | 'onChange' | 'type'
> & {
    value: string;
    onValueChange: (value: string) => void;
};

/**
 * Seven-digit Nomerator field: digits only, numeric keypad on phones, and
 * zero-padded when the field loses focus (e.g. 582608 becomes 0582608).
 */
export function NomeratorInput({
    value,
    onValueChange,
    className,
    onBlur,
    ...props
}: Props) {
    return (
        <Input
            {...props}
            type="text"
            value={value}
            inputMode="numeric"
            autoComplete="off"
            maxLength={7}
            placeholder={props.placeholder ?? '0000000'}
            className={cn('font-mono tabular-nums', className)}
            onChange={(event) =>
                onValueChange(event.target.value.replace(/\D/g, '').slice(0, 7))
            }
            onBlur={(event) => {
                if (value !== '' && !props.readOnly) {
                    onValueChange(value.padStart(7, '0'));
                }

                onBlur?.(event);
            }}
        />
    );
}
