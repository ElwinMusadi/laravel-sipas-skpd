import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, FileText } from "lucide-react";
import {
  BapStatusBadge,
  type BapStatus,
} from "@/components/bap/bap-status-badge";
import {
  formatDate,
  formatDateTime,
  formatNomerator,
  formatQuantity,
  formatRange,
} from "@/components/inventory/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { index } from "@/routes/bap-cancellations";
import { show as showBap } from "@/routes/baps";

type Props = {
  cancellation: {
    id: number;
    numerator: number;
    reason: "cancelled" | "damaged";
    reason_label: string;
    description: string | null;
    created_by: string;
    created_at: string;
    bap: {
      id: number;
      document_number: string;
      service_date: string;
      loket: { id: number; name: string };
      numerator_start: number;
      numerator_end: number;
      total_usage: number;
      cancellation_quantity: number;
      normal_usage_quantity: number;
      status: BapStatus;
      created_by: string;
    };
  };
};

export default function ShowBapCancellation({ cancellation }: Props) {
  return (
    <>
      <Head
        title={`BAP Batal/Rusak ${formatNomerator(cancellation.numerator)}`}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="grid gap-2">
            <Button
              variant="link"
              size="sm"
              className="pl-0 hover:no-underline"
              asChild
            >
              <Link href={index()}>
                <ArrowLeft data-icon="inline-start" />
                Kembali ke BAP Batal/Rusak
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">
                {formatNomerator(cancellation.numerator)}
              </h1>
              <Badge variant="outline">{cancellation.reason_label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Tercatat pada {cancellation.bap.document_number}.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={showBap(cancellation.bap.id)}>
              <FileText data-icon="inline-start" />
              Lihat BAP SKPD
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Informasi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow
                label="Nomerator"
                value={formatNomerator(cancellation.numerator)}
                mono
              />
              <DetailRow
                label="Klasifikasi"
                value={cancellation.reason_label}
              />
              <DetailRow label="Dicatat oleh" value={cancellation.created_by} />
              <DetailRow
                label="Dicatat pada"
                value={formatDateTime(cancellation.created_at)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Keterangan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {cancellation.description ?? "Tidak ada keterangan tambahan."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>BAP terkait</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow label="Loket" value={cancellation.bap.loket.name} />
              <DetailRow
                label="Tanggal"
                value={formatDate(cancellation.bap.service_date)}
              />
              <DetailRow
                label="Status"
                value={<BapStatusBadge status={cancellation.bap.status} />}
              />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan pemakaian BAP</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryValue
              label="Range BAP"
              value={formatRange(
                cancellation.bap.numerator_start,
                cancellation.bap.numerator_end,
              )}
              mono
            />
            <SummaryValue
              label="Total pemakaian"
              value={`${formatQuantity(cancellation.bap.total_usage)} set`}
            />
            <SummaryValue
              label="Batal/rusak"
              value={`${formatQuantity(cancellation.bap.cancellation_quantity)} set`}
            />
            <SummaryValue
              label="Pemakaian normal"
              value={`${formatQuantity(cancellation.bap.normal_usage_quantity)} set`}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

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

function SummaryValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted rounded-xl p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

ShowBapCancellation.layout = {
  breadcrumbs: [
    { title: "BAP Batal/Rusak", href: index() },
    { title: "Detail Batal/Rusak", href: index() },
  ],
};
