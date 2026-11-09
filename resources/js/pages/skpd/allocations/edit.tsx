import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import SkpdAllocationController from '@/actions/App/Http/Controllers/SkpdAllocationController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { formatNomerator, formatRange } from '@/components/inventory/format';
import { RangeInputFields } from '@/components/inventory/range-input-fields';
import type { LoketOption } from '@/components/inventory/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { edit, index, show } from '@/routes/skpd/allocations';

type Props = {
    allocation: {
        id: number;
        box: {
            box_number: string;
            numerator_start: number;
            numerator_end: number;
        };
        loket_id: number;
        allocation_date: string | null;
        numerator_start: number;
        numerator_end: number;
    };
    lokets: LoketOption[];
};

export default function EditAllocation({ allocation, lokets }: Props) {
    const [loketId, setLoketId] = useState(allocation.loket_id.toString());
    const [allocationDate, setAllocationDate] = useState(
        allocation.allocation_date ?? '',
    );
    const [numeratorStart, setNumeratorStart] = useState(
        formatNomerator(allocation.numerator_start),
    );
    const [numeratorEnd, setNumeratorEnd] = useState(
        formatNomerator(allocation.numerator_end),
    );

    return (
        <>
            <Head title={`Ubah Alokasi ${allocation.box.box_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: show(allocation.id),
                        label: 'Kembali ke detail alokasi',
                    }}
                    title="Ubah Alokasi SKPD"
                    description="Loket penerima, tanggal, dan rentang dapat diubah selama alokasi masih menunggu handover. Box asal tidak dapat diganti."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...SkpdAllocationController.update.form(
                                allocation.id,
                            )}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={[
                                            'loket_id',
                                            'allocation_date',
                                            'numerator_start',
                                            'numerator_end',
                                        ]}
                                        title="Perubahan alokasi belum dapat disimpan."
                                    />

                                    <DetailList className="bg-muted rounded-xl p-4">
                                        <DetailRow
                                            label="Box asal"
                                            value={allocation.box.box_number}
                                        />
                                        <DetailRow
                                            label="Rentang Box"
                                            value={formatRange(
                                                allocation.box.numerator_start,
                                                allocation.box.numerator_end,
                                            )}
                                            mono
                                        />
                                    </DetailList>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="loket_id">
                                                Loket penerima
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="loket_id"
                                                value={loketId}
                                            />
                                            <Select
                                                value={loketId}
                                                onValueChange={setLoketId}
                                            >
                                                <SelectTrigger
                                                    id="loket_id"
                                                    className="w-full"
                                                    aria-invalid={Boolean(
                                                        errors.loket_id,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Pilih Loket" />
                                                </SelectTrigger>
                                                <SelectContent>
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
                                            <InputError
                                                message={errors.loket_id}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="allocation_date">
                                                Tanggal alokasi
                                            </Label>
                                            <DatePicker
                                                id="allocation_date"
                                                name="allocation_date"
                                                value={allocationDate}
                                                onChange={setAllocationDate}
                                                placeholder="Pilih tanggal"
                                                invalid={Boolean(
                                                    errors.allocation_date,
                                                )}
                                                clearable={false}
                                            />
                                            <InputError
                                                message={errors.allocation_date}
                                            />
                                        </div>
                                    </div>

                                    <RangeInputFields
                                        numeratorStart={numeratorStart}
                                        numeratorEnd={numeratorEnd}
                                        onNumeratorStartChange={
                                            setNumeratorStart
                                        }
                                        onNumeratorEndChange={setNumeratorEnd}
                                        errors={errors}
                                        bounds={{
                                            start: allocation.box
                                                .numerator_start,
                                            end: allocation.box.numerator_end,
                                        }}
                                    />

                                    <p className="text-muted-foreground rounded-xl border p-4 text-sm">
                                        Rentang tetap harus berada di dalam Box
                                        asal dan tidak boleh tumpang tindih
                                        dengan alokasi lain yang masih aktif.
                                    </p>

                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={show(allocation.id)}>
                                                Kembali
                                            </Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Simpan perubahan'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

EditAllocation.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Distribusi / Alokasi', href: index() },
        {
            title: `Alokasi ${props.allocation.box.box_number}`,
            href: show(props.allocation.id),
        },
        { title: 'Ubah', href: edit(props.allocation.id) },
    ],
});
