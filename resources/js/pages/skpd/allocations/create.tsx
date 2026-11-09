import { Form, Head, Link } from '@inertiajs/react';
import { Boxes, Info } from 'lucide-react';
import { useState } from 'react';
import SkpdAllocationController from '@/actions/App/Http/Controllers/SkpdAllocationController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { formatQuantity, formatRange } from '@/components/inventory/format';
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
import { create, index } from '@/routes/skpd/allocations';
import { create as boxCreate } from '@/routes/skpd/boxes';

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
    defaults: { skpd_box_id: number | null; allocation_date: string };
};

export default function CreateAllocation({ boxes, lokets, defaults }: Props) {
    const [boxId, setBoxId] = useState(
        defaults.skpd_box_id ? defaults.skpd_box_id.toString() : '',
    );
    const [loketId, setLoketId] = useState('');
    const [allocationDate, setAllocationDate] = useState(
        defaults.allocation_date,
    );
    const [numeratorStart, setNumeratorStart] = useState('');
    const [numeratorEnd, setNumeratorEnd] = useState('');
    const selectedBox = boxes.find((box) => box.id.toString() === boxId);

    return (
        <>
            <Head title="Buat Alokasi SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke daftar alokasi' }}
                    title="Buat Alokasi SKPD"
                    description="Pilih Box, tentukan Loket penerima, lalu masukkan rentang Nomerator. Jumlah set dihitung otomatis dan diperiksa kembali oleh sistem saat disimpan."
                />

                {boxes.length === 0 ? (
                    <Card className="max-w-3xl">
                        <CardContent>
                            <EmptyState
                                icon={Boxes}
                                title="Tidak ada Box yang masih tersedia."
                                description="Semua Box sudah dialokasikan. Daftarkan Box baru, atau batalkan alokasi yang masih menunggu handover, sebelum membuat alokasi berikutnya."
                                action={
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Kembali</Link>
                                        </Button>
                                        <Button asChild>
                                            <Link href={boxCreate()}>
                                                Tambah Box
                                            </Link>
                                        </Button>
                                    </div>
                                }
                            />
                        </CardContent>
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
                                        <FormErrorSummary
                                            errors={errors}
                                            fields={[
                                                'skpd_box_id',
                                                'loket_id',
                                                'allocation_date',
                                                'numerator_start',
                                                'numerator_end',
                                            ]}
                                            title="Alokasi belum dapat dibuat."
                                        />

                                        <div className="grid gap-2">
                                            <Label htmlFor="skpd_box_id">
                                                Box SKPD
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="skpd_box_id"
                                                value={boxId}
                                            />
                                            <Select
                                                value={boxId}
                                                onValueChange={setBoxId}
                                            >
                                                <SelectTrigger
                                                    id="skpd_box_id"
                                                    className="w-full"
                                                    aria-invalid={Boolean(
                                                        errors.skpd_box_id,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Pilih Box SKPD" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {boxes.map((box) => (
                                                        <SelectItem
                                                            key={box.id}
                                                            value={box.id.toString()}
                                                        >
                                                            {box.box_number} ·{' '}
                                                            {formatRange(
                                                                box.numerator_start,
                                                                box.numerator_end,
                                                            )}{' '}
                                                            ·{' '}
                                                            {formatQuantity(
                                                                box.available_quantity,
                                                            )}{' '}
                                                            set tersedia
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.skpd_box_id}
                                            />
                                        </div>

                                        {selectedBox ? (
                                            <DetailList className="bg-muted rounded-xl p-4">
                                                <DetailRow
                                                    label="Rentang Box"
                                                    value={formatRange(
                                                        selectedBox.numerator_start,
                                                        selectedBox.numerator_end,
                                                    )}
                                                    mono
                                                />
                                                <DetailRow
                                                    label="Masih tersedia"
                                                    value={`${formatQuantity(selectedBox.available_quantity)} dari ${formatQuantity(selectedBox.total_sets)} set`}
                                                    numeric
                                                />
                                            </DetailList>
                                        ) : null}

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
                                                    disabled={
                                                        lokets.length === 0
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="loket_id"
                                                        className="w-full"
                                                        aria-invalid={Boolean(
                                                            errors.loket_id,
                                                        )}
                                                    >
                                                        <SelectValue
                                                            placeholder={
                                                                lokets.length ===
                                                                0
                                                                    ? 'Belum ada Loket aktif'
                                                                    : 'Pilih Loket'
                                                            }
                                                        />
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
                                                    message={
                                                        errors.allocation_date
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <RangeInputFields
                                            numeratorStart={numeratorStart}
                                            numeratorEnd={numeratorEnd}
                                            onNumeratorStartChange={
                                                setNumeratorStart
                                            }
                                            onNumeratorEndChange={
                                                setNumeratorEnd
                                            }
                                            errors={errors}
                                            bounds={
                                                selectedBox
                                                    ? {
                                                          start: selectedBox.numerator_start,
                                                          end: selectedBox.numerator_end,
                                                      }
                                                    : null
                                            }
                                        />

                                        <p className="text-muted-foreground flex gap-3 rounded-xl border p-4 text-sm">
                                            <Info className="mt-0.5 size-4 shrink-0" />
                                            <span>
                                                Setelah dibuat, alokasi
                                                berstatus{' '}
                                                <strong className="text-foreground">
                                                    Menunggu handover
                                                </strong>
                                                . Persediaan Loket baru aktif
                                                setelah Petugas Loket penerima
                                                menerimanya.
                                            </span>
                                        </p>

                                        <div className="flex flex-wrap justify-end gap-3">
                                            <Button variant="outline" asChild>
                                                <Link href={index()}>
                                                    Kembali
                                                </Link>
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                {processing
                                                    ? 'Menyimpan...'
                                                    : 'Buat alokasi'}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

CreateAllocation.layout = {
    breadcrumbs: [
        { title: 'Distribusi / Alokasi', href: index() },
        { title: 'Buat alokasi', href: create() },
    ],
};
