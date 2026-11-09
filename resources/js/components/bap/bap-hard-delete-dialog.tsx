import { useForm } from '@inertiajs/react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import {
    BapStatusBadge,
    type BapStatus,
} from '@/components/bap/bap-status-badge';
import { formatDate, formatRange } from '@/components/inventory/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    bap: {
        id: number;
        document_number: string;
        loket: { name: string };
        service_date: string;
        numerator_start: number;
        numerator_end: number;
        status: BapStatus;
    };
};

type HardDeleteForm = {
    confirmation_document_number: string;
    reason: string;
};

export function BapHardDeleteDialog({ bap }: Props) {
    const [open, setOpen] = useState(false);
    const form = useForm<HardDeleteForm>({
        confirmation_document_number: '',
        reason: '',
    });

    const resetForm = () => {
        form.reset();
        form.clearErrors();
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (!nextOpen) {
            resetForm();
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.delete(SkpdBapController.hardDelete.url(bap.id), {
            preserveScroll: true,
            onSuccess: () => {
                resetForm();
                setOpen(false);
            },
        });
    };

    const confirmationMatches =
        form.data.confirmation_document_number === bap.document_number;
    const reasonIsValid = form.data.reason.trim().length >= 10;
    const submitDisabled =
        !confirmationMatches || !reasonIsValid || form.processing;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 data-icon="inline-start" />
                    Hapus permanen
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Hapus permanen BAP SKPD?</DialogTitle>
                    <DialogDescription>
                        Tindakan khusus untuk menghapus BAP berstatus Selesai
                        Administratif. Ini berbeda dari penghapusan draft dan
                        tidak dapat dipulihkan.
                    </DialogDescription>
                </DialogHeader>

                <DetailList className="bg-muted rounded-xl p-4">
                    <DetailRow label="Nomor BAP" value={bap.document_number} />
                    <DetailRow label="Loket" value={bap.loket.name} />
                    <DetailRow
                        label="Tanggal pelayanan"
                        value={formatDate(bap.service_date)}
                    />
                    <DetailRow
                        label="Range Nomerator"
                        value={formatRange(
                            bap.numerator_start,
                            bap.numerator_end,
                        )}
                        mono
                    />
                    <DetailRow
                        label="Status"
                        value={<BapStatusBadge status={bap.status} />}
                    />
                </DetailList>

                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>Penghapusan ini permanen</AlertTitle>
                    <AlertDescription>
                        Seluruh riwayat verifikasi, klarifikasi, penerimaan, dan
                        laporan terkait ikut terhapus. Persediaan direkonsiliasi
                        otomatis oleh sistem setelah penghapusan.
                    </AlertDescription>
                </Alert>

                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmation_document_number">
                            Ketik ulang nomor BAP
                        </Label>
                        <p
                            id="confirmation_document_number-help"
                            className="text-muted-foreground text-xs"
                        >
                            Ketik persis{' '}
                            <span className="font-mono font-medium">
                                {bap.document_number}
                            </span>{' '}
                            untuk mengonfirmasi.
                        </p>
                        <Input
                            id="confirmation_document_number"
                            name="confirmation_document_number"
                            value={form.data.confirmation_document_number}
                            onChange={(event) =>
                                form.setData(
                                    'confirmation_document_number',
                                    event.target.value,
                                )
                            }
                            autoComplete="off"
                            aria-invalid={Boolean(
                                form.errors.confirmation_document_number,
                            )}
                            aria-describedby="confirmation_document_number-help confirmation_document_number-error"
                        />
                        <InputError
                            id="confirmation_document_number-error"
                            message={form.errors.confirmation_document_number}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="hard_delete_reason">
                            Alasan penghapusan
                        </Label>
                        <Textarea
                            id="hard_delete_reason"
                            name="reason"
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                            placeholder="Jelaskan alasan penghapusan permanen"
                            rows={4}
                            maxLength={1000}
                            aria-invalid={Boolean(form.errors.reason)}
                            aria-describedby="hard_delete_reason-help hard_delete_reason-error"
                        />
                        <p
                            id="hard_delete_reason-help"
                            className="text-muted-foreground text-xs"
                        >
                            Minimal 10 karakter setelah spasi awal dan akhir
                            dihapus.
                        </p>
                        <InputError
                            id="hard_delete_reason-error"
                            message={form.errors.reason}
                        />
                    </div>

                    <FormErrorSummary
                        errors={form.errors}
                        fields={['confirmation_document_number', 'reason']}
                        title="BAP tidak dapat dihapus permanen."
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
                            disabled={submitDisabled}
                        >
                            <Trash2 data-icon="inline-start" />
                            {form.processing
                                ? 'Menghapus...'
                                : 'Hapus permanen BAP'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
