import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export type StatusMeta = { label: string; tone: StatusTone };

const toneClassName: Record<StatusTone, string> = {
    neutral: 'border-border bg-muted text-muted-foreground',
    info: 'border-primary/30 bg-primary/15 text-primary',
    warning:
        'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    success: 'border-success/30 bg-success/15 text-success',
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

/**
 * Status pill in the app's established colors: primary for waiting/in progress,
 * amber for phase 2, green for done, red for problems. Stays on one line; the
 * table status column and mobile cards decide when a long label may wrap.
 */
export function StatusBadge({
    label,
    tone,
    className,
}: StatusMeta & { className?: string }) {
    return (
        <Badge variant="outline" className={cn(toneClassName[tone], className)}>
            {label}
        </Badge>
    );
}

/**
 * Builds filter options from a status map in its declared order.
 */
export function statusOptions<T extends string>(
    meta: Record<T, StatusMeta>,
): { value: T; label: string }[] {
    return (Object.keys(meta) as T[]).map((value) => ({
        value,
        label: meta[value].label,
    }));
}

export const activeStatusMeta: Record<'active' | 'inactive', StatusMeta> = {
    active: { label: 'Aktif', tone: 'success' },
    inactive: { label: 'Tidak aktif', tone: 'neutral' },
};

export function ActiveStatusBadge({ active }: { active: boolean }) {
    return (
        <StatusBadge {...activeStatusMeta[active ? 'active' : 'inactive']} />
    );
}
