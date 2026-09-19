import { Head, Link, router } from "@inertiajs/react";
import { Eye, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/app/empty-state";
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Pagination } from "@/components/inventory/pagination";
import type { PaginationLink } from "@/components/inventory/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { index, show } from "@/routes/bap-administrations";

type QueueBap = {
  id: number;
  number: string;
  service_date: string;
  loket: string;
  numerator_start: number;
  numerator_end: number;
  total_usage: number;
  online_usage_count: number;
  cancellation_count: number;
  phase_one: {
    verifier: string;
    attempt: number;
    completed_at: string | null;
  } | null;
  phase_two: {
    verifier: string;
    attempt: number;
    completed_at: string | null;
  } | null;
  administrative_status: "ready" | "completed";
  received_by: string | null;
  received_at: string | null;
};

type Props = {
  baps: {
    data: QueueBap[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  filters: {
    search: string;
    service_date: string | null;
    loket: number | null;
    status: "waiting" | "completed";
  };
  lokets: { id: number; name: string }[];
};

export default function BapAdministrationIndex({
  baps,
  filters,
  lokets,
}: Props) {
  const [search, setSearch] = useState(filters.search);
  const [serviceDate, setServiceDate] = useState(filters.service_date ?? "");
  const [loket, setLoket] = useState(filters.loket?.toString() ?? "all");
  const [status, setStatus] = useState(filters.status);
  const isCompletedQueue = status === "completed";

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    router.get(
      index.url(),
      {
        search: search || undefined,
        service_date: serviceDate || undefined,
        loket: loket === "all" ? undefined : Number(loket),
        status,
      },
      { preserveState: true, replace: true },
    );
  }

  function resetFilters() {
    setSearch("");
    setServiceDate("");
    setLoket("all");
    setStatus("waiting");
    router.get(index.url(), {}, { preserveState: true, replace: true });
  }

  return (
    <>
      <Head
        title={
          isCompletedQueue
            ? "BAP Selesai Administratif"
            : "BAP Menunggu Penerimaan"
        }
      />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {isCompletedQueue
                  ? "BAP Selesai Administratif"
                  : "BAP Menunggu Penerimaan"}
              </h1>
              <Badge variant="outline">Bendahara Barang</Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl text-sm">
              {isCompletedQueue
                ? "Riwayat read-only BAP yang telah diterima dan dicatat secara administratif."
                : "BAP yang telah lulus Verifikasi Tahap 1, Verifikasi Tahap 2, dan seluruh klarifikasi."}
            </p>
          </div>
        </section>

        <Card>
          <CardContent>
            <form
              onSubmit={applyFilters}
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_14rem_12rem_auto]"
            >
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari nomor BAP, Loket, atau nomerator"
                  aria-label="Cari nomor BAP, Loket, atau nomerator"
                />
              </div>
              <DatePicker
                value={serviceDate}
                onChange={setServiceDate}
                placeholder="Tanggal pelayanan"
                aria-label="Filter tanggal pelayanan"
              />
              <Select value={loket} onValueChange={setLoket}>
                <SelectTrigger aria-label="Filter Loket">
                  <SelectValue placeholder="Semua Loket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Semua Loket</SelectItem>
                    {lokets.map((option) => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "waiting" | "completed")
                }
              >
                <SelectTrigger aria-label="Filter status administrasi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="waiting">Menunggu Penerimaan</SelectItem>
                    <SelectItem value="completed">
                      Selesai Administratif
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
            {baps.data.length === 0 ? (
              <EmptyState
                title={
                  isCompletedQueue
                    ? "Belum ada BAP selesai administratif."
                    : "Tidak ada BAP menunggu penerimaan."
                }
                description={
                  isCompletedQueue
                    ? "BAP yang telah diterima Bendahara Barang akan muncul di sini."
                    : "BAP yang lulus seluruh prerequisite akan muncul di antrean ini."
                }
              />
            ) : (
              <Table className="min-w-[100rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>BAP</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Loket</TableHead>
                    <TableHead>Nomerator</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Batal/Rusak</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Verifier Tahap 1</TableHead>
                    <TableHead>Verifier Tahap 2</TableHead>
                    <TableHead>Selesai Tahap 2</TableHead>
                    <TableHead>
                      {isCompletedQueue ? "Diterima" : "Menunggu"}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baps.data.map((bap) => (
                    <TableRow key={bap.id}>
                      <TableCell className="font-medium tabular-nums">
                        {bap.number}
                      </TableCell>
                      <TableCell>{formatDate(bap.service_date)}</TableCell>
                      <TableCell>{bap.loket}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatRange(bap.numerator_start, bap.numerator_end)}
                      </TableCell>
                      <TableCell>{formatQuantity(bap.total_usage)}</TableCell>
                      <TableCell>
                        {formatQuantity(bap.cancellation_count)}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(bap.online_usage_count)}
                      </TableCell>
                      <TableCell>
                        {bap.phase_one ? (
                          <VerifierCell
                            verifier={bap.phase_one.verifier}
                            attempt={bap.phase_one.attempt}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {bap.phase_two ? (
                          <VerifierCell
                            verifier={bap.phase_two.verifier}
                            attempt={bap.phase_two.attempt}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bap.phase_two?.completed_at
                          ? formatDateTime(bap.phase_two.completed_at)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {isCompletedQueue ? (
                          <div className="flex flex-col gap-1">
                            <span>{bap.received_by ?? "—"}</span>
                            <span className="text-xs">
                              {bap.received_at
                                ? formatDateTime(bap.received_at)
                                : "—"}
                            </span>
                          </div>
                        ) : bap.phase_two?.completed_at ? (
                          waitingDuration(bap.phase_two.completed_at)
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <AdministrativeStatusBadge
                          status={bap.administrative_status}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={show(bap.id)}
                            aria-label={`Detail BAP ${bap.number}`}
                          >
                            <Eye />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

BapAdministrationIndex.layout = {
  breadcrumbs: [{ title: "Administrasi BAP", href: index() }],
};

function VerifierCell({
  verifier,
  attempt,
}: {
  verifier: string;
  attempt: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span>{verifier}</span>
      <span className="text-muted-foreground text-xs">Attempt #{attempt}</span>
    </div>
  );
}

function AdministrativeStatusBadge({
  status,
}: {
  status: "ready" | "completed";
}) {
  return (
    <Badge variant="outline">
      {status === "ready" ? "Siap Diterima" : "Selesai Administratif"}
    </Badge>
  );
}

function waitingDuration(value: string): string {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );

  if (minutes < 60) {
    return `Menunggu ${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Menunggu ${hours} jam`;
  }

  return `Menunggu ${Math.floor(hours / 24)} hari`;
}
