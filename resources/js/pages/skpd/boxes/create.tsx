import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import SkpdBoxController from '@/actions/App/Http/Controllers/SkpdBoxController';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { RangeInputFields } from '@/components/inventory/range-input-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { create, index } from '@/routes/skpd/boxes';

type Props = {
    defaults: { received_at: string };
};

export default function CreateBox({ defaults }: Props) {
    const [numeratorStart, setNumeratorStart] = useState('');
    const [numeratorEnd, setNumeratorEnd] = useState('');
    const [receivedAt, setReceivedAt] = useState(defaults.received_at);

    return (
        <>
            <Head title="Tambah Box SKPD" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Box SKPD' }}
                    title="Tambah Box SKPD"
                    description="Daftarkan rentang Nomerator Box yang diterima pusat. Jumlah set dihitung otomatis dari rentang tersebut."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...SkpdBoxController.store.form()}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={[
                                            'box_number',
                                            'numerator_start',
                                            'numerator_end',
                                            'received_at',
                                        ]}
                                        title="Box belum dapat didaftarkan."
                                    />

                                    <div className="grid gap-2">
                                        <Label htmlFor="box_number">
                                            Nomor / referensi Box
                                        </Label>
                                        <Input
                                            id="box_number"
                                            name="box_number"
                                            required
                                            autoComplete="off"
                                            placeholder="BOX-SKPD-001"
                                            aria-invalid={Boolean(
                                                errors.box_number,
                                            )}
                                        />
                                        <InputError
                                            message={errors.box_number}
                                        />
                                    </div>

                                    <RangeInputFields
                                        numeratorStart={numeratorStart}
                                        numeratorEnd={numeratorEnd}
                                        onNumeratorStartChange={
                                            setNumeratorStart
                                        }
                                        onNumeratorEndChange={setNumeratorEnd}
                                        errors={errors}
                                    />

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
                                            <Link href={index()}>Kembali</Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan...'
                                                : 'Daftarkan Box'}
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

CreateBox.layout = {
    breadcrumbs: [
        { title: 'Box SKPD', href: index() },
        { title: 'Tambah Box', href: create() },
    ],
};
