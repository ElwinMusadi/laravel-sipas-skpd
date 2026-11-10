import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Label/value pairs for detail cards. Wrap `DetailRow`s in a `DetailList`.
 * The list is a size container: in a narrow card each value sits under its
 * label, and from 20rem the label and value share one line.
 */
export function DetailList({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <dl className={cn('@container grid gap-3 text-sm', className)}>
            {children}
        </dl>
    );
}

export function DetailRow({
    label,
    value,
    mono = false,
    numeric = false,
}: {
    label: string;
    value: ReactNode;
    mono?: boolean;
    numeric?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5 @xs:flex-row @xs:items-start @xs:justify-between @xs:gap-4">
            <dt className="text-muted-foreground @xs:shrink-0">{label}</dt>
            <dd
                className={cn(
                    'min-w-0 font-medium break-words @xs:text-right',
                    mono && 'font-mono text-xs',
                    numeric && 'tabular-nums',
                )}
            >
                {value}
            </dd>
        </div>
    );
}
