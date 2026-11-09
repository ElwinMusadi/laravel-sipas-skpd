import {
    StatusBadge as AppStatusBadge,
    type StatusMeta,
} from '@/components/app/status-badge';
import type { DashboardStatus } from './dashboard-data';

/**
 * Urgency of a dashboard work item. BAP rows use BapStatusBadge instead.
 */
const workItemMeta: Record<DashboardStatus, StatusMeta> = {
    draft: { label: 'Draft', tone: 'neutral' },
    waiting: { label: 'Menunggu', tone: 'info' },
    in_progress: { label: 'Sedang diproses', tone: 'warning' },
    discrepancy: { label: 'Perlu tindakan', tone: 'danger' },
    completed: { label: 'Selesai', tone: 'success' },
};

export function StatusBadge({ status }: { status: DashboardStatus }) {
    return <AppStatusBadge {...workItemMeta[status]} />;
}
