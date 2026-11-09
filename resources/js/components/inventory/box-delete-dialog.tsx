import { Form } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import SkpdBoxController from '@/actions/App/Http/Controllers/SkpdBoxController';
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
    box: {
        id: number;
        box_number: string;
        numerator_start: number;
        numerator_end: number;
    };
};

export function BoxDeleteDialog({ box }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 />
                    Hapus Box
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus Box yang belum digunakan?</DialogTitle>
                    <DialogDescription>
                        {box.box_number} (
                        {formatRange(box.numerator_start, box.numerator_end)})
                        hanya dapat dihapus bila belum memiliki alokasi atau
                        riwayat pemakaian. Penghapusan tetap tercatat di riwayat
                        audit.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={SkpdBoxController.destroy(box.id)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <FormErrorSummary
                                errors={errors}
                                title="Box tidak dapat dihapus."
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
                                    {processing ? 'Menghapus...' : 'Hapus Box'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
