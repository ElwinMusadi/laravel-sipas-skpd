import { Head, Link, useForm } from "@inertiajs/react";
import {
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  MessageSquareMore,
  RotateCcw,
  Send,
} from "lucide-react";
import { useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatRange,
} from "@/components/inventory/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import bapClarifications, {
  index,
  open,
  review,
} from "@/routes/bap-clarifications";
import { show as showBap } from "@/routes/baps";

type ClarificationOutcome = "resolved" | "reopened";

type Props = {
  clarification: {
    id: number;
    status: "waiting_response" | "responded" | "resolved" | "reopened";
    status_label: string;
    request: {
      message: string | null;
      requested_by: string;
      requested_at: string;
      opened_by: string | null;
      opened_at: string | null;
    };
    bap: {
      id: number;
      document_number: string;
      loket: string;
      service_date: string;
      status: string;
      numerator_start: number;
      numerator_end: number;
      total_usage: number;
      online_usage_count: number;
    };
    verification: {
      id: number;
      stage: "phase_1" | "phase_2";
      stage_label: string;
      attempt: number;
      verifier: string;
      completed_at: string | null;
      discrepancies: {
        type: string;
        label: string;
        expected_value: string;
        actual_value: string;
        difference: number | null;
        notes: string;
      }[];
    };
    responses: {
      id: number;
      round: number;
      response: string;
      responded_by: string;
      responded_at: string;
      resolution: {
        outcome: ClarificationOutcome;
        outcome_label: string;
        notes: string;
        resolved_by: string;
        resolved_at: string;
      } | null;
    }[];
    history: {
      id: number;
      event: string;
      actor: string;
      created_at: string;
    }[];
  };
  can: { open: boolean; respond: boolean; review: boolean };
};

export default function ShowBapClarification({ clarification, can }: Props) {
  const [reviewOutcome, setReviewOutcome] =
    useState<ClarificationOutcome | null>(null);
  const responseForm = useForm({ response: "" });
  const reviewForm = useForm<{
    outcome: ClarificationOutcome;
    notes: string;
  }>({
    outcome: "resolved",
    notes: "",
  });

  const submitResponse = (): void => {
    responseForm.post(bapClarifications.responses.store(clarification.id).url, {
      preserveScroll: true,
      onSuccess: () => responseForm.reset(),
    });
  };

  const openReview = (outcome: ClarificationOutcome): void => {
    reviewForm.setData("outcome", outcome);
    reviewForm.clearErrors();
    setReviewOutcome(outcome);
  };

  const submitReview = (): void => {
    reviewForm.post(review(clarification.id).url, {
      preserveScroll: true,
      onSuccess: () => {
        reviewForm.reset();
        setReviewOutcome(null);
      },
    });
  };

  return (
    <>
      <Head title={`Klarifikasi ${clarification.bap.document_number}`} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="grid gap-2">
            <Button
              variant="link"
              size="sm"
              className="pl-0 hover:no-underline w-fit"
              asChild
            >
              <Link href={index()}>
                <ArrowLeft />
                Kembali ke antrean
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Klarifikasi {clarification.bap.document_number}
              </h1>
              <Badge variant="outline">{clarification.status_label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {clarification.bap.loket} ·{" "}
              {formatDate(clarification.bap.service_date)} ·{" "}
              {clarification.verification.stage_label}
            </p>
          </div>
          {can.open && clarification.request.opened_at === null ? (
            <Button asChild>
              <Link href={open(clarification.id)} method="post" as="button">
                <MessageSquareMore />
                Tandai telah dibuka
              </Link>
            </Button>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Informasi BAP</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow label="Loket" value={clarification.bap.loket} />
              <DetailRow
                label="Tanggal pelayanan"
                value={formatDate(clarification.bap.service_date)}
              />
              <DetailRow
                label="Nomerator"
                value={formatRange(
                  clarification.bap.numerator_start,
                  clarification.bap.numerator_end,
                )}
                mono
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={showBap(clarification.bap.id)}>
                  Lihat detail BAP
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sumber pemeriksaan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Tahap"
                value={clarification.verification.stage_label}
              />
              <DetailRow
                label="Attempt"
                value={`#${clarification.verification.attempt}`}
              />
              <DetailRow
                label="Verifier"
                value={clarification.verification.verifier}
              />
              <DetailRow
                label="Selesai diperiksa"
                value={
                  clarification.verification.completed_at
                    ? formatDateTime(clarification.verification.completed_at)
                    : "—"
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Permintaan klarifikasi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Diminta oleh"
                value={clarification.request.requested_by}
              />
              <DetailRow
                label="Diminta pada"
                value={formatDateTime(clarification.request.requested_at)}
              />
              <DetailRow
                label="Pertama dibuka"
                value={
                  clarification.request.opened_at
                    ? `${clarification.request.opened_by ?? "Loket"} · ${formatDateTime(clarification.request.opened_at)}`
                    : "Belum dicatat"
                }
              />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Selisih yang ditemukan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-muted-foreground text-sm">
              Expected dan actual adalah bukti pemeriksaan historis; keduanya
              tidak dapat diubah dari proses klarifikasi.
            </p>
            <div className="overflow-x-auto">
              <Table className="min-w-240">
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Selisih</TableHead>
                    <TableHead>Catatan verifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clarification.verification.discrepancies.map(
                    (discrepancy) => (
                      <TableRow key={discrepancy.type}>
                        <TableCell className="font-medium">
                          {discrepancy.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {discrepancy.expected_value}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {discrepancy.actual_value}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {discrepancy.difference ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal">
                          {discrepancy.notes}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permintaan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {clarification.request.message ??
                "Verifier tidak menambahkan pertanyaan terpisah; gunakan temuan di atas sebagai dasar pengecekan ulang."}
            </p>
          </CardContent>
        </Card>

        {can.respond ? (
          <Card>
            <CardHeader>
              <CardTitle>Berikan tanggapan Loket</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitResponse();
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="clarification-response">Tanggapan</Label>
                  <Textarea
                    id="clarification-response"
                    value={responseForm.data.response}
                    onChange={(event) =>
                      responseForm.setData("response", event.target.value)
                    }
                    aria-invalid={
                      responseForm.errors.response ? true : undefined
                    }
                    placeholder="Jelaskan hasil pengecekan ulang Loket."
                    rows={5}
                  />
                  {responseForm.errors.response ? (
                    <p className="text-destructive text-sm">
                      {responseForm.errors.response}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Button type="submit" disabled={responseForm.processing}>
                    <Send data-icon="inline-start" />
                    Kirim tanggapan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {can.review ? (
          <Card>
            <CardHeader>
              <CardTitle>Review klarifikasi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => openReview("resolved")}>
                <CheckCircle2 data-icon="inline-start" />
                Terima penyelesaian
              </Button>
              <Button variant="outline" onClick={() => openReview("reopened")}>
                <RotateCcw data-icon="inline-start" />
                Minta klarifikasi ulang
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Tanggapan dan resolusi</CardTitle>
          </CardHeader>
          <CardContent>
            {clarification.responses.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Belum ada tanggapan dari Loket.
              </p>
            ) : (
              <div className="grid gap-4">
                {clarification.responses.map((response) => (
                  <div
                    key={response.id}
                    className="border-border grid gap-4 rounded-lg border p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <p className="font-medium">
                          Tanggapan putaran #{response.round}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {response.responded_by} ·{" "}
                          {formatDateTime(response.responded_at)}
                        </p>
                      </div>
                      {response.resolution ? (
                        <Badge variant="outline">
                          {response.resolution.outcome_label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Menunggu review</Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {response.response}
                    </p>
                    {response.resolution ? (
                      <div className="bg-muted grid gap-2 rounded-md p-3 text-sm">
                        <p className="font-medium">Resolusi verifier</p>
                        <p className="whitespace-pre-wrap">
                          {response.resolution.notes}
                        </p>
                        <p className="text-muted-foreground">
                          {response.resolution.resolved_by} ·{" "}
                          {formatDateTime(response.resolution.resolved_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat klarifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            {clarification.history.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Belum ada aktivitas klarifikasi yang tercatat.
              </p>
            ) : (
              <div className="grid gap-4">
                {clarification.history.map((entry, index) => (
                  <div key={entry.id}>
                    {index > 0 ? <Separator className="mb-4" /> : null}
                    <p className="font-medium">{entry.event}</p>
                    <p className="text-muted-foreground text-sm">
                      {entry.actor} · {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={reviewOutcome !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setReviewOutcome(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewOutcome === "resolved"
                ? "Terima penyelesaian klarifikasi"
                : "Minta klarifikasi ulang"}
            </DialogTitle>
            <DialogDescription>
              {reviewOutcome === "resolved"
                ? `BAP akan masuk antrean verifikasi ulang ${clarification.verification.stage_label}.`
                : "Loket dapat memberikan tanggapan baru pada tiket yang sama."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitReview();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="review-notes">Catatan review</Label>
              <Textarea
                id="review-notes"
                value={reviewForm.data.notes}
                onChange={(event) =>
                  reviewForm.setData("notes", event.target.value)
                }
                aria-invalid={reviewForm.errors.notes ? true : undefined}
                placeholder={
                  reviewOutcome === "resolved"
                    ? "Jelaskan dasar penerimaan penyelesaian."
                    : "Jelaskan informasi tambahan yang masih diperlukan."
                }
                rows={4}
              />
              {reviewForm.errors.notes ? (
                <p className="text-destructive text-sm">
                  {reviewForm.errors.notes}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewOutcome(null)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={reviewForm.processing}>
                {reviewOutcome === "resolved" ? (
                  <CheckCircle2 data-icon="inline-start" />
                ) : (
                  <FileWarning data-icon="inline-start" />
                )}
                {reviewOutcome === "resolved"
                  ? "Terima penyelesaian"
                  : "Kirim permintaan ulang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

ShowBapClarification.layout = {
  breadcrumbs: [{ title: "Klarifikasi", href: index() }],
};

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-right font-medium ${mono ? "font-mono text-xs whitespace-nowrap" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
