import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/app/page-header';
import type { CancellationReason } from '@/components/bap/bap-cancellation-fields';
import {
    BapCorrectionNotice,
    type BapCorrectionRequest,
} from '@/components/bap/bap-correction-notice';
import { BapForm } from '@/components/bap/bap-form';
import { BapStatusBadge } from '@/components/bap/bap-status-badge';
import { edit, index, show } from '@/routes/baps';

type Props = {
    bap: {
        id: number;
        document_number: string;
        service_date: string;
        numerator_start: number;
        numerator_end: number;
        online_usage_count: number;
        loket: { id: number; name: string };
        cancellation_count: number;
        cancellations: {
            numerator: number;
            reason: string;
            description: string | null;
        }[];
        range_locked: boolean;
        correction_request: BapCorrectionRequest | null;
    };
    cancellation_reasons: CancellationReason[];
};

export default function EditBap({ bap, cancellation_reasons }: Props) {
    return (
        <>
            <Head title={`Ubah draft ${bap.document_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: show(bap.id),
                        label: `Kembali ke ${bap.document_number}`,
                    }}
                    title={`Ubah draft ${bap.document_number}`}
                    badges={<BapStatusBadge status="draft" />}
                    description="Periksa kembali range, total otomatis, dan pemakaian online sebelum BAP diajukan."
                />

                {bap.correction_request ? (
                    <BapCorrectionNotice correction={bap.correction_request} />
                ) : null}

                <BapForm
                    mode="edit"
                    bap={bap}
                    cancellationReasons={cancellation_reasons}
                    rangeLocked={bap.range_locked}
                />
            </div>
        </>
    );
}

EditBap.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: props.bap.document_number, href: show(props.bap.id) },
        { title: 'Ubah draft', href: edit(props.bap.id) },
    ],
});
