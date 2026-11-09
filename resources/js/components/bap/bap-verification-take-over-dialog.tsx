import { Form } from '@inertiajs/react';
import { UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import FormErrorSummary from '@/components/form-error-summary';
import { formatDateTime } from '@/components/inventory/format';
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
import type { RouteDefinition } from '@/wayfinder';

type Props = {
    action: RouteDefinition<'post'>;
    stageLabel: string;
    verifierName: string;
    startedAt: string;
};

/**
 * Lets a colleague with the same verifier role continue a check that another
 * verifier started but cannot finish.
 */
export function BapVerificationTakeOverDialog({
    action,
    stageLabel,
    verifierName,
    startedAt,
}: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Alert>
            <UserRoundCog />
            <AlertTitle>
                {stageLabel} sedang ditangani {verifierName}
            </AlertTitle>
            <AlertDescription className="grid gap-3">
                <p>
                    Pemeriksaan dimulai {formatDateTime(startedAt)}. Jika
                    petugas tersebut berhalangan, Anda dapat mengambil alih dan
                    menyelesaikan pemeriksaan ini.
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-fit">
                            Ambil alih pemeriksaan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ambil alih pemeriksaan?</DialogTitle>
                            <DialogDescription>
                                {stageLabel} akan dialihkan dari {verifierName}{' '}
                                kepada Anda. Hanya Anda yang dapat
                                menyelesaikannya setelah ini, dan pengalihan
                                dicatat pada audit log.
                            </DialogDescription>
                        </DialogHeader>
                        <Form action={action} className="grid gap-4">
                            {({ processing, errors }) => (
                                <>
                                    <FormErrorSummary
                                        errors={errors}
                                        title="Pemeriksaan tidak dapat diambil alih."
                                    />
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                            >
                                                Kembali
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Memproses...'
                                                : 'Ya, ambil alih'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </AlertDescription>
        </Alert>
    );
}
