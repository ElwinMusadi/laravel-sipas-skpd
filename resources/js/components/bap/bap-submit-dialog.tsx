import { Form } from '@inertiajs/react';
import { useState } from 'react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import { formatQuantity, formatRange } from '@/components/inventory/format';
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
        loket: { name: string };
        service_date: string;
        numerator_start: number;
        numerator_end: number;
        total_usage: number;
        online_usage_count: number;
    };
};

export function BapSubmitDialog({ bap }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Ajukan BAP</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajukan BAP SKPD?</DialogTitle>
                    <DialogDescription>
                        Setelah diajukan, data Loket, tanggal, nomerator, total,
                        dan pemakaian online menjadi read-only hingga workflow
                        verifikasi pada fase berikutnya.
                    </DialogDescription>
                </DialogHeader>
                <dl className="bg-muted grid gap-3 rounded-xl p-4 text-sm">
                    <ReviewLine label="Loket" value={bap.loket.name} />
                    <ReviewLine label="Tanggal" value={bap.service_date} />
                    <ReviewLine
                        label="Nomerator"
                        value={formatRange(
                            bap.numerator_start,
                            bap.numerator_end,
                        )}
                        mono
                    />
                    <ReviewLine
                        label="Total"
                        value={`${formatQuantity(bap.total_usage)} set`}
                    />
                    <ReviewLine
                        label="Online"
                        value={`${formatQuantity(bap.online_usage_count)} set`}
                    />
                </dl>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Kembali</Button>
                    </DialogClose>
                    <Form action={SkpdBapController.submit(bap.id)}>
                        {({ processing }) => (
                            <Button disabled={processing}>
                                Konfirmasi ajukan
                            </Button>
                        )}
                    </Form>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ReviewLine({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
                className={`text-right font-medium ${mono ? 'font-mono text-xs whitespace-nowrap' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}
