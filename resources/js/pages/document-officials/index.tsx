import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus, UserRoundPen, UserRoundX } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge, type StatusMeta } from '@/components/app/status-badge';
import { formatDate } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { create, edit, index } from '@/routes/document-officials';

type OfficialState = 'current' | 'upcoming' | 'past';

type OfficialEntry = {
    id: number;
    name: string;
    nip: string | null;
    rank: string | null;
    position: string;
    effective_from: string;
    state: OfficialState;
    created_by: string;
};

type Props = {
    roles: {
        value: string;
        label: string;
        entries: OfficialEntry[];
    }[];
};

const officialStateMeta: Record<OfficialState, StatusMeta> = {
    current: { label: 'Berlaku', tone: 'success' },
    upcoming: { label: 'Akan berlaku', tone: 'info' },
    past: { label: 'Riwayat', tone: 'neutral' },
};

const columns: DataTableColumn<OfficialEntry>[] = [
    {
        id: 'name',
        header: 'Pejabat',
        cell: (entry) => entry.name,
        className: 'font-medium',
        mobile: 'title',
    },
    {
        id: 'details',
        header: 'NIP · Pangkat · Jabatan',
        cell: (entry) =>
            [entry.nip ? `NIP ${entry.nip}` : null, entry.rank, entry.position]
                .filter(Boolean)
                .join(' · '),
        className: 'text-muted-foreground',
        mobile: 'subtitle',
    },
    {
        id: 'state',
        status: true,
        header: 'Status',
        cell: (entry) => <StatusBadge {...officialStateMeta[entry.state]} />,
        mobile: 'badge',
    },
    {
        id: 'effective_from',
        header: 'Mulai berlaku',
        cell: (entry) => formatDate(entry.effective_from),
        className: 'whitespace-nowrap',
    },
];

export default function DocumentOfficialIndex({ roles }: Props) {
    return (
        <>
            <Head title="Pejabat Penandatangan" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="Pejabat Penandatangan"
                    description="Pejabat yang tercetak pada PDF BAP SKPD. Setiap BAP memakai pejabat yang berlaku pada tanggal pelayanannya."
                    actions={
                        <Button asChild>
                            <Link href={create()}>
                                <Plus />
                                Tambah pejabat
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 xl:grid-cols-2">
                    {roles.map((role) => {
                        const current = role.entries.find(
                            (entry) => entry.state === 'current',
                        );
                        const replaceHref = create({
                            query: { role: role.value },
                        });

                        return (
                            <Card key={role.value}>
                                <CardHeader>
                                    <CardTitle>{role.label}</CardTitle>
                                    <CardDescription>
                                        {current
                                            ? `${current.name} · ${current.position}`
                                            : 'Belum ada pejabat yang berlaku.'}
                                    </CardDescription>
                                    <CardAction>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={replaceHref}
                                                aria-label={`Ganti pejabat ${role.label}`}
                                            >
                                                <UserRoundPen />
                                                Ganti pejabat
                                            </Link>
                                        </Button>
                                    </CardAction>
                                </CardHeader>
                                <CardContent>
                                    <DataTable
                                        rows={role.entries}
                                        columns={columns}
                                        getRowKey={(entry) => entry.id}
                                        breakpoint="md"
                                        caption={`Riwayat pejabat ${role.label}`}
                                        actions={(entry) => (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                            >
                                                <Link
                                                    href={edit(entry.id)}
                                                    aria-label={`Ubah ${entry.name}`}
                                                    title="Ubah data pejabat"
                                                >
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                        )}
                                        empty={
                                            <EmptyState
                                                icon={UserRoundX}
                                                title="Belum ada pejabat untuk peran ini."
                                                description="PDF BAP memerlukan pejabat yang berlaku pada tanggal pelayanannya."
                                                action={
                                                    <Button asChild>
                                                        <Link
                                                            href={replaceHref}
                                                        >
                                                            <Plus />
                                                            Tambah pejabat
                                                        </Link>
                                                    </Button>
                                                }
                                            />
                                        }
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

DocumentOfficialIndex.layout = {
    breadcrumbs: [{ title: 'Pejabat Penandatangan', href: index() }],
};
