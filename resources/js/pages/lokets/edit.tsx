import { Form, Head, Link } from '@inertiajs/react';
import LoketController from '@/actions/App/Http/Controllers/LoketController';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import {
    LoketFormFields,
    type LoketFormData,
} from '@/components/lokets/loket-form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { edit, index, show } from '@/routes/lokets';

type Props = { loket: LoketFormData };

export default function EditLoket({ loket }: Props) {
    return (
        <>
            <Head title={`Ubah ${loket.name}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: show(loket.id),
                        label: `Kembali ke ${loket.name}`,
                    }}
                    title="Ubah Loket"
                    description="Loket hanya dapat dinonaktifkan bila tidak ada pengguna yang masih ditugaskan padanya."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...LoketController.update.form(loket.id)}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={[
                                            'code',
                                            'name',
                                            'description',
                                            'is_active',
                                        ]}
                                        title="Perubahan Loket belum dapat disimpan."
                                    />
                                    <LoketFormFields
                                        loket={loket}
                                        errors={errors}
                                        includeStatus
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={show(loket.id)}>
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

EditLoket.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Master Loket', href: index() },
        { title: props.loket.name, href: show(props.loket.id) },
        { title: 'Ubah', href: edit(props.loket.id) },
    ],
});
