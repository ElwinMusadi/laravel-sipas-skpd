import { StatusBadge, type StatusMeta } from '@/components/app/status-badge';

export type ClarificationStatus =
    | 'waiting_response'
    | 'responded'
    | 'resolved'
    | 'reopened';

export type ClarificationOutcome =
    | 'resolved'
    | 'reopened'
    | 'returned_for_correction';

/**
 * Clarification ticket statuses in lifecycle order.
 */
export const clarificationStatusMeta: Record<ClarificationStatus, StatusMeta> =
    {
        waiting_response: { label: 'Menunggu Tanggapan', tone: 'warning' },
        responded: { label: 'Menunggu Tinjauan', tone: 'info' },
        resolved: { label: 'Selesai', tone: 'success' },
        reopened: { label: 'Perlu Klarifikasi Ulang', tone: 'danger' },
    };

/**
 * Verifier decisions on a Loket response.
 */
export const clarificationOutcomeMeta: Record<
    ClarificationOutcome,
    StatusMeta
> = {
    resolved: { label: 'Penyelesaian diterima', tone: 'success' },
    reopened: { label: 'Perlu klarifikasi ulang', tone: 'danger' },
    returned_for_correction: {
        label: 'Dikembalikan untuk koreksi',
        tone: 'warning',
    },
};

/**
 * Falls back to the server label for a status this map does not know yet.
 */
export function ClarificationStatusBadge({
    status,
    fallbackLabel,
    className,
}: {
    status: string;
    fallbackLabel?: string;
    className?: string;
}) {
    const meta = clarificationStatusMeta[status as ClarificationStatus] ?? {
        label: fallbackLabel ?? status,
        tone: 'neutral',
    };

    return <StatusBadge {...meta} className={className} />;
}

export function ClarificationOutcomeBadge({
    outcome,
    fallbackLabel,
}: {
    outcome: string;
    fallbackLabel?: string;
}) {
    const meta = clarificationOutcomeMeta[outcome as ClarificationOutcome] ?? {
        label: fallbackLabel ?? outcome,
        tone: 'neutral',
    };

    return <StatusBadge {...meta} />;
}
