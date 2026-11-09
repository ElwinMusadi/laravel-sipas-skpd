import { Form, Head, Link } from '@inertiajs/react';
import { ClipboardCheck, Eye, Play } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { PageHeader } from '@/components/app/page-header';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import { formatWaitingDuration } from '@/components/bap-verification/format';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as phaseOneRoutes from '@/routes/bap-verifications';
import * as phaseTwoRoutes from '@/routes/bap-verifications-phase-2';

type QueueBap = {
    id: number;
    document_number: string;
    service_date: string;
    loket: string;
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    status: Extract<
        BapStatus,
        | 'submitted'
        | 'under_verification'
        | 'waiting_reverification_phase_1'
        | 'waiting_verification_phase_2'
        | 'under_verification_phase_2'
        | 'waiting_reverification_phase_2'
    >;
    created_by: string;
    submitted_at: string | null;
    verification: { verifier: string; started_at: string } | null;
    phase_one_verification: {
        verifier: string;
        result: 'passed' | 'discrepancy' | null;
        completed_at: string | null;
    } | null;
};

type VerificationStage = {
    value: 'phase_1' | 'phase_2';
    label: string;
    verifier_label: string;
    is_phase_two: boolean;
};

type Props = {
    baps: Paginator & { data: QueueBap[] };
    verification_stage: VerificationStage;
};

function stageRoutes(stage: VerificationStage) {
    return stage.is_phase_two ? phaseTwoRoutes : phaseOneRoutes;
}

function startableStatuses(stage: VerificationStage): QueueBap['status'][] {
    return stage.is_phase_two
        ? ['waiting_verification_phase_2', 'waiting_reverification_phase_2']
        : ['submitted', 'waiting_reverification_phase_1'];
}

function queueColumns(stage: VerificationStage): DataTableColumn<QueueBap>[] {
    const columns: DataTableColumn<QueueBap>[] = [
        {
            id: 'document_number',
            header: 'Nomor BAP',
            cell: (bap) => bap.document_number,
            className: 'font-medium whitespace-nowrap',
            mobile: 'title',
        },
        {
            id: 'service_date',
            header: 'Tanggal pelayanan',
            cell: (bap) => formatDate(bap.service_date),
            className: 'whitespace-nowrap',
            mobile: 'subtitle',
        },
        {
            id: 'loket',
            header: 'Loket',
            cell: (bap) => (
                <>
                    <span className="block">{bap.loket}</span>
                    <span className="text-muted-foreground block text-xs">
                        oleh {bap.created_by}
                    </span>
                </>
            ),
        },
        {
            id: 'numerator',
            header: 'Nomerator',
            cell: (bap) => formatRange(bap.numerator_start, bap.numerator_end),
            mono: true,
        },
        {
            id: 'total',
            header: 'Total',
            cell: (bap) => formatQuantity(bap.total_usage),
            numeric: true,
        },
        {
            id: 'online',
            header: 'Online',
            cell: (bap) => formatQuantity(bap.online_usage_count),
            numeric: true,
        },
        {
            id: 'status',
            header: 'Status',
            cell: (bap) => <BapStatusBadge status={bap.status} />,
            className: 'min-w-40',
            mobile: 'badge',
        },
        {
            id: 'verifier',
            header: 'Pemeriksa',
            cell: (bap) =>
                bap.verification ? (
                    <>
                        <span className="block">
                            {bap.verification.verifier}
                        </span>
                        <span className="text-muted-foreground block text-xs whitespace-nowrap">
                            Mulai {formatDateTime(bap.verification.started_at)}
                        </span>
                    </>
                ) : (
                    <span className="text-muted-foreground">Belum dimulai</span>
                ),
        },
    ];

    if (stage.is_phase_two) {
        columns.push({
            id: 'phase_one',
            header: 'Lulus Tahap 1',
            cell: (bap) =>
                bap.phase_one_verification?.completed_at ? (
                    <>
                        <span className="block whitespace-nowrap">
                            {formatDateTime(
                                bap.phase_one_verification.completed_at,
                            )}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                            Menunggu{' '}
                            {formatWaitingDuration(
                                bap.phase_one_verification.completed_at,
                            )}
                        </span>
                    </>
                ) : (
                    '—'
                ),
        });
    } else {
        columns.push({
            id: 'submitted_at',
            header: 'Diajukan',
            cell: (bap) =>
                bap.submitted_at ? formatDateTime(bap.submitted_at) : '—',
            className: 'text-muted-foreground whitespace-nowrap',
        });
    }

    return columns;
}

export default function BapVerificationIndex({
    baps,
    verification_stage: stage,
}: Props) {
    const routes = stageRoutes(stage);
    const startStatuses = startableStatuses(stage);

    return (
        <>
            <Head title={`Antrean ${stage.label}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={`Antrean ${stage.label}`}
                    badges={
                        <Badge variant="outline">
                            <ClipboardCheck data-icon="inline-start" />
                            {stage.verifier_label}
                        </Badge>
                    }
                    description={`Periksa data BAP dan dokumen fisik sebelum mencatat hasil ${stage.label}. BAP terlama tampil paling atas.`}
                />

                <Card>
                    <CardContent>
                        <DataTable
                            rows={baps.data}
                            columns={queueColumns(stage)}
                            getRowKey={(bap) => bap.id}
                            rowHref={(bap) => routes.show(bap.id)}
                            minWidthClassName="min-w-232"
                            caption={`Antrean ${stage.label}`}
                            actions={(bap) => (
                                <>
                                    {startStatuses.includes(bap.status) ? (
                                        <Form action={routes.start(bap.id)}>
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    disabled={processing}
                                                    aria-label={`Mulai ${stage.label} BAP ${bap.document_number}`}
                                                    title={`Mulai ${stage.label}`}
                                                >
                                                    <Play data-icon="inline-start" />
                                                    {processing
                                                        ? 'Memulai...'
                                                        : bap.status.startsWith(
                                                                'waiting_reverification',
                                                            )
                                                          ? 'Mulai Ulang'
                                                          : 'Mulai'}
                                                </Button>
                                            )}
                                        </Form>
                                    ) : null}
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link
                                            href={routes.show(bap.id)}
                                            aria-label={`Lihat ${stage.label} BAP ${bap.document_number}`}
                                            title="Lihat detail"
                                        >
                                            <Eye />
                                        </Link>
                                    </Button>
                                </>
                            )}
                            empty={
                                <EmptyState
                                    icon={ClipboardCheck}
                                    title={`Tidak ada BAP pada antrean ${stage.label}.`}
                                    description={
                                        stage.is_phase_two
                                            ? 'BAP yang lulus Verifikasi Tahap 1 akan muncul di sini.'
                                            : 'BAP yang telah diajukan oleh Loket akan muncul di sini.'
                                    }
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={baps} noun="BAP" />
            </div>
        </>
    );
}

BapVerificationIndex.layout = (props: Props) => ({
    breadcrumbs: [
        {
            title: `Antrean ${props.verification_stage.label}`,
            href: stageRoutes(props.verification_stage).index(),
        },
    ],
});
