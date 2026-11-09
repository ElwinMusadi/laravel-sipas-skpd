import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus, UserRoundPen } from 'lucide-react';
import Heading from '@/components/heading';
import { formatDate } from '@/components/inventory/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { create, edit, index } from '@/routes/document-officials';

type OfficialEntry = {
    id: number;
    name: string;
    nip: string | null;
    rank: string | null;
    position: string;
    effective_from: string;
    state: 'current' | 'upcoming' | 'past';
    created_by: string;
};

type Props = {
    roles: {
        value: string;
        label: string;
        entries: OfficialEntry[];
    }[];
};

const statePresentation: Record<
    OfficialEntry['state'],
    { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
    current: { label: 'Berlaku', variant: 'default' },
    upcoming: { label: 'Akan berlaku', variant: 'secondary' },
    past: { label: 'Riwayat', variant: 'outline' },
};

export default function DocumentOfficialIndex({ roles }: Props) {
    return (
        <>
            <Head title="Pejabat Penandatangan" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <Heading
                        title="Pejabat Penandatangan"
                        description="Pejabat yang tercetak pada PDF BAP SKPD. Setiap BAP memakai pejabat yang berlaku pada tanggal pelayanannya."
                    />
                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Tambah pejabat
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    {roles.map((role) => {
                        const current = role.entries.find(
                            (entry) => entry.state === 'current',
                        );

                        return (
                            <Card key={role.value}>
                                <CardHeader className="flex-row items-start justify-between gap-4">
                                    <div className="grid gap-1">
                                        <CardTitle>{role.label}</CardTitle>
                                        <CardDescription>
                                            {current
                                                ? `${current.name} · ${current.position}`
                                                : 'Belum ada pejabat yang berlaku.'}
                                        </CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={create({
                                                query: { role: role.value },
                                            })}
                                        >
                                            <UserRoundPen />
                                            Ganti pejabat
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table className="min-w-120">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Mulai berlaku
                                                </TableHead>
                                                <TableHead>Pejabat</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
                                                    <span className="sr-only">
                                                        Aksi
                                                    </span>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {role.entries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        {formatDate(
                                                            entry.effective_from,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium">
                                                            {entry.name}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {[
                                                                entry.nip
                                                                    ? `NIP ${entry.nip}`
                                                                    : null,
                                                                entry.rank,
                                                                entry.position,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                statePresentation[
                                                                    entry.state
                                                                ].variant
                                                            }
                                                        >
                                                            {
                                                                statePresentation[
                                                                    entry.state
                                                                ].label
                                                            }
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={edit(
                                                                    entry.id,
                                                                )}
                                                                aria-label={`Ubah ${entry.name}`}
                                                            >
                                                                <Pencil />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </main>
        </>
    );
}

DocumentOfficialIndex.layout = {
    breadcrumbs: [{ title: 'Pejabat Penandatangan', href: index() }],
};
