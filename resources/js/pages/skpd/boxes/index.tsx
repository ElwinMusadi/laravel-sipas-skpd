import { Head, Link, router } from "@inertiajs/react";
import { Eye, Plus, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { BoxStatusBadge } from "@/components/inventory/box-status-badge";
import {
  formatDate,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Pagination } from "@/components/inventory/pagination";
import type {
  BoxStatus,
  LoketOption,
  PaginationLink,
  SkpdBoxSummary,
} from "@/components/inventory/types";
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
import { create, index, show } from "@/routes/skpd/boxes";

type Props = {
  boxes: {
    data: SkpdBoxSummary[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  filters: {
    search?: string;
    status?: BoxStatus;
    loket?: number;
  };
  lokets: LoketOption[];
  can: { create: boolean };
};

export default function BoxIndex({ boxes, filters, lokets, can }: Props) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? "");
  const [loket, setLoket] = useState(
    filters.loket ? String(filters.loket) : "",
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    router.get(
      index.url(),
      {
        search: search || undefined,
        status: status || undefined,
        loket: loket || undefined,
      },
      { preserveState: true, replace: true },
    );
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setLoket("");
    router.get(index.url(), {}, { preserveState: true, replace: true });
  };

  return (
    <>
      <Head title="Box SKPD" />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Box SKPD</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Daftar persediaan pusat dan status ledger setiap range nomerator.
            </p>
          </div>
          {can.create ? (
            <Button asChild>
              <Link href={create()}>
                <Plus />
                Tambah Box
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent>
            <form
              onSubmit={applyFilters}
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto]"
            >
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari nomor Box"
                />
              </div>
              <Select
                value={status || "all"}
                onValueChange={(val) => setStatus(val === "all" ? "" : val)}
              >
                <SelectTrigger aria-label="Filter status Box">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="available">Tersedia</SelectItem>
                  <SelectItem value="partially_allocated">
                    Dialokasikan sebagian
                  </SelectItem>
                  <SelectItem value="fully_allocated">
                    Terdistribusi penuh
                  </SelectItem>
                  <SelectItem value="depleted">Habis digunakan</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={loket || "all"}
                onValueChange={(val) => setLoket(val === "all" ? "" : val)}
              >
                <SelectTrigger aria-label="Filter Loket">
                  <SelectValue placeholder="Semua Loket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Loket</SelectItem>
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
            {boxes.data.length === 0 ? (
              <EmptyState
                title="Belum ada Box SKPD."
                description="Box yang diterima Bendahara Barang akan muncul pada daftar ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Box</TableHead>
                      <TableHead>Range nomerator</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Dialokasikan</TableHead>
                      <TableHead>Tersedia</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diterima</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boxes.data.map((box) => (
                      <TableRow key={box.id}>
                        <TableCell className="font-medium">
                          {box.box_number}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {formatRange(box.numerator_start, box.numerator_end)}
                        </TableCell>
                        <TableCell>{formatQuantity(box.total_sets)}</TableCell>
                        <TableCell>
                          {formatQuantity(box.allocated_quantity)}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(box.available_quantity)}
                        </TableCell>
                        <TableCell>{box.loket?.name ?? "—"}</TableCell>
                        <TableCell>
                          <BoxStatusBadge status={box.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(box.received_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={show(box.id)}
                              aria-label={`Detail ${box.box_number}`}
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
            Menampilkan {boxes.from ?? 0}–{boxes.to ?? 0} dari {boxes.total} Box
          </p>
          <Pagination links={boxes.links} />
        </div>
      </main>
    </>
  );
}

BoxIndex.layout = {
  breadcrumbs: [{ title: "Box SKPD", href: index() }],
};
