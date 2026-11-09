import { Form, Head, Link } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import SkpdAllocationController from "@/actions/App/Http/Controllers/SkpdAllocationController";
import { EmptyState } from "@/components/app/empty-state";
import InputError from "@/components/input-error";
import { formatQuantity, formatRange } from "@/components/inventory/format";
import { RangeInputFields } from "@/components/inventory/range-input-fields";
import type { LoketOption } from "@/components/inventory/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Heading from "@/components/heading";
import { cn } from "@/lib/utils";
import { create, index } from "@/routes/skpd/allocations";

type BoxOption = {
  id: number;
  box_number: string;
  numerator_start: number;
  numerator_end: number;
  total_sets: number;
  available_quantity: number;
};

type Props = {
  boxes: BoxOption[];
  lokets: LoketOption[];
};

export default function CreateAllocation({ boxes, lokets }: Props) {
  const [boxId, setBoxId] = useState("");
  const [loketId, setLoketId] = useState("");
  const [allocationDate, setAllocationDate] = useState<Date | undefined>(
    new Date(),
  );
  const [numeratorStart, setNumeratorStart] = useState("");
  const [numeratorEnd, setNumeratorEnd] = useState("");
  const selectedBox = useMemo(
    () => boxes.find((box) => box.id === Number(boxId)) ?? null,
    [boxId, boxes],
  );

  return (
    <>
      <Head title="Buat Alokasi SKPD" />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <Heading
          title="Buat Alokasi SKPD"
          description="Pilih Box, tentukan Loket penerima, lalu masukkan range Nomerator. Jumlah set dihitung otomatis dan diperiksa kembali oleh sistem saat disimpan."
        />

        {boxes.length === 0 ? (
          <Card className="max-w-3xl">
            <EmptyState
              title="Tidak ada Box yang tersedia."
              description="Daftarkan Box baru atau selesaikan alokasi yang masih menunggu sebelum membuat alokasi berikutnya."
              action={
                <Button variant="outline" asChild>
                  <Link href={index()}>Kembali</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="max-w-3xl">
            <CardContent>
              <Form
                {...SkpdAllocationController.store.form()}
                className="space-y-6"
              >
                {({ errors, processing }) => (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="skpd_box_id">Box SKPD</Label>
                      <Select
                        name="skpd_box_id"
                        value={boxId || "none"}
                        onValueChange={(val) =>
                          setBoxId(val === "none" ? "" : val)
                        }
                      >
                        <SelectTrigger
                          id="skpd_box_id"
                          aria-invalid={Boolean(errors.skpd_box_id)}
                        >
                          <SelectValue placeholder="Pilih Box SKPD" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Pilih Box SKPD</SelectItem>
                          {boxes.map((box) => (
                            <SelectItem key={box.id} value={box.id.toString()}>
                              {box.box_number} ·{" "}
                              {formatRange(
                                box.numerator_start,
                                box.numerator_end,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <InputError message={errors.skpd_box_id} />
                    </div>

                    {selectedBox ? (
                      <Card size="sm" className="bg-muted/50 shadow-none">
                        <CardHeader>
                          <CardTitle>Range Box terpilih</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                          <p className="font-mono">
                            {formatRange(
                              selectedBox.numerator_start,
                              selectedBox.numerator_end,
                            )}
                          </p>
                          <p className="text-muted-foreground sm:text-right">
                            {formatQuantity(selectedBox.available_quantity)} set
                            tersedia
                          </p>
                        </CardContent>
                      </Card>
                    ) : null}

                    <div className="grid gap-2">
                      <Label htmlFor="loket_id">Loket penerima</Label>
                      <Select
                        name="loket_id"
                        value={loketId || "none"}
                        onValueChange={(val) =>
                          setLoketId(val === "none" ? "" : val)
                        }
                      >
                        <SelectTrigger
                          id="loket_id"
                          aria-invalid={Boolean(errors.loket_id)}
                        >
                          <SelectValue placeholder="Pilih Loket" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Pilih Loket</SelectItem>
                          {lokets.map((loket) => (
                            <SelectItem
                              key={loket.id}
                              value={loket.id.toString()}
                            >
                              {loket.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <InputError message={errors.loket_id} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="allocation_date">Tanggal alokasi</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !allocationDate && "text-muted-foreground",
                              errors.allocation_date &&
                                "border-destructive text-destructive",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {allocationDate ? (
                              format(allocationDate, "PPP", { locale: id })
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={allocationDate}
                            onSelect={setAllocationDate}
                            locale={id}
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        type="hidden"
                        name="allocation_date"
                        value={
                          allocationDate
                            ? format(allocationDate, "yyyy-MM-dd")
                            : ""
                        }
                      />
                      <InputError message={errors.allocation_date} />
                    </div>

                    <RangeInputFields
                      numeratorStart={numeratorStart}
                      numeratorEnd={numeratorEnd}
                      onNumeratorStartChange={setNumeratorStart}
                      onNumeratorEndChange={setNumeratorEnd}
                      errors={errors}
                    />

                    <p className="text-muted-foreground rounded-xl border p-4 text-sm">
                      Setelah dibuat, alokasi berstatus <strong>pending</strong>
                      . Persediaan administratif Loket baru aktif saat Petugas
                      Loket penerima melakukan handover digital.
                    </p>

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button variant="outline" asChild>
                        <Link href={index()}>Batal</Link>
                      </Button>
                      <Button disabled={processing}>
                        Buat alokasi pending
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}

CreateAllocation.layout = {
  breadcrumbs: [
    { title: "Distribusi / Alokasi", href: index() },
    { title: "Buat alokasi", href: create() },
  ],
};
