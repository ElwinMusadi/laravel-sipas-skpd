import { Form, Head, Link } from '@inertiajs/react';
import LoketController from '@/actions/App/Http/Controllers/LoketController';
import { PageHeader } from '@/components/app/page-header';
import FormErrorSummary from '@/components/form-error-summary';
import { LoketFormFields } from '@/components/lokets/loket-form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { create, index } from '@/routes/lokets';

export default function CreateLoket() {
    return (
        <>
            <Head title="Tambah Loket" />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{ href: index(), label: 'Kembali ke Master Loket' }}
                    title="Tambah Loket"
                    description="Loket baru langsung aktif dan dapat dipakai untuk penugasan, alokasi, serta BAP baru."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...LoketController.store.form()}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={['code', 'name', 'description']}
                                        title="Loket belum dapat disimpan."
                                    />
                                    <LoketFormFields errors={errors} />
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
                                                : 'Simpan Loket'}
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

CreateLoket.layout = {
    breadcrumbs: [
        { title: 'Master Loket', href: index() },
        { title: 'Tambah Loket', href: create() },
    ],
};
