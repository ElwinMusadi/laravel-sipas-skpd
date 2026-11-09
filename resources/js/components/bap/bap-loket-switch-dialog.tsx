import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    /** The Loket the Superadmin picked; the dialog is open while set. */
    loketName: string | null;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Switching Loket reloads the create form for that Loket, which drops
 * everything typed so far. Ask first when the form already has input.
 */
export function BapLoketSwitchDialog({
    loketName,
    onConfirm,
    onCancel,
}: Props) {
    return (
        <Dialog
            open={loketName !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ganti Loket Pelayanan?</DialogTitle>
                    <DialogDescription>
                        Form akan dimuat ulang untuk {loketName}. Tanggal
                        pelayanan, range Nomerator, jumlah online, dan detail
                        Batal/Rusak yang sudah diisi akan dikosongkan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Kembali
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={onConfirm}>
                        Ganti Loket
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
