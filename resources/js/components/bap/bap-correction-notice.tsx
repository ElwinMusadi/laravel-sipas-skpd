import { FilePenLine } from 'lucide-react';
import { formatDateTime } from '@/components/inventory/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type BapCorrectionRequest = {
    stage_label: string;
    notes: string;
    resolved_by: string;
    resolved_at: string;
};

/**
 * Tells the Loket why a verifier returned this BAP as a draft and what happens
 * after it is corrected and resubmitted.
 */
export function BapCorrectionNotice({
    correction,
}: {
    correction: BapCorrectionRequest;
}) {
    return (
        <Alert>
            <FilePenLine />
            <AlertTitle>BAP dikembalikan untuk koreksi</AlertTitle>
            <AlertDescription className="grid gap-2">
                <p>
                    {correction.resolved_by} ({correction.stage_label})
                    mengembalikan BAP ini pada{' '}
                    {formatDateTime(correction.resolved_at)}. Perbaiki data
                    sesuai catatan berikut, lalu ajukan ulang. BAP akan
                    diverifikasi kembali mulai Verifikasi Tahap 1.
                </p>
                <p className="text-foreground font-medium whitespace-pre-line">
                    {correction.notes}
                </p>
            </AlertDescription>
        </Alert>
    );
}
