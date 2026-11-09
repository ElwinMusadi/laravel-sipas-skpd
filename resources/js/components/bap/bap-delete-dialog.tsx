import { Trash2 } from 'lucide-react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { formatRange } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';

type Props = {
    bap: {
        id: number;
        document_number: string;
        loket: { name: string };
        numerator_start: number;
        numerator_end: number;
    };
};

export function BapDeleteDialog({ bap }: Props) {
    return (
        <ConfirmActionDialog
            action={SkpdBapController.destroy(bap.id)}
            trigger={
                <Button variant="destructive">
                    <Trash2 data-icon="inline-start" />
                    Hapus draft
                </Button>
            }
            title="Hapus draft BAP SKPD?"
            description="Draft beserta detail Batal/Rusak-nya akan dihapus. Nomerator kembali tersedia untuk BAP berikutnya."
            confirmLabel="Ya, hapus draft"
            processingLabel="Menghapus..."
            errorTitle="Draft BAP tidak dapat dihapus."
            destructive
        >
            <DetailList className="bg-muted rounded-xl p-4">
                <DetailRow label="Nomor BAP" value={bap.document_number} />
                <DetailRow label="Loket" value={bap.loket.name} />
                <DetailRow
                    label="Range Nomerator"
                    value={formatRange(bap.numerator_start, bap.numerator_end)}
                    mono
                />
            </DetailList>
        </ConfirmActionDialog>
    );
}
