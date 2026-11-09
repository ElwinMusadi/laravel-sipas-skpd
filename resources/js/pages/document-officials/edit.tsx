import { Form, Head, Link } from '@inertiajs/react';
import DocumentOfficialController from '@/actions/App/Http/Controllers/DocumentOfficialController';
import { PageHeader } from '@/components/app/page-header';
import {
    DocumentOfficialFormFields,
    documentOfficialFieldNames,
    type DocumentOfficialFormData,
} from '@/components/document-officials/document-official-form-fields';
import FormErrorSummary from '@/components/form-error-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { edit, index } from '@/routes/document-officials';

type Props = { official: DocumentOfficialFormData };

export default function EditDocumentOfficial({ official }: Props) {
    return (
        <>
            <Head title={`Ubah ${official.name}`} />

            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    back={{
                        href: index(),
                        label: 'Kembali ke Pejabat Penandatangan',
                    }}
                    title="Ubah Data Pejabat"
                    description="Gunakan untuk memperbaiki kesalahan penulisan. Untuk pergantian pejabat, tambahkan pejabat baru dengan tanggal mulai berlaku."
                />

                <Card className="max-w-3xl">
                    <CardContent>
                        <Form
                            {...DocumentOfficialController.update.form(
                                official.id,
                            )}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={documentOfficialFieldNames}
                                        title="Perubahan pejabat belum dapat disimpan."
                                    />
                                    <DocumentOfficialFormFields
                                        errors={errors}
                                        official={official}
                                    />
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

EditDocumentOfficial.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Pejabat Penandatangan', href: index() },
        {
            title: `Ubah ${props.official.name}`,
            href: edit(props.official.id),
        },
    ],
});
