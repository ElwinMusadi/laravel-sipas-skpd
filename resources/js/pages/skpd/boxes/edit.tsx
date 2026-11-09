import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import SkpdBoxController from '@/actions/App/Http/Controllers/SkpdBoxController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { formatQuantity, formatRange } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, index, show } from '@/routes/skpd/boxes';

type Props = {
    box: {
        id: number;
        box_number: string;
        numerator_start: number;
        numerator_end: number;
        total_sets: number;
        central_storage_location: string;
        received_at: string;
    };
};

export default function EditBox({ box }: Props) {
    const [receivedAt, setReceivedAt] = useState(box.received_at);

    return (
        <>
            <Head title={`Ubah ${box.box_number}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: show(box.id),
                        label: `Kembali ke ${box.box_number}`,
                    }}
                    title="Ubah Metadata Box"
                    description="Rentang Nomerator dan jumlah set tidak dapat diubah setelah Box didaftarkan agar catatan persediaan tetap konsisten."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...SkpdBoxController.update.form(box.id)}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={[
                                            'box_number',
                                            'central_storage_location',
                                            'received_at',
                                        ]}
                                        title="Metadata Box belum dapat disimpan."
                                    />

                                    <DetailList className="bg-muted rounded-xl p-4">
                                        <DetailRow
                                            label="Rentang Nomerator"
                                            value={formatRange(
                                                box.numerator_start,
                                                box.numerator_end,
                                            )}
                                            mono
                                        />
                                        <DetailRow
                                            label="Jumlah set"
                                            value={`${formatQuantity(box.total_sets)} set`}
                                            numeric
                                        />
                                    </DetailList>

                                    <div className="grid gap-2">
                                        <Label htmlFor="box_number">
                                            Nomor / referensi Box
                                        </Label>
                                        <Input
                                            id="box_number"
                                            name="box_number"
                                            defaultValue={box.box_number}
                                            required
                                            autoComplete="off"
                                            aria-invalid={Boolean(
                                                errors.box_number,
                                            )}
                                        />
                                        <InputError
                                            message={errors.box_number}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="central_storage_location">
                                            Lokasi penyimpanan pusat
                                        </Label>
                                        <Input
                                            id="central_storage_location"
                                            name="central_storage_location"
                                            defaultValue={
                                                box.central_storage_location
                                            }
                                            required
                                            maxLength={100}
                                            aria-invalid={Boolean(
                                                errors.central_storage_location,
                                            )}
                                        />
                                        <InputError
                                            message={
                                                errors.central_storage_location
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2 sm:max-w-xs">
                                        <Label htmlFor="received_at">
                                            Tanggal diterima
                                        </Label>
                                        <DatePicker
                                            id="received_at"
                                            name="received_at"
                                            value={receivedAt}
                                            onChange={setReceivedAt}
                                            placeholder="Pilih tanggal"
                                            invalid={Boolean(
                                                errors.received_at,
                                            )}
                                            disabledDays={{ after: new Date() }}
                                            clearable={false}
                                        />
                                        <InputError
                                            message={errors.received_at}
                                        />
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={show(box.id)}>
                                                Kembali
                                            </Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Simpan metadata'}
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

EditBox.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Box SKPD', href: index() },
        { title: props.box.box_number, href: show(props.box.id) },
        { title: 'Ubah metadata', href: edit(props.box.id) },
    ],
});
