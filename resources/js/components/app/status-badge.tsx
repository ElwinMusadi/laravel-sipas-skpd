import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export type StatusMeta = { label: string; tone: StatusTone };

const toneClassName: Record<StatusTone, string> = {
    neutral: 'border-border bg-muted text-muted-foreground',
    info: 'border-info/30 bg-info/10 text-info',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    success: 'border-success/30 bg-success/10 text-success',
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

/**
 * Status pill on semantic color tokens so every status reads the same in light
 * and dark mode. Long labels wrap instead of being clipped.
 */
export function StatusBadge({
    label,
    tone,
    className,
}: StatusMeta & { className?: string }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'h-auto max-w-full py-0.5 leading-tight whitespace-normal',
                toneClassName[tone],
                className,
            )}
        >
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
