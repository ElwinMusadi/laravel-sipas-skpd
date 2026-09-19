import { Head, Link, router } from "@inertiajs/react";
import { Eye, Pencil, Plus, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  BapStatusBadge,
  type BapStatus,
} from "@/components/bap/bap-status-badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { create, edit, index, show } from "@/routes/baps";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bap = {
  id: number;
  document_number: string;
  service_date: string;
  loket: { id: number; name: string };
  numerator_start: number;
  numerator_end: number;
  total_usage: number;
  online_usage_count: number;
  cancellation_count: number;
  status: BapStatus;
  created_by: string;
  submitted_at: string | null;
  can: { edit: boolean; submit: boolean };
};

type Props = {
  baps: {
    data: Bap[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  filters: { search?: string; status?: BapStatus };
  can: { create: boolean };
};

export default function BapIndex({ baps, filters, can }: Props) {
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
      <Head title="Berita Acara Pemakaian Bukti SKPD" />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Berita Acara Pemakaian Bukti SKPD
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Rekap pemakaian Bukti SKPD per Loket dan tanggal pelayanan.
            </p>
          </div>
          {can.create ? (
            <Button asChild>
              <Link href={create()}>
                <Plus />
                Buat BAP
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent>
            <form
              onSubmit={applyFilters}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_17rem_auto]"
            >
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari Loket atau pembuat"
                />
              </div>
              <Select
                value={status || "all"}
                onValueChange={(val) => {
                  // Radix UI Select kadang bermasalah dengan value string kosong (""),
                  // jadi kita gunakan "all" lalu ubah kembali ke "" di sini.
                  const newValue = val === "all" ? "" : val;
                  setStatus(newValue as BapStatus | "");
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Filter status BAP"
                >
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_verification">
                    Sedang diverifikasi Tahap 1
                  </SelectItem>
                  <SelectItem value="needs_clarification">
                    Perlu klarifikasi
                  </SelectItem>
                  <SelectItem value="waiting_reverification_phase_1">
                    Menunggu re-verifikasi Tahap 1
                  </SelectItem>
                  <SelectItem value="waiting_verification_phase_2">
                    Menunggu verifikasi Tahap 2
                  </SelectItem>
                  <SelectItem value="under_verification_phase_2">
                    Sedang diverifikasi Tahap 2
                  </SelectItem>
                  <SelectItem value="waiting_reverification_phase_2">
                    Menunggu re-verifikasi Tahap 2
                  </SelectItem>
                  <SelectItem value="verified_phase_2">
                    Lulus Verifikasi Tahap 2
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
            {baps.data.length === 0 ? (
              <EmptyState
                title="Belum ada BAP SKPD."
                description="BAP yang dibuat untuk Loket dan tanggal pelayanan akan muncul di sini."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-272">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Nomerator</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Online</TableHead>
                      <TableHead>Batal</TableHead>
                      <TableHead className="text-center w-42 min-w-42">
                        Status
                      </TableHead>
                      <TableHead>Dibuat oleh</TableHead>
                      <TableHead>Waktu submit</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baps.data.map((bap) => (
                      <TableRow key={bap.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(bap.service_date)}
                        </TableCell>
                        <TableCell>{bap.loket.name}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {formatRange(bap.numerator_start, bap.numerator_end)}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(bap.total_usage)} set
                        </TableCell>
                        <TableCell>
                          {formatQuantity(bap.online_usage_count)} set
                        </TableCell>
                        <TableCell>
                          {formatQuantity(bap.cancellation_count)} set
                        </TableCell>
                        <TableCell className="w-42 min-w-42 align-center">
                          <BapStatusBadge
                            status={bap.status}
                            className="h-auto w-full whitespace-normal wrap-break-words py-1 leading-tight text-[11px] text-center "
                          />
                        </TableCell>
                        <TableCell>{bap.created_by}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {bap.submitted_at
                            ? formatDateTime(bap.submitted_at)
                            : "Belum diajukan"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {bap.can.edit ? (
                              <Button variant="ghost" size="icon" asChild>
                                <Link
                                  href={edit(bap.id)}
                                  aria-label={`Ubah draft BAP ${bap.document_number}`}
                                >
                                  <Pencil />
                                </Link>
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={show(bap.id)}
                                aria-label={`Detail BAP ${bap.document_number}`}
                              >
                                <Eye />
                              </Link>
                            </Button>
                          </div>
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
            Menampilkan {baps.from ?? 0}–{baps.to ?? 0} dari {baps.total} BAP
          </p>
          <Pagination links={baps.links} />
        </div>
      </main>
    </>
  );
}

BapIndex.layout = {
  breadcrumbs: [{ title: "BAP SKPD", href: index() }],
};
