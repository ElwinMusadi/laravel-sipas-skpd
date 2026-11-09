import { Head } from '@inertiajs/react';
import {
    BapCorrectionNotice,
    type BapCorrectionRequest,
} from '@/components/bap/bap-correction-notice';
import { BapForm } from '@/components/bap/bap-form';
import Heading from '@/components/heading';
import { index } from '@/routes/baps';

type CancellationReason = { value: string; label: string };

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

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <Heading
                    title={`Ubah draft ${bap.document_number}`}
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
            </main>
        </>
    );
}

EditBap.layout = {
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: 'Detail BAP', href: index() },
        { title: 'Ubah draft', href: index() },
    ],
};
