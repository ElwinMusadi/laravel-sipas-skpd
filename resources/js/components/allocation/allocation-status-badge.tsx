import {
    StatusBadge,
    statusOptions,
    type StatusMeta,
} from '@/components/app/status-badge';

export type AllocationStatus =
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'cancelled'
    | 'returned';

export const allocationStatusMeta: Record<AllocationStatus, StatusMeta> = {
    pending: { label: 'Menunggu handover', tone: 'info' },
    accepted: { label: 'Diterima', tone: 'success' },
    completed: { label: 'Selesai digunakan', tone: 'neutral' },
    cancelled: { label: 'Dibatalkan', tone: 'danger' },
    returned: { label: 'Dikembalikan ke pusat', tone: 'neutral' },
};

export const allocationStatusOptions = statusOptions(allocationStatusMeta);

export function AllocationStatusBadge({
    status,
}: {
    status: AllocationStatus;
}) {
    return <StatusBadge {...allocationStatusMeta[status]} />;
}
