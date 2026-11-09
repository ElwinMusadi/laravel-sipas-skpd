import { CheckCircle2, FileWarning } from 'lucide-react';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { StatusBadge } from '@/components/app/status-badge';
import { formatSignedDifference } from '@/components/bap-verification/format';
import type { Verification } from '@/components/bap-verification/types';
import { formatDateTime } from '@/components/inventory/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Read-only outcome of a completed check, including each recorded difference.
 */
export function VerificationResultCard({
    verification,
    stageLabel,
    isPhaseTwo,
}: {
    verification: Verification;
    stageLabel: string;
    isPhaseTwo: boolean;
}) {
    const passed = verification.result === 'passed';

    return (
        <Card
            className={cn(
                passed
                    ? 'border-success/30 bg-success/5'
                    : 'border-destructive/30 bg-destructive/5',
            )}
        >
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    {passed ? (
                        <CheckCircle2 className="text-success size-5" />
                    ) : (
                        <FileWarning className="text-destructive size-5" />
                    )}
                    {passed
                        ? `${stageLabel} lulus`
                        : `${stageLabel} menemukan selisih`}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <DetailList className="sm:grid-cols-2 sm:gap-x-8">
                    <DetailRow
                        label="Pemeriksa"
                        value={verification.verifier}
                    />
                    <DetailRow
                        label="Diselesaikan"
                        value={
                            verification.completed_at
                                ? formatDateTime(verification.completed_at)
                                : 'Belum selesai'
                        }
                    />
                </DetailList>
                <p className="text-sm">
                    {passed
                        ? isPhaseTwo
                            ? 'BAP diteruskan ke Bendahara Barang untuk penerimaan administratif.'
                            : 'BAP telah diteruskan ke antrean Verifikasi Tahap 2.'
                        : 'Selisih dikirim ke Loket melalui tiket klarifikasi. Setelah tanggapan ditinjau, BAP diverifikasi ulang atau dikembalikan untuk koreksi.'}
                </p>
                {verification.notes ? (
                    <p className="text-muted-foreground bg-background/60 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                        {verification.notes}
                    </p>
                ) : null}
                {verification.discrepancies.length > 0 ? (
                    <ul className="grid gap-3">
                        {verification.discrepancies.map((discrepancy) => (
                            <li
                                key={discrepancy.type}
                                className="bg-background/60 grid gap-1 rounded-lg border p-3 text-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium">
                                        {discrepancy.label}
                                    </p>
                                    <StatusBadge
                                        label={`Selisih ${formatSignedDifference(discrepancy.difference)}`}
                                        tone="danger"
                                    />
                                </div>
                                <p className="text-muted-foreground">
                                    Nilai sistem:{' '}
                                    <span className="text-foreground font-medium">
                                        {discrepancy.expected_value}
                                    </span>{' '}
                                    · Nilai fisik:{' '}
                                    <span className="text-foreground font-medium">
                                        {discrepancy.actual_value}
                                    </span>
                                </p>
                                <p className="whitespace-pre-wrap">
                                    {discrepancy.notes}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </CardContent>
        </Card>
    );
}
