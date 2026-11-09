import { Send } from 'lucide-react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import {
    formatDate,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';

type Props = {
    bap: {
        id: number;
        loket: { name: string };
        service_date: string;
        numerator_start: number;
        numerator_end: number;
        total_usage: number;
        online_usage_count: number;
        cancellation_count?: number;
    };
};

export function BapSubmitDialog({ bap }: Props) {
    return (
        <ConfirmActionDialog
            action={SkpdBapController.submit(bap.id)}
            trigger={
                <Button>
                    <Send data-icon="inline-start" />
                    Ajukan BAP
                </Button>
            }
            title="Ajukan BAP SKPD?"
            description="Setelah diajukan, data BAP tidak dapat diubah dan BAP masuk antrean Verifikasi Tahap 1. Perubahan hanya dapat dilakukan bila verifier mengembalikannya untuk koreksi."
            confirmLabel="Ya, ajukan BAP"
            errorTitle="BAP tidak dapat diajukan."
        >
            <DetailList className="bg-muted rounded-xl p-4">
                <DetailRow label="Loket" value={bap.loket.name} />
                <DetailRow
                    label="Tanggal pelayanan"
                    value={formatDate(bap.service_date)}
                />
                <DetailRow
                    label="Nomerator"
                    value={formatRange(bap.numerator_start, bap.numerator_end)}
                    mono
                />
                <DetailRow
                    label="Total pemakaian"
                    value={`${formatQuantity(bap.total_usage)} set`}
                    numeric
                />
                <DetailRow
                    label="Online"
                    value={`${formatQuantity(bap.online_usage_count)} set`}
                    numeric
                />
                {bap.cancellation_count === undefined ? null : (
                    <DetailRow
                        label="Batal/Rusak"
                        value={`${formatQuantity(bap.cancellation_count)} set`}
                        numeric
                    />
                )}
            </DetailList>
        </ConfirmActionDialog>
    );
}
