import { Form } from '@inertiajs/react';
import { useState } from 'react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import FormErrorSummary from '@/components/form-error-summary';
import { formatRange } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
    bap: {
        id: number;
        document_number: string;
        loket: { name: string };
        numerator_start: number;
        numerator_end: number;
    };
};

export function BapDeleteDialog({ bap }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">Hapus draft</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus draft BAP SKPD?</DialogTitle>
                    <DialogDescription>
                        {bap.document_number} dari {bap.loket.name} dengan range{' '}
                        {formatRange(bap.numerator_start, bap.numerator_end)}{' '}
                        akan dihapus. Tindakan ini hanya tersedia sebelum ada
                        pembatalan, verifikasi, atau klarifikasi.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={SkpdBapController.destroy(bap.id)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <FormErrorSummary
                                errors={errors}
                                title="Draft BAP tidak dapat dihapus."
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Kembali
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    Hapus draft
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
