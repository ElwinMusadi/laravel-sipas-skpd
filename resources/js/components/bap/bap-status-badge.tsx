import {
    StatusBadge,
    statusOptions,
    type StatusMeta,
} from '@/components/app/status-badge';

export type BapStatus =
    | 'draft'
    | 'submitted'
    | 'under_verification'
    | 'needs_clarification'
    | 'waiting_reverification_phase_1'
    | 'waiting_verification_phase_2'
    | 'under_verification_phase_2'
    | 'waiting_reverification_phase_2'
    | 'verified_phase_2'
    | 'completed';

/**
 * The single source of BAP status labels and tones, in lifecycle order.
 */
export const bapStatusMeta: Record<BapStatus, StatusMeta> = {
    draft: { label: 'Draft', tone: 'neutral' },
    submitted: { label: 'Menunggu Verifikasi Tahap 1', tone: 'info' },
    under_verification: { label: 'Sedang Diverifikasi Tahap 1', tone: 'info' },
    needs_clarification: { label: 'Perlu Klarifikasi', tone: 'danger' },
    waiting_reverification_phase_1: {
        label: 'Menunggu Verifikasi Ulang Tahap 1',
        tone: 'info',
    },
    waiting_verification_phase_2: {
        label: 'Menunggu Verifikasi Tahap 2',
        tone: 'warning',
    },
    under_verification_phase_2: {
        label: 'Sedang Diverifikasi Tahap 2',
        tone: 'warning',
    },
    waiting_reverification_phase_2: {
        label: 'Menunggu Verifikasi Ulang Tahap 2',
        tone: 'warning',
    },
    verified_phase_2: { label: 'Menunggu Penerimaan', tone: 'success' },
    completed: { label: 'Selesai Administratif', tone: 'success' },
};

/**
 * Status filter options in lifecycle order, using the same labels as the badge.
 */
export const bapStatusOptions = statusOptions(bapStatusMeta);

export function BapStatusBadge({
    status,
    className,
}: {
    status: BapStatus;
    className?: string;
}) {
    return <StatusBadge {...bapStatusMeta[status]} className={className} />;
}
