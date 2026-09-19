import { Head, Link, router } from "@inertiajs/react";
import { ArrowRight, ClipboardCheck, Eye, Play } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as phaseOneRoutes from "@/routes/bap-verifications";
import * as phaseTwoRoutes from "@/routes/bap-verifications-phase-2";

type QueueBap = {
  id: number;
  document_number: string;
  service_date: string;
  loket: string;
  numerator_start: number;
  numerator_end: number;
  total_usage: number;
  online_usage_count: number;
  status: Extract<
    BapStatus,
    | "submitted"
    | "under_verification"
    | "waiting_reverification_phase_1"
    | "waiting_verification_phase_2"
    | "under_verification_phase_2"
    | "waiting_reverification_phase_2"
  >;
  created_by: string;
  submitted_at: string | null;
  verification: { verifier: string; started_at: string } | null;
  phase_one_verification: {
    verifier: string;
    result: "passed" | "discrepancy" | null;
    completed_at: string | null;
  } | null;
};

type Props = {
  baps: {
    data: QueueBap[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  verification_stage: {
    value: "phase_1" | "phase_2";
    label: string;
    verifier_label: string;
    is_phase_two: boolean;
  };
};

export default function BapVerificationIndex({
  baps,
  verification_stage: stage,
}: Props) {
  const routes = stage.is_phase_two ? phaseTwoRoutes : phaseOneRoutes;
  const startStatuses: QueueBap["status"][] = stage.is_phase_two
    ? ["waiting_verification_phase_2", "waiting_reverification_phase_2"]
    : ["submitted", "waiting_reverification_phase_1"];

  return (
    <>
      <Head title={`Antrean ${stage.label}`} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Antrean {stage.label}
              </h1>
              <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <ClipboardCheck className="size-3.5" />
                {stage.verifier_label}
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Periksa data BAP dan dokumen fisik sebelum mencatat hasil{" "}
              {stage.label}.
            </p>
          </div>
        </section>

        <Card>
          <CardContent>
            {baps.data.length === 0 ? (
              <EmptyState
                title={`Tidak ada BAP pada antrean ${stage.label}.`}
                description={
                  stage.is_phase_two
                    ? "BAP yang lulus Verifikasi Tahap 1 akan muncul di sini."
                    : "BAP yang telah diajukan oleh Loket akan muncul di sini."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table
                  className={stage.is_phase_two ? "min-w-390" : "min-w-310"}
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Nomerator</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Online</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diajukan</TableHead>
                      <TableHead>Pemeriksa</TableHead>
                      {stage.is_phase_two ? (
                        <>
                          <TableHead>Hasil Tahap 1</TableHead>
                          <TableHead>Selesai Tahap 1</TableHead>
                          <TableHead>Menunggu</TableHead>
                        </>
                      ) : null}
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baps.data.map((bap) => (
                      <TableRow key={bap.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(bap.service_date)}
                        </TableCell>
                        <TableCell>
                          <p>{bap.loket}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {bap.created_by}
                          </p>
                        </TableCell>
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
                          <BapStatusBadge status={bap.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {bap.submitted_at
                            ? formatDateTime(bap.submitted_at)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {bap.verification ? (
                            <span className="grid gap-1">
                              <span>{bap.verification.verifier}</span>
                              <span className="text-xs">
                                {formatDateTime(bap.verification.started_at)}
                              </span>
                            </span>
                          ) : (
                            "Belum dimulai"
                          )}
                        </TableCell>
                        {stage.is_phase_two ? (
                          <>
                            <TableCell>
                              {bap.phase_one_verification?.result === "passed"
                                ? "Lulus"
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {bap.phase_one_verification?.completed_at
                                ? formatDateTime(
                                    bap.phase_one_verification.completed_at,
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {waitingDuration(
                                bap.phase_one_verification?.completed_at ??
                                  null,
                              )}
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {startStatuses.includes(bap.status) ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  router.post(routes.start(bap.id).url)
                                }
                              >
                                <Play />
                                {bap.status.startsWith("waiting_reverification")
                                  ? "Mulai Ulang"
                                  : "Mulai"}
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={routes.show(bap.id)}
                                aria-label={`Detail verifikasi BAP ${bap.document_number}`}
                              >
                                {startStatuses.includes(bap.status) ? (
                                  <ArrowRight />
                                ) : (
                                  <Eye />
                                )}
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

BapVerificationIndex.layout = {
  breadcrumbs: [{ title: "Antrean Verifikasi", href: phaseOneRoutes.index() }],
};

function waitingDuration(value: string | null): string {
  if (!value) {
    return "—";
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );

  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} jam`;
  }

  return `${Math.floor(hours / 24)} hari`;
}
