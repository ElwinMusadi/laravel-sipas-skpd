import {
    StatusBadge,
    statusOptions,
    type StatusMeta,
} from '@/components/app/status-badge';
import type { BoxStatus } from './types';

export const boxStatusMeta: Record<BoxStatus, StatusMeta> = {
    available: { label: 'Tersedia', tone: 'success' },
    partially_allocated: { label: 'Dialokasikan sebagian', tone: 'info' },
    fully_allocated: { label: 'Terdistribusi penuh', tone: 'neutral' },
    depleted: { label: 'Habis digunakan', tone: 'neutral' },
};

export const boxStatusOptions = statusOptions(boxStatusMeta);

export function BoxStatusBadge({ status }: { status: BoxStatus }) {
    return <StatusBadge {...boxStatusMeta[status]} />;
}
