import { Form, Head, Link } from '@inertiajs/react';
import DocumentOfficialController from '@/actions/App/Http/Controllers/DocumentOfficialController';
import {
    DocumentOfficialFormFields,
    type DocumentOfficialFormData,
} from '@/components/document-officials/document-official-form-fields';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { edit, index } from '@/routes/document-officials';

type Props = { official: DocumentOfficialFormData };

export default function EditDocumentOfficial({ official }: Props) {
    return (
        <>
            <Head title={`Ubah ${official.name}`} />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <Heading
                    title="Ubah Data Pejabat"
                    description="Gunakan untuk memperbaiki kesalahan penulisan. Untuk pergantian pejabat, tambahkan pejabat baru dengan tanggal mulai berlaku."
                />

                <Card className="max-w-3xl">
                    <CardContent className="pt-6">
                        <Form
                            {...DocumentOfficialController.update.form(
                                official.id,
                            )}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <DocumentOfficialFormFields
                                        errors={errors}
                                        official={official}
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Batal</Link>
                                        </Button>
                                        <Button disabled={processing}>
                                            Simpan perubahan
                                        </Button>
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

EditDocumentOfficial.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Pejabat Penandatangan', href: index() },
        { title: 'Ubah pejabat', href: edit(props.official.id) },
    ],
});
