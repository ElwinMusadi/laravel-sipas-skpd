import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import type {
    Verification,
    VerificationBap,
    VerificationStage,
} from '@/components/bap-verification/types';
import { VerificationResultBadge } from '@/components/bap-verification/verification-result-badge';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Segment = VerificationBap['segments'][number];
type Cancellation = VerificationBap['cancellations'][number];

const segmentColumns: DataTableColumn<Segment>[] = [
    {
        id: 'box',
        header: 'Box',
        cell: (segment) => segment.box_number,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'allocation',
        header: 'Alokasi',
        cell: (segment) => `#${segment.allocation_id}`,
        className: 'tabular-nums',
        mobile: 'subtitle',
    },
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (segment) =>
            formatRange(segment.numerator_start, segment.numerator_end),
        mono: true,
    },
    {
        id: 'quantity',
        header: 'Jumlah (set)',
        cell: (segment) => formatQuantity(segment.quantity),
        numeric: true,
    },
];

const cancellationColumns: DataTableColumn<Cancellation>[] = [
    {
        id: 'numerator',
        header: 'Nomerator',
        cell: (cancellation) => formatNomerator(cancellation.numerator),
        mono: true,
        mobile: 'title',
    },
    {
        id: 'reason',
        header: 'Alasan',
        cell: (cancellation) => cancellation.reason_label,
        mobile: 'subtitle',
    },
    {
        id: 'description',
        header: 'Keterangan',
        cell: (cancellation) => cancellation.description ?? '—',
        className: 'text-muted-foreground whitespace-normal',
    },
];

/**
 * The system values the verifier compares the physical forms against.
 */
export function BapOverview({
    bap,
    verification,
    stage,
}: {
    bap: VerificationBap;
    verification: Verification | null;
    stage: VerificationStage;
}) {
    return (
        <>
            <section className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Data BAP</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DetailList>
                            <DetailRow label="Loket" value={bap.loket} />
                            <DetailRow
                                label="Tanggal pelayanan"
                                value={formatDate(bap.service_date)}
                            />
                            <DetailRow
                                label="Dibuat oleh"
                                value={bap.created_by}
                            />
                            <DetailRow
                                label="Diajukan pada"
                                value={
                                    bap.submitted_at
                                        ? formatDateTime(bap.submitted_at)
                                        : 'Belum diajukan'
                                }
                            />
                        </DetailList>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Nomerator dan pemakaian</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DetailList>
                            <DetailRow
                                label="Nomerator"
                                value={formatRange(
                                    bap.numerator_start,
                                    bap.numerator_end,
                                )}
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
                            <DetailRow
                                label="Batal/rusak"
                                value={formatQuantity(bap.cancellations.length)}
                                numeric
                            />
                        </DetailList>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Status {stage.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {verification ? (
                            <DetailList>
                                <DetailRow
                                    label="Pemeriksa"
                                    value={verification.verifier}
                                />
                                <DetailRow
                                    label="Dimulai"
                                    value={formatDateTime(
                                        verification.started_at,
                                    )}
                                />
                                <DetailRow
                                    label="Hasil"
                                    value={
                                        <VerificationResultBadge
                                            result={verification.result}
                                        />
                                    }
                                />
                            </DetailList>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Pemeriksaan fisik belum dimulai.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Rincian pemakaian per Box</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={bap.segments}
                            columns={segmentColumns}
                            getRowKey={(segment) => segment.id}
                            breakpoint="md"
                            caption="Rincian pemakaian per Box"
                            empty={
                                <p className="text-muted-foreground text-sm">
                                    Belum ada rincian pemakaian.
                                </p>
                            }
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Batal / Rusak</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            rows={bap.cancellations}
                            columns={cancellationColumns}
                            getRowKey={(cancellation) => cancellation.id}
                            breakpoint="md"
                            caption="Nomerator batal atau rusak"
                            empty={
                                <p className="text-muted-foreground text-sm">
                                    Tidak ada Nomerator batal/rusak pada BAP
                                    ini.
                                </p>
                            }
                        />
                    </CardContent>
                </Card>
            </section>
        </>
    );
}
