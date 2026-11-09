import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/app/page-header';
import type { CancellationReason } from '@/components/bap/bap-cancellation-fields';
import { BapForm } from '@/components/bap/bap-form';
import { create, index } from '@/routes/baps';

type Props = {
    loket: { id: number; name: string } | null;
    lokets: { id: number; name: string }[];
    default_service_date: string;
    expected_numerator_start: number | null;
    allocations: {
        id: number;
        numerator_start: number;
        numerator_end: number;
        remaining_quantity: number;
    }[];
    cancellation_reasons: CancellationReason[];
};

export default function CreateBap({
    loket,
    lokets,
    default_service_date,
    expected_numerator_start,
    allocations,
    cancellation_reasons,
}: Props) {
    return (
        <>
            <Head title="Buat BAP SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke BAP SKPD' }}
                    title="Buat BAP SKPD"
                    description="Catat pemakaian aktual setelah pelayanan Loket selesai. Total selalu dihitung dari range Nomerator."
                />

                <BapForm
                    mode="create"
                    loket={loket}
                    lokets={lokets}
                    defaultServiceDate={default_service_date}
                    expectedNumeratorStart={expected_numerator_start}
                    allocations={allocations}
                    cancellationReasons={cancellation_reasons}
                />
            </div>
        </>
    );
}

CreateBap.layout = {
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: 'Buat BAP', href: create() },
    ],
};
