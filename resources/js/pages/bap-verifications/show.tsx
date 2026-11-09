import { Form, Head, usePage } from '@inertiajs/react';
import { AlertCircle, Play } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { BapStatusBadge } from '@/components/bap/bap-status-badge';
import { BapVerificationTakeOverDialog } from '@/components/bap/bap-verification-take-over-dialog';
import { BapOverview } from '@/components/bap-verification/bap-overview';
import type {
    ChecklistDefinition,
    Verification,
    VerificationBap,
    VerificationStage,
} from '@/components/bap-verification/types';
import { VerificationChecklistForm } from '@/components/bap-verification/verification-checklist-form';
import { VerificationResultCard } from '@/components/bap-verification/verification-result-card';
import FormErrorSummary from '@/components/form-error-summary';
import { formatDate } from '@/components/inventory/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import * as phaseOneRoutes from '@/routes/bap-verifications';
import * as phaseTwoRoutes from '@/routes/bap-verifications-phase-2';

type Props = {
    bap: VerificationBap;
    verification: Verification | null;
    phase_one_verification: Verification | null;
    checklist: ChecklistDefinition[];
    can: { start: boolean; complete: boolean; take_over: boolean };
    verification_stage: VerificationStage;
};

function stageRoutes(stage: VerificationStage) {
    return stage.is_phase_two ? phaseTwoRoutes : phaseOneRoutes;
}

export default function ShowBapVerification({
    bap,
    verification,
    phase_one_verification: phaseOneVerification,
    checklist,
    can,
    verification_stage: stage,
}: Props) {
    const routes = stageRoutes(stage);
    const { errors: pageErrors } = usePage().props;

    return (
        <>
            <Head title={`${stage.label} ${bap.document_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={`${stage.label} ${bap.document_number}`}
                    back={{
                        href: routes.index(),
                        label: `Kembali ke antrean ${stage.label}`,
                    }}
                    badges={<BapStatusBadge status={bap.status} />}
                    description={`${bap.loket} · ${formatDate(bap.service_date)}`}
                    actions={
                        can.start ? (
                            <Form action={routes.start(bap.id)}>
                                {({ processing }) => (
                                    <Button type="submit" disabled={processing}>
                                        <Play data-icon="inline-start" />
                                        {processing
                                            ? 'Memulai...'
                                            : `Mulai ${stage.label}`}
                                    </Button>
                                )}
                            </Form>
                        ) : null
                    }
                />

                {can.complete ? null : (
                    <FormErrorSummary
                        errors={pageErrors}
                        title={`${stage.label} tidak dapat diproses.`}
                    />
                )}

                {can.take_over && verification ? (
                    <BapVerificationTakeOverDialog
                        action={routes.takeOver(bap.id)}
                        stageLabel={stage.label}
                        verifierName={verification.verifier}
                        startedAt={verification.started_at}
                    />
                ) : null}

                <BapOverview
                    bap={bap}
                    verification={verification}
                    stage={stage}
                />

                {stage.is_phase_two ? (
                    <section className="grid gap-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Hasil Verifikasi Tahap 1
                        </h2>
                        {phaseOneVerification ? (
                            <VerificationResultCard
                                verification={phaseOneVerification}
                                stageLabel="Verifikasi Tahap 1"
                                isPhaseTwo={false}
                            />
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle />
                                <AlertTitle>
                                    Hasil Verifikasi Tahap 1 tidak ditemukan.
                                </AlertTitle>
                                <AlertDescription>
                                    BAP ini tidak dapat diselesaikan pada
                                    Verifikasi Tahap 2.
                                </AlertDescription>
                            </Alert>
                        )}
                    </section>
                ) : null}

                {verification?.status === 'completed' ? (
                    <VerificationResultCard
                        verification={verification}
                        stageLabel={stage.label}
                        isPhaseTwo={stage.is_phase_two}
                    />
                ) : null}

                {can.complete ? (
                    <VerificationChecklistForm
                        checklist={checklist}
                        stage={stage}
                        completeUrl={routes.complete(bap.id).url}
                    />
                ) : null}
            </div>
        </>
    );
}

ShowBapVerification.layout = (props: Props) => {
    const routes = stageRoutes(props.verification_stage);

    return {
        breadcrumbs: [
            {
                title: `Antrean ${props.verification_stage.label}`,
                href: routes.index(),
            },
            {
                title: props.bap.document_number,
                href: routes.show(props.bap.id),
            },
        ],
    };
};
