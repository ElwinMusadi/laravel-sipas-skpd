import { Form, Head, Link } from "@inertiajs/react";
import { Eye, MessageSquareMore } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { formatDate, formatDateTime } from "@/components/inventory/format";
import { Pagination } from "@/components/inventory/pagination";
import type { PaginationLink } from "@/components/inventory/types";
import { Badge } from "@/components/ui/badge";
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
import { index, open, show } from "@/routes/bap-clarifications";

type Clarification = {
  id: number;
  bap_id: number;
  bap_document_number: string;
  service_date: string;
  loket: string;
  stage: "phase_1" | "phase_2";
  stage_label: string;
  status: "waiting_response" | "responded" | "resolved" | "reopened";
  status_label: string;
  requested_by: string;
  requested_at: string;
  waiting_since: string;
  discrepancy_count: number;
  summary: string;
};

type Props = {
  clarifications: {
    data: Clarification[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
  };
  queue: {
    title: string;
    description: string;
    opens_for_loket: boolean;
  };
};

export default function BapClarificationIndex({
  clarifications,
  queue,
}: Props) {
  return (
    <>
      <Head title={queue.title} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <section className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {queue.title}
            </h1>
            <Badge variant="outline">
              <MessageSquareMore data-icon="inline-start" />
              Antrean klarifikasi
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {queue.description}
          </p>
        </section>

        <Card>
          <CardContent>
            {clarifications.data.length === 0 ? (
              <EmptyState
                icon={MessageSquareMore}
                title="Tidak ada klarifikasi yang perlu ditindaklanjuti."
                description="Antrean akan diperbarui ketika ada tindakan yang menjadi tanggung jawab Anda."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-300">
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead>BAP</TableHead> */}
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Tahap</TableHead>
                      <TableHead>Selisih</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diminta</TableHead>
                      <TableHead>Menunggu</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clarifications.data.map((clarification) => (
                      <TableRow key={clarification.id}>
                        {/* <TableCell className="font-medium whitespace-nowrap">
                          {clarification.bap_document_number}
                        </TableCell> */}
                        <TableCell className="whitespace-nowrap">
                          {formatDate(clarification.service_date)}
                        </TableCell>
                        <TableCell>{clarification.loket}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {clarification.stage_label}
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="line-clamp-2 text-sm">
                            {clarification.summary}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {clarification.discrepancy_count} temuan
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {clarification.status_label}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm">
                            {clarification.requested_by}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatDateTime(clarification.requested_at)}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {waitingDuration(clarification.waiting_since)}
                        </TableCell>
                        <TableCell className="text-right">
                          {queue.opens_for_loket ? (
                            <Form action={open(clarification.id)}>
                              {({ processing }) => (
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  disabled={processing}
                                >
                                  <MessageSquareMore data-icon="inline-start" />
                                  Buka
                                </Button>
                              )}
                            </Form>
                          ) : (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={show(clarification.id)}>
                                <Eye data-icon="inline-start" />
                                Review
                              </Link>
                            </Button>
                          )}
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
            Menampilkan {clarifications.from ?? 0}–{clarifications.to ?? 0} dari{" "}
            {clarifications.total} klarifikasi
          </p>
          <Pagination links={clarifications.links} />
        </div>
      </main>
    </>
  );
}

BapClarificationIndex.layout = {
  breadcrumbs: [{ title: "Klarifikasi", href: index() }],
};

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
