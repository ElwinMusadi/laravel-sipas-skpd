import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Label/value pairs for detail cards. Wrap `DetailRow`s in a `DetailList`.
 */
export function DetailList({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <dl className={cn('grid gap-3 text-sm', className)}>{children}</dl>;
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
        <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd
                className={cn(
                    'min-w-0 text-right font-medium break-words',
                    mono && 'font-mono text-xs whitespace-nowrap',
                    numeric && 'tabular-nums',
                )}
            >
                {value}
            </dd>
        </div>
    );
}
