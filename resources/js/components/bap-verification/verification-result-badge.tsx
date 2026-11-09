import { StatusBadge, type StatusMeta } from '@/components/app/status-badge';

export type VerificationResult = 'passed' | 'discrepancy' | null;

/**
 * Label and tone for a verification attempt; `null` means still in progress.
 */
export function verificationResultMeta(result: VerificationResult): StatusMeta {
    switch (result) {
        case 'passed':
            return { label: 'Lulus', tone: 'success' };
        case 'discrepancy':
            return { label: 'Ada selisih', tone: 'danger' };
        default:
            return { label: 'Sedang diperiksa', tone: 'info' };
    }
}

export function VerificationResultBadge({
    result,
    className,
}: {
    result: VerificationResult;
    className?: string;
}) {
    return (
        <StatusBadge
            {...verificationResultMeta(result)}
            className={className}
        />
    );
}
