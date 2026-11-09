import { Badge } from '@/components/ui/badge';

export type AllocationStatus =
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'cancelled'
    | 'returned';

const statusPresentation: Record<
    AllocationStatus,
    { label: string; className: string }
> = {
    pending: {
        label: 'Menunggu handover',
        className: 'border-primary/30 bg-primary/15 text-primary',
    },
    accepted: {
        label: 'Diterima',
        className: 'border-success/30 bg-success/15 text-success',
    },
    completed: {
        label: 'Selesai digunakan',
        className: 'border-border bg-muted text-muted-foreground',
    },
    cancelled: {
        label: 'Dibatalkan',
        className: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
    returned: {
        label: 'Dikembalikan ke pusat',
        className: 'border-border bg-muted text-muted-foreground',
    },
};

export function AllocationStatusBadge({
    status,
}: {
    status: AllocationStatus;
}) {
    const presentation = statusPresentation[status];

    return (
        <Badge variant="outline" className={presentation.className}>
            {presentation.label}
        </Badge>
    );
}
