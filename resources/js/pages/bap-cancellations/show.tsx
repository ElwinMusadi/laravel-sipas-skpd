import { Head, Link } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index, show } from '@/routes/bap-cancellations';
import { show as showBap } from '@/routes/baps';

type Props = {
    cancellation: {
        id: number;
        numerator: number;
        reason: string;
        reason_label: string;
        description: string | null;
        created_by: string;
        created_at: string;
        bap: {
            id: number;
            document_number: string;
            service_date: string;
            loket: { id: number; name: string };
            numerator_start: number;
            numerator_end: number;
            total_usage: number;
            cancellation_quantity: number;
            normal_usage_quantity: number;
            status: BapStatus;
            created_by: string;
        };
    };
};

export default function ShowBapCancellation({ cancellation }: Props) {
    const numerator = formatNomerator(cancellation.numerator);
    const bap = cancellation.bap;

    return (
        <>
            <Head title={`Batal/Rusak ${numerator}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: index(),
                        label: 'Kembali ke riwayat Batal/Rusak',
                    }}
                    title={`Batal/Rusak ${numerator}`}
                    badges={
                        <StatusBadge
                            label={cancellation.reason_label}
                            tone="neutral"
                        />
                    }
                    description={`Tercatat pada ${bap.document_number} · ${bap.loket.name} · ${formatDate(bap.service_date)}`}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={showBap(bap.id)}>
                                <FileText data-icon="inline-start" />
                                Lihat BAP SKPD
                            </Link>
                        </Button>
                    }
                />

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomerator"
                                    value={numerator}
                                    mono
                                />
                                <DetailRow
                                    label="Klasifikasi"
                                    value={cancellation.reason_label}
                                />
                                <DetailRow
                                    label="Dicatat oleh"
                                    value={cancellation.created_by}
                                />
                                <DetailRow
                                    label="Dicatat pada"
                                    value={formatDateTime(
                                        cancellation.created_at,
                                    )}
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Keterangan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm break-words whitespace-pre-wrap">
                                {cancellation.description ??
                                    'Tidak ada keterangan tambahan.'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>BAP terkait</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DetailList>
                                <DetailRow
                                    label="Nomor BAP"
                                    value={
                                        <Link
                                            href={showBap(bap.id)}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {bap.document_number}
                                        </Link>
                                    }
                                />
                                <DetailRow
                                    label="Loket"
                                    value={bap.loket.name}
                                />
                                <DetailRow
                                    label="Tanggal pelayanan"
                                    value={formatDate(bap.service_date)}
                                />
                                <DetailRow
                                    label="Status"
                                    value={
                                        <BapStatusBadge status={bap.status} />
                                    }
                                />
                            </DetailList>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Ringkasan pemakaian BAP</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryValue
                            label="Range Nomerator"
                            value={formatRange(
                                bap.numerator_start,
                                bap.numerator_end,
                            )}
                            mono
                        />
                        <SummaryValue
                            label="Total pemakaian"
                            value={`${formatQuantity(bap.total_usage)} set`}
                        />
                        <SummaryValue
                            label="Batal/Rusak"
                            value={`${formatQuantity(bap.cancellation_quantity)} set`}
                        />
                        <SummaryValue
                            label="Pemakaian normal (termasuk online)"
                            value={`${formatQuantity(bap.normal_usage_quantity)} set`}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function SummaryValue({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="bg-muted rounded-xl p-4">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p
                className={`mt-1 font-semibold tabular-nums ${mono ? 'font-mono text-sm' : ''}`}
            >
                {value}
            </p>
        </div>
    );
}

ShowBapCancellation.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Riwayat Batal/Rusak', href: index() },
        {
            title: `${formatNomerator(props.cancellation.numerator)} · ${props.cancellation.bap.document_number}`,
            href: show(props.cancellation.id),
        },
    ],
});
