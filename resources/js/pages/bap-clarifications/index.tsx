import { Form, Head, Link } from '@inertiajs/react';
import { Eye, MessageSquareMore } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { ListFooter, type Paginator } from '@/components/app/list-footer';
import { PageHeader } from '@/components/app/page-header';
import {
    ClarificationStatusBadge,
    type ClarificationStatus,
} from '@/components/bap-clarification/clarification-status';
import { formatWaitingDuration } from '@/components/bap-verification/format';
import {
    formatDate,
    formatDateTime,
    formatQuantity,
} from '@/components/inventory/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { index, open, show } from '@/routes/bap-clarifications';

type Clarification = {
    id: number;
    bap_id: number;
    bap_document_number: string;
    service_date: string;
    loket: string;
    stage: 'phase_1' | 'phase_2';
    stage_label: string;
    status: ClarificationStatus;
    status_label: string;
    requested_by: string;
    requested_at: string;
    waiting_since: string;
    discrepancy_count: number;
    summary: string;
};

type Props = {
    clarifications: Paginator & { data: Clarification[] };
    queue: {
        title: string;
        description: string;
        opens_for_loket: boolean;
    };
};

const columns: DataTableColumn<Clarification>[] = [
    {
        id: 'bap',
        header: 'Nomor BAP',
        cell: (clarification) => clarification.bap_document_number,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'service',
        header: 'Tanggal · Loket',
        cell: (clarification) => (
            <>
                <span className="block whitespace-nowrap">
                    {formatDate(clarification.service_date)}
                </span>
                <span className="text-muted-foreground block text-xs">
                    {clarification.loket}
                </span>
            </>
        ),
        mobile: 'subtitle',
    },
    {
        id: 'stage',
        header: 'Tahap',
        cell: (clarification) => clarification.stage_label,
        className: 'whitespace-nowrap',
    },
    {
        id: 'discrepancy',
        header: 'Selisih',
        cell: (clarification) => (
            <>
                <span className="line-clamp-2 block">
                    {clarification.summary}
                </span>
                <span className="text-muted-foreground block text-xs">
                    {formatQuantity(clarification.discrepancy_count)} temuan
                </span>
            </>
        ),
        className: 'max-w-xs whitespace-normal',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (clarification) => (
            <ClarificationStatusBadge
                status={clarification.status}
                fallbackLabel={clarification.status_label}
            />
        ),
        mobile: 'badge',
    },
    {
        id: 'requested',
        header: 'Diminta',
        cell: (clarification) => (
            <>
                <span className="block">{clarification.requested_by}</span>
                <span className="text-muted-foreground block text-xs whitespace-nowrap">
                    {formatDateTime(clarification.requested_at)}
                </span>
            </>
        ),
    },
    {
        id: 'waiting',
        header: 'Menunggu',
        cell: (clarification) =>
            formatWaitingDuration(clarification.waiting_since),
        className: 'text-muted-foreground whitespace-nowrap',
    },
];

export default function BapClarificationIndex({
    clarifications,
    queue,
}: Props) {
    return (
        <>
            <Head title={queue.title} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={queue.title}
                    badges={
                        <Badge variant="outline">
                            <MessageSquareMore data-icon="inline-start" />
                            Antrean klarifikasi
                        </Badge>
                    }
                    description={queue.description}
                />

                <Card>
                    <CardContent>
                        <DataTable
                            rows={clarifications.data}
                            columns={columns}
                            getRowKey={(clarification) => clarification.id}
                            rowHref={
                                queue.opens_for_loket
                                    ? undefined
                                    : (clarification) => show(clarification.id)
                            }
                            minWidthClassName="min-w-232"
                            caption={queue.title}
                            actions={(clarification) =>
                                queue.opens_for_loket ? (
                                    <Form action={open(clarification.id)}>
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                size="sm"
                                                disabled={processing}
                                                aria-label={`Buka klarifikasi BAP ${clarification.bap_document_number}`}
                                                title="Buka dan tanggapi klarifikasi"
                                            >
                                                <MessageSquareMore data-icon="inline-start" />
                                                {processing
                                                    ? 'Membuka...'
                                                    : 'Buka'}
                                            </Button>
                                        )}
                                    </Form>
                                ) : (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={show(clarification.id)}
                                            aria-label={`Tinjau klarifikasi BAP ${clarification.bap_document_number}`}
                                            title="Tinjau klarifikasi"
                                        >
                                            <Eye data-icon="inline-start" />
                                            Tinjau
                                        </Link>
                                    </Button>
                                )
                            }
                            empty={
                                <EmptyState
                                    icon={MessageSquareMore}
                                    title="Tidak ada klarifikasi yang perlu ditindaklanjuti."
                                    description="Antrean akan diperbarui ketika ada tindakan yang menjadi tanggung jawab Anda."
                                />
                            }
                        />
                    </CardContent>
                </Card>

                <ListFooter paginator={clarifications} noun="klarifikasi" />
            </div>
        </>
    );
}

BapClarificationIndex.layout = {
    breadcrumbs: [{ title: 'Klarifikasi', href: index() }],
};
