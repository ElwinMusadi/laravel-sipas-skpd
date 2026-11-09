import { Form } from '@inertiajs/react';
import { type ReactNode, useState } from 'react';
import FormErrorSummary from '@/components/form-error-summary';
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
    action: RouteDefinition<'post' | 'put' | 'patch' | 'delete'>;
    trigger: ReactNode;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    processingLabel?: string;
    errorTitle: string;
    destructive?: boolean;
    children?: ReactNode;
};

/**
 * Asks for confirmation before submitting an action that cannot be undone and
 * shows any business-rule error returned by the server inside the dialog.
 */
export function ConfirmActionDialog({
    action,
    trigger,
    title,
    description,
    confirmLabel,
    processingLabel = 'Memproses...',
    errorTitle,
    destructive = false,
    children,
}: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form
                    action={action}
                    className="grid gap-4"
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing, errors }) => (
                        <>
                            {children}
                            <FormErrorSummary
                                errors={errors}
                                title={errorTitle}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Kembali
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant={
                                        destructive ? 'destructive' : 'default'
                                    }
                                    disabled={processing}
                                >
                                    {processing
                                        ? processingLabel
                                        : confirmLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
