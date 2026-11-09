import { Toaster } from '@/components/ui/sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';

/**
 * Renders the global toaster and shows `Inertia::flash('toast', ...)` messages
 * sent by the server after each visit.
 */
export default function FlashToaster() {
    useFlashToast();

    return <Toaster />;
}
