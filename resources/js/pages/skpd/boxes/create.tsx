import { Form, Head, Link } from "@inertiajs/react";
import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import SkpdBoxController from "@/actions/App/Http/Controllers/SkpdBoxController";
import InputError from "@/components/input-error";
import { RangeInputFields } from "@/components/inventory/range-input-fields";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Heading from "@/components/heading";
import { cn } from "@/lib/utils";
import { create, index } from "@/routes/skpd/boxes";

export default function CreateBox() {
  const [numeratorStart, setNumeratorStart] = useState("");
  const [numeratorEnd, setNumeratorEnd] = useState("");
  const [receivedAt, setReceivedAt] = useState<Date | undefined>(new Date());

  return (
    <>
      <Head title="Tambah Box SKPD" />

      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <Heading
          title="Tambah Box SKPD"
          description="Daftarkan range nomerator penerimaan pusat. Quantity akan dihitung dari rentang yang valid."
        />

        <Card className="max-w-3xl">
          <CardContent>
            <Form {...SkpdBoxController.store.form()} className="space-y-6">
              {({ errors, processing }) => (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="box_number">Nomor / referensi Box</Label>
                    <Input
                      id="box_number"
                      name="box_number"
                      placeholder="BOX-SKPD-001"
                      aria-invalid={Boolean(errors.box_number)}
                    />
                    <InputError message={errors.box_number} />
                  </div>

                  <RangeInputFields
                    numeratorStart={numeratorStart}
                    numeratorEnd={numeratorEnd}
                    onNumeratorStartChange={setNumeratorStart}
                    onNumeratorEndChange={setNumeratorEnd}
                    errors={errors}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="received_at">Tanggal diterima</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !receivedAt && "text-muted-foreground",
                            errors.received_at &&
                              "border-destructive text-destructive",
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {receivedAt ? (
                            format(receivedAt, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={receivedAt}
                          onSelect={setReceivedAt}
                          locale={id}
                        />
                      </PopoverContent>
                    </Popover>
                    <input
                      type="hidden"
                      name="received_at"
                      value={receivedAt ? format(receivedAt, "yyyy-MM-dd") : ""}
                    />
                    <InputError message={errors.received_at} />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" asChild>
                      <Link href={index()}>Batal</Link>
                    </Button>
                    <Button disabled={processing}>Daftarkan Box</Button>
                  </div>
                </>
              )}
            </Form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

CreateBox.layout = {
  breadcrumbs: [
    { title: "Box SKPD", href: index() },
    { title: "Tambah Box", href: create() },
  ],
};
