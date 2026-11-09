import { Form, Head, Link } from '@inertiajs/react';
import DocumentOfficialController from '@/actions/App/Http/Controllers/DocumentOfficialController';
import { DocumentOfficialFormFields } from '@/components/document-officials/document-official-form-fields';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { create, index } from '@/routes/document-officials';

type Props = {
    roles: { value: string; label: string }[];
    defaults: { role: string | null; effective_from: string };
};

export default function CreateDocumentOfficial({ roles, defaults }: Props) {
    return (
        <>
            <Head title="Tambah Pejabat" />

            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <Heading
                    title="Tambah Pejabat Penandatangan"
                    description="Gunakan saat pejabat berganti. Data pejabat lama tetap tersimpan sehingga BAP lama tetap tercetak dengan pejabat pada masanya."
                />

                <Card className="max-w-3xl">
                    <CardContent className="pt-6">
                        <Form
                            {...DocumentOfficialController.store.form()}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <DocumentOfficialFormFields
                                        errors={errors}
                                        roles={roles}
                                        defaultRole={defaults.role}
                                        defaultEffectiveFrom={
                                            defaults.effective_from
                                        }
                                    />
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Batal</Link>
                                        </Button>
                                        <Button disabled={processing}>
                                            Simpan pejabat
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

CreateDocumentOfficial.layout = {
    breadcrumbs: [
        { title: 'Pejabat Penandatangan', href: index() },
        { title: 'Tambah pejabat', href: create() },
    ],
};
