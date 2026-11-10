import { Link } from '@inertiajs/react';
import { Eye, FileText } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { BapStatusBadge } from '@/components/bap/bap-status-badge';
import { formatDate, formatDateTime } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { index, show } from '@/routes/baps';
import type { RecentBap } from './dashboard-data';

const columns: DataTableColumn<RecentBap>[] = [
    {
        id: 'document_number',
        header: 'Nomor BAP',
        cell: (item) => item.documentNumber,
        className: 'font-medium whitespace-nowrap',
        mobile: 'title',
    },
    {
        id: 'service_date',
        header: 'Tanggal pelayanan',
        cell: (item) => `${formatDate(item.serviceDate)} · ${item.loket}`,
        className: 'whitespace-nowrap',
        mobile: 'subtitle',
    },
    {
        id: 'status',
        status: true,
        header: 'Status',
        cell: (item) => <BapStatusBadge status={item.status} />,
        mobile: 'badge',
    },
    {
        id: 'submitted_at',
        header: 'Diajukan',
        cell: (item) =>
            item.submittedAt
                ? formatDateTime(item.submittedAt)
                : 'Belum diajukan',
        className: 'text-muted-foreground whitespace-nowrap',
    },
];

export function RecentBaps({ items }: { items: readonly RecentBap[] }) {
    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>BAP Terbaru</CardTitle>
                <CardDescription>
                    Lima BAP terakhir dalam akses Anda.
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={index()}>Lihat semua</Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <DataTable
                    rows={[...items]}
                    columns={columns}
                    getRowKey={(item) => item.id}
                    rowHref={(item) => show(item.id)}
                    breakpoint="md"
                    caption="BAP terbaru"
                    actions={(item) => (
                        <Button variant="ghost" size="icon" asChild>
                            <Link
                                href={show(item.id)}
                                aria-label={`Lihat ${item.documentNumber}`}
                                title="Lihat detail"
                            >
                                <Eye />
                            </Link>
                        </Button>
                    )}
                    empty={
                        <EmptyState
                            icon={FileText}
                            title="Belum ada BAP SKPD."
                            description="BAP yang dibuat dalam akses Anda akan muncul di sini."
                        />
                    }
                />
            </CardContent>
        </Card>
    );
}
