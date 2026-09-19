import { Head } from '@inertiajs/react';
import { BapForm } from '@/components/bap/bap-form';
import Heading from '@/components/heading';
import { create, index } from '@/routes/baps';

type CancellationReason = { value: string; label: string };

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

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <Heading
                    title="Buat BAP SKPD"
                    description="Catat pemakaian aktual setelah pelayanan Loket selesai. Total selalu dihitung dari range nomerator."
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
            </main>
        </>
    );
}

CreateBap.layout = {
    breadcrumbs: [
        { title: 'BAP SKPD', href: index() },
        { title: 'Buat BAP', href: create() },
    ],
};
