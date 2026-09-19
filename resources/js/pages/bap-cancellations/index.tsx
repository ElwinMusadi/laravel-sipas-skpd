import { Head, Link, router } from '@inertiajs/react';
import { Eye, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import { EmptyState } from '@/components/app/empty-state';
import {
    formatDate,
    formatDateTime,
    formatNomerator,
} from '@/components/inventory/format';
import { Pagination } from '@/components/inventory/pagination';
import type { PaginationLink } from '@/components/inventory/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index, show } from '@/routes/bap-cancellations';

type CancellationReason = 'cancelled' | 'damaged';

type Cancellation = {
    id: number;
    bap_id: number;
    bap_document_number: string;
    service_date: string;
    loket: string;
    numerator: number;
    reason: CancellationReason;
    reason_label: string;
    description: string | null;
    created_by: string;
    bap_status: BapStatus;
    created_at: string;
};

type Props = {
    cancellations: {
        data: Cancellation[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search?: string; reason?: CancellationReason };
};

export default function BapCancellationIndex({
    cancellations,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [reason, setReason] = useState<CancellationReason | ''>(
        filters.reason ?? '',
    );

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            index.url(),
            { search: search || undefined, reason: reason || undefined },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        setReason('');
        router.get(index.url(), {}, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="BAP Batal/Rusak" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="grid gap-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            BAP Batal/Rusak
                        </h1>
                        <p className="text-muted-foreground max-w-2xl text-sm">
                            Riwayat nomerator yang telah dipakai tetapi
                            diklasifikasikan sebagai batal atau rusak.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardContent>
                        <form
                            onSubmit={applyFilters}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                    placeholder="Cari nomerator, BAP, Loket, atau keterangan"
                                />
                            </div>
                            <Select
                                value={reason || 'all'}
                                onValueChange={(value) =>
                                    setReason(
                                        value === 'all'
                                            ? ''
                                            : (value as CancellationReason),
                                    )
                                }
                            >
                                <SelectTrigger
                                    className="w-full"
                                    aria-label="Filter klasifikasi"
                                >
                                    <SelectValue placeholder="Semua klasifikasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua klasifikasi
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            Batal
                                        </SelectItem>
                                        <SelectItem value="damaged">
                                            Rusak
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button type="submit">Terapkan</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={resetFilters}
                                    aria-label="Reset filter"
                                >
                                    <X />
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        {cancellations.data.length === 0 ? (
                            <EmptyState
                                title="Belum ada BAP Batal/Rusak."
                                description="Nomerator yang dicatat dari BAP SKPD akan muncul di sini."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-300">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>BAP</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Loket</TableHead>
                                            <TableHead>Nomerator</TableHead>
                                            <TableHead>Alasan</TableHead>
                                            <TableHead>
                                                Keterangan singkat
                                            </TableHead>
                                            <TableHead>Dibuat oleh</TableHead>
                                            <TableHead>Status BAP</TableHead>
                                            <TableHead>Dibuat pada</TableHead>
                                            <TableHead className="text-right">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cancellations.data.map(
                                            (cancellation) => (
                                                <TableRow key={cancellation.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">
                                                        {
                                                            cancellation.bap_document_number
                                                        }
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        {formatDate(
                                                            cancellation.service_date,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {cancellation.loket}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">
                                                        {formatNomerator(
                                                            cancellation.numerator,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {
                                                                cancellation.reason_label
                                                            }
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs">
                                                        <span className="line-clamp-2">
                                                            {cancellation.description ??
                                                                '—'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            cancellation.created_by
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <BapStatusBadge
                                                            status={
                                                                cancellation.bap_status
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                                        {formatDateTime(
                                                            cancellation.created_at,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={show(
                                                                    cancellation.id,
                                                                )}
                                                                aria-label={`Detail BAP Batal/Rusak ${formatNomerator(cancellation.numerator)}`}
                                                            >
                                                                <Eye />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
                    <p className="text-muted-foreground">
                        Menampilkan {cancellations.from ?? 0}–
                        {cancellations.to ?? 0} dari {cancellations.total}{' '}
                        record
                    </p>
                    <Pagination links={cancellations.links} />
                </div>
            </main>
        </>
    );
}

BapCancellationIndex.layout = {
    breadcrumbs: [{ title: 'BAP Batal/Rusak', href: index() }],
};
