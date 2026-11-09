import { formatQuantity } from '@/components/inventory/format';

/**
 * Physical minus system value with an explicit sign, e.g. "+3", "−2" or "0".
 */
export function formatSignedDifference(value: number | null): string {
    if (value === null) {
        return '—';
    }

    if (value === 0) {
        return '0';
    }

    return `${value > 0 ? '+' : '−'}${formatQuantity(Math.abs(value))}`;
}

/**
 * How long an item has been waiting since `value`, e.g. "3 jam".
 */
export function formatWaitingDuration(value: string | null): string {
    if (!value) {
        return '—';
    }

    const minutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
    );

    if (minutes < 60) {
        return `${minutes} menit`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} jam`;
    }

    return `${Math.floor(hours / 24)} hari`;
}
