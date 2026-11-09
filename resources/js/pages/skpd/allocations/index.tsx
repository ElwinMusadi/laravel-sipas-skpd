import { Head, Link, router } from "@inertiajs/react";
import { Eye, Plus, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AllocationStatusBadge } from "@/components/allocation/allocation-status-badge";
import { EmptyState } from "@/components/app/empty-state";
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Pagination } from "@/components/inventory/pagination";
import type { PaginationLink } from "@/components/inventory/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { create, index, show } from "@/routes/skpd/allocations";

type AllocationStatus = "pending" | "accepted" | "completed" | "cancelled" | "returned";

type Allocation = {
  id: number;
  box: { id: number; box_number: string };
  loket: { id: number; name: string };
  allocation_date: string | null;
  numerator_start: number;
  numerator_end: number;
  quantity: number;
  used_quantity: number;
  remaining_quantity: number;
  status: AllocationStatus;
  created_by: string;
  created_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  can: { accept: boolean; cancel: boolean };
};

type Props = {
  allocations: {
    data: Allocation[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  filters: { search?: string; status?: AllocationStatus };
  can: { create: boolean };
};

export default function AllocationIndex({ allocations, filters, can }: Props) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? "");

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    router.get(
      index.url(),
      { search: search || undefined, status: status || undefined },
      { preserveState: true, replace: true },
    );
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    router.get(index.url(), {}, { preserveState: true, replace: true });
  };

  return (
    <>
      <Head title="Distribusi / Alokasi" />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Distribusi / Alokasi SKPD
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Pantau reservation, handover, dan persediaan administratif Loket.
            </p>
          </div>
          {can.create ? (
            <Button asChild>
              <Link href={create()}>
                <Plus />
                Buat alokasi
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent>
            <form
              onSubmit={applyFilters}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto]"
            >
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari nomor Box atau Loket"
                />
              </div>
              <Select
                value={status || "all"}
                onValueChange={(val) => setStatus(val === "all" ? "" : val)}
              >
                <SelectTrigger aria-label="Filter status alokasi">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="pending">Menunggu handover</SelectItem>
                  <SelectItem value="accepted">Diterima</SelectItem>
                  <SelectItem value="completed">Selesai digunakan</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  <SelectItem value="returned">
                    Dikembalikan ke pusat
                  </SelectItem>
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
            {allocations.data.length === 0 ? (
              <EmptyState
                title="Belum ada distribusi SKPD."
                description="Alokasi yang dibuat Bendahara Barang akan tampil pada daftar ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-7xl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Box</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Tanggal alokasi</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      {/* <TableHead>Dibuat</TableHead> */}
                      <TableHead>Handover</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.data.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          {allocation.box.box_number}
                        </TableCell>
                        <TableCell>{allocation.loket.name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {allocation.allocation_date
                            ? formatDate(allocation.allocation_date)
                            : "Belum tercatat"}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {formatRange(
                            allocation.numerator_start,
                            allocation.numerator_end,
                          )}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(allocation.quantity)}
                          <p className="text-muted-foreground text-xs">
                            Sisa {formatQuantity(allocation.remaining_quantity)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <AllocationStatusBadge status={allocation.status} />
                        </TableCell>
                        {/* <TableCell className="whitespace-nowrap">
                          {formatDateTime(allocation.created_at)}
                        </TableCell> */}
                        <TableCell>
                          {allocation.accepted_at ? (
                            <>
                              {allocation.accepted_by ?? "—"}
                              <p className="text-muted-foreground text-xs">
                                {formatDateTime(allocation.accepted_at)}
                              </p>
                            </>
                          ) : (
                            "Belum diterima"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={show(allocation.id)}
                              aria-label={`Detail alokasi ${allocation.id}`}
                            >
                              <Eye />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
          <p className="text-muted-foreground">
            Menampilkan {allocations.from ?? 0}–{allocations.to ?? 0} dari{" "}
            {allocations.total} alokasi
          </p>
          <Pagination links={allocations.links} />
        </div>
      </main>
    </>
  );
}

AllocationIndex.layout = {
  breadcrumbs: [{ title: "Distribusi / Alokasi", href: index() }],
};
