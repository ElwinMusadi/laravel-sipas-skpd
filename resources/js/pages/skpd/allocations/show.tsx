import { Head, Link, usePage } from "@inertiajs/react";
import {
  ArrowLeft,
  History,
  PackageCheck,
  Pencil,
  Undo2,
  XCircle,
} from "lucide-react";
import SkpdAllocationController from "@/actions/App/Http/Controllers/SkpdAllocationController";
import { AllocationStatusBadge } from "@/components/allocation/allocation-status-badge";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import FormErrorSummary from "@/components/form-error-summary";
import {
  formatDate,
  formatDateTime,
  formatNomerator,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { edit, index } from "@/routes/skpd/allocations";
import { show as boxShow } from "@/routes/skpd/boxes";

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
  status: "pending" | "accepted" | "completed" | "cancelled" | "returned";
  created_by: string;
  created_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  can: {
    accept: boolean;
    edit: boolean;
    cancel: boolean;
    return_remainder: boolean;
  };
  timeline: {
    id: number;
    event: string;
    actor: string;
    created_at: string;
  }[];
};

export default function ShowAllocation({
  allocation,
}: {
  allocation: Allocation;
}) {
  const { errors } = usePage().props;

  return (
    <>
      <Head title={`Alokasi ${allocation.box.box_number}`} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <Button
              className="pl-0 hover:no-underline"
              variant="link"
              size="sm"
              asChild
            >
              <Link href={index()}>
                <ArrowLeft />
                Kembali ke alokasi
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Alokasi {allocation.box.box_number}
              </h1>
              <AllocationStatusBadge status={allocation.status} />
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              {formatRange(allocation.numerator_start, allocation.numerator_end)}
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-2">
            {allocation.can.edit ? (
              <Button variant="outline" asChild>
                <Link href={edit(allocation.id)}>
                  <Pencil />
                  Edit alokasi
                </Link>
              </Button>
            ) : null}
            {allocation.can.accept ? (
              <ConfirmActionDialog
                action={SkpdAllocationController.accept(allocation.id)}
                trigger={
                  <Button>
                    <PackageCheck />
                    Terima handover
                  </Button>
                }
                title="Terima handover alokasi?"
                description="Setelah diterima, alokasi menjadi milik Loket dan tidak dapat diubah atau dibatalkan. Pastikan Box dan range Nomerator fisik sudah sesuai."
                confirmLabel="Ya, terima handover"
                errorTitle="Handover tidak dapat diterima."
              >
                <AllocationSummary allocation={allocation} />
              </ConfirmActionDialog>
            ) : null}
            {allocation.can.cancel ? (
              <ConfirmActionDialog
                action={SkpdAllocationController.cancel(allocation.id)}
                trigger={
                  <Button variant="destructive">
                    <XCircle />
                    Hapus alokasi pending
                  </Button>
                }
                title="Hapus alokasi pending?"
                description="Range Nomerator alokasi ini kembali tersedia di Box dan dapat dialokasikan ulang. Riwayat audit tetap disimpan."
                confirmLabel="Ya, hapus alokasi"
                errorTitle="Alokasi tidak dapat dihapus."
                destructive
              >
                <AllocationSummary allocation={allocation} />
              </ConfirmActionDialog>
            ) : null}
            {allocation.can.return_remainder ? (
              <ConfirmActionDialog
                action={SkpdAllocationController.returnRemainder(allocation.id)}
                trigger={
                  <Button variant="outline">
                    <Undo2 />
                    Kembalikan sisa ke pusat
                  </Button>
                }
                title="Kembalikan sisa Nomerator ke pusat?"
                description={`Sisa ${formatQuantity(allocation.remaining_quantity)} set yang belum dipakai Loket akan ditarik ke Box dan dapat dialokasikan ulang. Nomerator yang sudah tercatat di BAP (termasuk draft) tetap milik Loket.`}
                confirmLabel="Ya, kembalikan sisa"
                errorTitle="Sisa alokasi tidak dapat dikembalikan."
              >
                <AllocationSummary allocation={allocation} />
                <div className="grid gap-2">
                  <Label htmlFor="return-remainder-reason">
                    Alasan pengembalian
                  </Label>
                  <Textarea
                    id="return-remainder-reason"
                    name="reason"
                    rows={3}
                    maxLength={1000}
                    required
                    placeholder="Contoh: Loket ditutup sementara, sisa Bukti SKPD ditarik ke gudang."
                  />
                </div>
              </ConfirmActionDialog>
            ) : null}
          </div>
        </div>

        <FormErrorSummary
          errors={errors}
          title="Aksi alokasi tidak dapat diproses."
        />

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Box"
                value={
                  <Link
                    href={boxShow(allocation.box.id)}
                    className="font-medium hover:underline"
                  >
                    {allocation.box.box_number}
                  </Link>
                }
              />
              <DetailRow label="Loket" value={allocation.loket.name} />
              <DetailRow
                label="Tanggal alokasi"
                value={
                  allocation.allocation_date
                    ? formatDate(allocation.allocation_date)
                    : "Belum tercatat"
                }
              />
              <DetailRow label="Dibuat oleh" value={allocation.created_by} />
              <DetailRow
                label="Dibuat pada"
                value={formatDateTime(allocation.created_at)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Range dan quantity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Nomerator awal"
                value={formatNomerator(allocation.numerator_start)}
              />
              <DetailRow
                label="Nomerator akhir"
                value={formatNomerator(allocation.numerator_end)}
              />
              <DetailRow
                label="Quantity"
                value={`${formatQuantity(allocation.quantity)} set`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Persediaan Loket</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Terpakai"
                value={`${formatQuantity(allocation.used_quantity)} set`}
              />
              <DetailRow
                label="Sisa"
                value={`${formatQuantity(allocation.remaining_quantity)} set`}
              />
              <DetailRow
                label="Handover diterima"
                value={
                  allocation.accepted_at
                    ? `${allocation.accepted_by ?? "—"} · ${formatDateTime(allocation.accepted_at)}`
                    : "Belum diterima"
                }
              />
            </CardContent>
          </Card>
        </section>

        {allocation.status === "accepted" ? (
          <p className="text-muted-foreground rounded-xl border p-4 text-sm">
            Alokasi yang sudah diterima Loket tidak dapat diubah atau ditarik
            kembali.
          </p>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <History className="text-muted-foreground size-4" />
            <CardTitle>Riwayat singkat</CardTitle>
          </CardHeader>
          <CardContent>
            {allocation.timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Belum ada riwayat yang dapat ditampilkan.
              </p>
            ) : (
              <div className="space-y-4">
                {allocation.timeline.map((entry, entryIndex) => (
                  <div key={entry.id}>
                    {entryIndex > 0 ? <Separator className="mb-4" /> : null}
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
    </>
  );
}

function AllocationSummary({ allocation }: { allocation: Allocation }) {
  return (
    <div className="bg-muted grid gap-3 rounded-xl p-4 text-sm">
      <DetailRow label="Box" value={allocation.box.box_number} />
      <DetailRow label="Loket" value={allocation.loket.name} />
      <DetailRow
        label="Range Nomerator"
        value={
          <span className="font-mono">
            {formatRange(allocation.numerator_start, allocation.numerator_end)}
          </span>
        }
      />
      <DetailRow
        label="Jumlah"
        value={`${formatQuantity(allocation.quantity)} set`}
      />
      <DetailRow
        label="Sudah dipakai"
        value={`${formatQuantity(allocation.used_quantity)} set`}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

ShowAllocation.layout = {
  breadcrumbs: [
    { title: "Distribusi / Alokasi", href: index() },
    { title: "Detail alokasi", href: index() },
  ],
};
