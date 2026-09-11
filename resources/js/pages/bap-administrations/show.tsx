import { Head, Link, useForm } from "@inertiajs/react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatNomeratur,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { index, receive } from "@/routes/bap-administrations";

type ChecklistItem = {
  type: string;
  label: string;
  is_attested: boolean;
  expected_quantity: number | null;
  actual_quantity: number | null;
  quantity_difference: number | null;
  expected_numerator_start: number | null;
  expected_numerator_end: number | null;
  actual_numerator_start: number | null;
  actual_numerator_end: number | null;
};

type Discrepancy = {
  type: string;
  label: string;
  expected_value: string;
  actual_value: string;
  difference: number | null;
  notes: string;
};

type Verification = {
  id: number;
  attempt: number;
  verifier: string;
  status: "in_progress" | "completed";
  result: "passed" | "discrepancy" | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  checklist: ChecklistItem[];
  discrepancies: Discrepancy[];
  clarification: {
    id: number;
    status: string;
    status_label: string;
  } | null;
};

type Props = {
  bap: {
    id: number;
    number: string;
    service_date: string;
    loket: string;
    created_by: string;
    created_at: string;
    submitted_at: string | null;
    status: "verified_phase_2" | "completed";
    total_usage: number;
    online_usage_count: number;
    cancellation_count: number;
    numerator_start: number;
    numerator_end: number;
    receipt: {
      received_by: string | null;
      received_at: string | null;
      receipt_notes: string | null;
    };
    can: { receive: boolean };
    segments: {
      id: number;
      allocation_id: number;
      box_number: string;
      numerator_start: number;
      numerator_end: number;
      quantity: number;
    }[];
    cancellations: {
      id: number;
      numerator: number;
      reason: "cancelled" | "damaged";
      description: string | null;
      created_by: string;
      created_at: string;
    }[];
    phase_one: Verification[];
    phase_two: Verification[];
    clarifications: {
      id: number;
      stage_label: string;
      attempt: number;
      status: string;
      status_label: string;
      requested_by: string;
      requested_at: string;
      request_notes: string | null;
      opened_by: string | null;
      opened_at: string | null;
      responses: {
        id: number;
        round: number;
        response: string;
        responded_by: string;
        responded_at: string;
        resolution: {
          outcome: string;
          outcome_label: string;
          notes: string;
          resolved_by: string;
          resolved_at: string;
        } | null;
      }[];
    }[];
    history: {
      id: number;
      event: string;
      actor: string;
      created_at: string;
    }[];
  };
};

export default function BapAdministrationShow({ bap }: Props) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const form = useForm({ receipt_notes: "" });

  function submitReceipt(): void {
    form.post(receive.url(bap.id), {
      onSuccess: () => setConfirmationOpen(false),
    });
  }

  return (
    <>
      <Head title={`Administrasi ${bap.number}`} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
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
                Administrasi BAP {bap.number}
              </h1>
              <AdministrativeStatusBadge status={bap.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {bap.loket} • {formatDate(bap.service_date)}
            </p>
          </div>
          {bap.can.receive ? (
            <Button
              onClick={() => setConfirmationOpen(true)}
              disabled={form.processing}
            >
              <ClipboardCheck />
              Terima secara administratif
            </Button>
          ) : null}
        </section>

        {bap.can.receive ? (
          <Alert>
            <ShieldCheck />
            <AlertTitle>Siap diterima Bendahara Barang</AlertTitle>
            <AlertDescription>
              BAP ini telah lulus Verifikasi Tahap 1 dan Tahap 2. Penerimaan
              hanya mencatat finalisasi administratif; sumber data inventaris
              tidak diubah.
            </AlertDescription>
          </Alert>
        ) : (
          <ReceiptSummary receipt={bap.receipt} />
        )}

        <Tabs defaultValue="summary" className="gap-4">
          <TabsList className="bg-muted/60 h-auto w-full justify-start overflow-x-auto rounded-2xl p-1">
            <TabsTrigger value="summary">
              <FileText />
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="verification">
              <ShieldCheck />
              Riwayat Verifikasi
            </TabsTrigger>
            <TabsTrigger value="clarification">
              <MessageSquareText />
              Klarifikasi
            </TabsTrigger>
            <TabsTrigger value="history">
              <History />
              Riwayat Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="grid gap-6">
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Identitas dan penggunaan</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DataItem label="Nomor BAP" value={bap.number} />
                    <DataItem
                      label="Tanggal pelayanan"
                      value={formatDate(bap.service_date)}
                    />
                    <DataItem label="Loket" value={bap.loket} />
                    <DataItem label="Dibuat oleh" value={bap.created_by} />
                    <DataItem
                      label="Dibuat pada"
                      value={formatDateTime(bap.created_at)}
                    />
                    <DataItem
                      label="Diajukan pada"
                      value={
                        bap.submitted_at
                          ? formatDateTime(bap.submitted_at)
                          : "—"
                      }
                    />
                    <DataItem
                      label="Nomeratur"
                      value={formatRange(
                        bap.numerator_start,
                        bap.numerator_end,
                      )}
                      mono
                    />
                    <DataItem
                      label="Total penggunaan"
                      value={formatQuantity(bap.total_usage)}
                    />
                    <DataItem
                      label="Penggunaan online"
                      value={formatQuantity(bap.online_usage_count)}
                    />
                    <DataItem
                      label="Batal/rusak"
                      value={formatQuantity(bap.cancellation_count)}
                    />
                  </dl>

                  <div className="grid gap-3">
                    <h2 className="font-medium">Segment penggunaan</h2>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Box sumber</TableHead>
                          <TableHead>Nomeratur</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bap.segments.map((segment) => (
                          <TableRow key={segment.id}>
                            <TableCell>{segment.box_number}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatRange(
                                segment.numerator_start,
                                segment.numerator_end,
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatQuantity(segment.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Batal/rusak</CardTitle>
                </CardHeader>
                <CardContent>
                  {bap.cancellations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Tidak ada nomeratur batal atau rusak.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {bap.cancellations.map((cancellation) => (
                        <div
                          key={cancellation.id}
                          className="rounded-xl border p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono font-medium">
                              {formatNomeratur(cancellation.numerator)}
                            </span>
                            <Badge variant="outline">
                              {cancellation.reason === "damaged"
                                ? "Rusak"
                                : "Batal"}
                            </Badge>
                          </div>
                          {cancellation.description ? (
                            <p className="text-muted-foreground mt-2">
                              {cancellation.description}
                            </p>
                          ) : null}
                          <p className="text-muted-foreground mt-2 text-xs">
                            Dicatat {cancellation.created_by} •{" "}
                            {formatDateTime(cancellation.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="verification" className="grid gap-6">
            <VerificationHistory
              title="Verifikasi Tahap 1"
              verification={bap.phase_one}
            />
            <VerificationHistory
              title="Verifikasi Tahap 2"
              verification={bap.phase_two}
            />
          </TabsContent>

          <TabsContent value="clarification">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat klarifikasi</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {bap.clarifications.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Tidak ada klarifikasi pada BAP ini.
                  </p>
                ) : (
                  bap.clarifications.map((clarification) => (
                    <article
                      key={clarification.id}
                      className="grid gap-4 rounded-xl border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-medium">
                            {clarification.stage_label} • Attempt #
                            {clarification.attempt}
                          </h2>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Diminta oleh {clarification.requested_by} •{" "}
                            {formatDateTime(clarification.requested_at)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {clarification.status_label}
                        </Badge>
                      </div>
                      {clarification.request_notes ? (
                        <p className="text-sm">{clarification.request_notes}</p>
                      ) : null}
                      {clarification.opened_at ? (
                        <p className="text-muted-foreground text-xs">
                          Dibuka oleh {clarification.opened_by ?? "Loket"} •{" "}
                          {formatDateTime(clarification.opened_at)}
                        </p>
                      ) : null}
                      <div className="grid gap-3">
                        {clarification.responses.map((response) => (
                          <div
                            key={response.id}
                            className="bg-muted/40 grid gap-2 rounded-xl p-3 text-sm"
                          >
                            <p>
                              <span className="font-medium">
                                Tanggapan ronde {response.round}
                              </span>{" "}
                              oleh {response.responded_by} •{" "}
                              {formatDateTime(response.responded_at)}
                            </p>
                            <p className="text-muted-foreground">
                              {response.response}
                            </p>
                            {response.resolution ? (
                              <div className="border-t pt-2">
                                <p className="font-medium">
                                  {response.resolution.outcome_label}
                                </p>
                                <p className="text-muted-foreground mt-1">
                                  {response.resolution.notes}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  Oleh {response.resolution.resolved_by} •{" "}
                                  {formatDateTime(
                                    response.resolution.resolved_at,
                                  )}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat aktivitas BAP</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-4">
                  {bap.history.map((entry) => (
                    <li key={entry.id} className="border-l-2 pl-4">
                      <p className="font-medium">{entry.event}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {entry.actor} • {formatDateTime(entry.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima BAP secara administratif?</DialogTitle>
            <DialogDescription>
              Pastikan BAP telah lulus Verifikasi Tahap 1, Verifikasi Tahap 2,
              dan seluruh klarifikasi telah selesai. Penerimaan ini menandai BAP
              selesai secara administratif dan tidak mengubah data sumber
              inventaris.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="receipt-notes">Catatan penerimaan (opsional)</Label>
            <Textarea
              id="receipt-notes"
              value={form.data.receipt_notes}
              onChange={(event) =>
                form.setData("receipt_notes", event.target.value)
              }
              placeholder="Catatan administratif tambahan."
              aria-invalid={Boolean(form.errors.receipt_notes)}
            />
            {form.errors.receipt_notes ? (
              <p className="text-destructive text-sm">
                {form.errors.receipt_notes}
              </p>
            ) : null}
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={submitReceipt} disabled={form.processing}>
              <CheckCircle2 />
              {form.processing ? "Menyimpan..." : "Ya, terima BAP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

BapAdministrationShow.layout = {
  breadcrumbs: [
    { title: "Administrasi BAP", href: index() },
    { title: "Detail BAP", href: index() },
  ],
};

function ReceiptSummary({ receipt }: { receipt: Props["bap"]["receipt"] }) {
  return (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>Selesai administratif</AlertTitle>
      <AlertDescription>
        Diterima oleh {receipt.received_by ?? "—"} pada{" "}
        {receipt.received_at ? formatDateTime(receipt.received_at) : "—"}.
        {receipt.receipt_notes ? ` Catatan: ${receipt.receipt_notes}` : ""}
      </AlertDescription>
    </Alert>
  );
}

function AdministrativeStatusBadge({
  status,
}: {
  status: Props["bap"]["status"];
}) {
  return (
    <Badge variant="outline">
      {status === "completed" ? "Selesai Administratif" : "Siap Diterima"}
    </Badge>
  );
}

function DataItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}

function VerificationHistory({
  title,
  verification,
}: {
  title: string;
  verification: Verification[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {verification.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada riwayat {title.toLowerCase()}.
          </p>
        ) : (
          verification.map((entry) => (
            <article
              key={entry.id}
              className="grid gap-4 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">
                    Attempt #{entry.attempt} • {entry.verifier}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Dimulai {formatDateTime(entry.started_at)}
                    {entry.completed_at
                      ? ` • Selesai ${formatDateTime(entry.completed_at)}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline">
                  {entry.result === "passed"
                    ? "Lulus"
                    : entry.result === "discrepancy"
                      ? "Ada selisih"
                      : "Berlangsung"}
                </Badge>
              </div>
              {entry.notes ? (
                <p className="text-muted-foreground text-sm">{entry.notes}</p>
              ) : null}
              {entry.clarification ? (
                <p className="text-sm">
                  Klarifikasi:{" "}
                  <span className="font-medium">
                    {entry.clarification.status_label}
                  </span>
                </p>
              ) : null}
              <div className="grid gap-3">
                <h3 className="text-sm font-medium">Checklist</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Sistem</TableHead>
                      <TableHead>Fisik</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.checklist.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>
                          {checklistValue(item, "expected")}
                        </TableCell>
                        <TableCell>{checklistValue(item, "actual")}</TableCell>
                        <TableCell>
                          {item.is_attested ? "Diperiksa" : "Belum diattestasi"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {entry.discrepancies.length > 0 ? (
                <div className="grid gap-3">
                  <h3 className="text-sm font-medium">Selisih tercatat</h3>
                  {entry.discrepancies.map((discrepancy) => (
                    <div
                      key={discrepancy.type}
                      className="bg-destructive/5 border-destructive/20 grid gap-1 rounded-xl border p-3 text-sm"
                    >
                      <p className="font-medium">{discrepancy.label}</p>
                      <p className="text-muted-foreground">
                        Sistem: {discrepancy.expected_value} • Fisik:{" "}
                        {discrepancy.actual_value}
                      </p>
                      <p>{discrepancy.notes}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function checklistValue(
  item: ChecklistItem,
  source: "expected" | "actual",
): string {
  const quantity =
    source === "expected" ? item.expected_quantity : item.actual_quantity;
  const rangeStart =
    source === "expected"
      ? item.expected_numerator_start
      : item.actual_numerator_start;
  const rangeEnd =
    source === "expected"
      ? item.expected_numerator_end
      : item.actual_numerator_end;

  if (rangeStart !== null && rangeEnd !== null) {
    return formatRange(rangeStart, rangeEnd);
  }

  return quantity === null ? "—" : formatQuantity(quantity);
}
