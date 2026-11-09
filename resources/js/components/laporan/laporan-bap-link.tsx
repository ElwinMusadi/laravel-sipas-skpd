import { Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as showBap } from '@/routes/baps';

/**
 * Row action that opens the source BAP of a report line in the app.
 */
export function LaporanBapLink({
    bapId,
    documentNumber,
}: {
    bapId: number;
    documentNumber: string;
}) {
    return (
        <Button variant="ghost" size="icon" asChild>
            <Link
                href={showBap(bapId)}
                aria-label={`Lihat BAP ${documentNumber}`}
                title="Lihat BAP sumber"
            >
                <Eye />
            </Link>
        </Button>
    );
}
