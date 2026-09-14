import { Link, Head, router } from '@inertiajs/react';
import { Eye, MoreHorizontal, Pencil, Plus, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
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
import { create, edit, index, show } from '@/routes/users';
import type {
    LoketOption,
    RoleOption,
} from '@/components/users/user-form-fields';

type ManagedUserRow = {
    id: number;
    username: string;
    name: string;
    nip: string;
    role: string;
    role_label: string;
    loket: LoketOption | null;
    is_active: boolean;
    last_login_at: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    users: {
        data: ManagedUserRow[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: {
        search?: string;
        role?: string;
        status?: 'active' | 'inactive';
        loket?: number;
    };
    roles: RoleOption[];
    lokets: LoketOption[];
};

export default function UserIndex({ users, filters, roles, lokets }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [loket, setLoket] = useState(
        filters.loket ? String(filters.loket) : '',
    );

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            index.url(),
            {
                search: search || undefined,
                role: role || undefined,
                status: status || undefined,
                loket: loket || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        setRole('');
        setStatus('');
        setLoket('');
        router.get(index.url(), {}, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Pengguna" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Manajemen Pengguna
                        </h1>
                        <p className="text-muted-foreground max-w-2xl text-sm">
                            Kelola akun, role sistem, status, dan penugasan
                            loket SIPAS-SKPD.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Tambah pengguna
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardContent>
                        <form
                            onSubmit={applyFilters}
                            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_12rem_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                    placeholder="Cari username, nama, atau NIP"
                                />
                            </div>
                            <Select
                                value={role || 'all'}
                                onValueChange={(val) =>
                                    setRole(val === 'all' ? '' : val)
                                }
                            >
                                <SelectTrigger
                                    className="w-full"
                                    aria-label="Filter role"
                                >
                                    <SelectValue placeholder="Semua role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua role
                                    </SelectItem>
                                    {roles.map((roleOption) => (
                                        <SelectItem
                                            key={roleOption.value}
                                            value={roleOption.value}
                                        >
                                            {roleOption.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={status || 'all'}
                                onValueChange={(val) =>
                                    setStatus(val === 'all' ? '' : val)
                                }
                            >
                                <SelectTrigger
                                    className="w-full"
                                    aria-label="Filter status"
                                >
                                    <SelectValue placeholder="Semua status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Aktif
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Tidak aktif
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={loket || 'all'}
                                onValueChange={(val) =>
                                    setLoket(val === 'all' ? '' : val)
                                }
                            >
                                <SelectTrigger
                                    className="w-full"
                                    aria-label="Filter loket"
                                >
                                    <SelectValue placeholder="Semua loket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua loket
                                    </SelectItem>
                                    {lokets.map((loketOption) => (
                                        <SelectItem
                                            key={loketOption.id.toString()}
                                            value={loketOption.id.toString()}
                                        >
                                            {loketOption.name}
                                        </SelectItem>
                                    ))}
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>NIP</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Loket</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Login terakhir</TableHead>
                                    <TableHead className="text-right">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.username}
                                        </TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell className="font-mono text-xs tabular-nums">
                                            {user.nip}
                                        </TableCell>
                                        <TableCell>{user.role_label}</TableCell>
                                        <TableCell>
                                            {user.loket?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    user.is_active
                                                        ? 'secondary'
                                                        : 'destructive'
                                                }
                                            >
                                                {user.is_active
                                                    ? 'Aktif'
                                                    : 'Tidak aktif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.last_login_at
                                                ? new Intl.DateTimeFormat(
                                                      'id-ID',
                                                      {
                                                          dateStyle: 'medium',
                                                          timeStyle: 'short',
                                                      },
                                                  ).format(
                                                      new Date(
                                                          user.last_login_at,
                                                      ),
                                                  )
                                                : 'Belum pernah'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Aksi untuk ${user.name}`}
                                                    >
                                                        <MoreHorizontal />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={show(user.id)}
                                                        >
                                                            <Eye />
                                                            Detail
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={edit(user.id)}
                                                        >
                                                            <Pencil />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-muted-foreground h-32 text-center"
                                        >
                                            Tidak ada pengguna yang sesuai.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
                    <p className="text-muted-foreground">
                        Menampilkan {users.from ?? 0}–{users.to ?? 0} dari{' '}
                        {users.total} pengguna
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {users.links.map((link, indexLink) => (
                            <Button
                                key={`${link.label}-${indexLink}`}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                asChild={Boolean(link.url)}
                            >
                                {link.url ? (
                                    <Link href={link.url}>
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    </Link>
                                ) : (
                                    <span
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [{ title: 'Pengguna', href: index() }],
};
