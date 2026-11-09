import { History } from 'lucide-react';
import { formatDateTime } from '@/components/inventory/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ActivityEntry = {
    id: number;
    event: string;
    actor: string;
    created_at: string;
};

/**
 * The latest audit entries of a Box, allocation, or Loket, newest first.
 */
export function RecentActivityCard({ entries }: { entries: ActivityEntry[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="text-muted-foreground size-4" />
                    Riwayat singkat
                </CardTitle>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Belum ada riwayat yang dapat ditampilkan.
                    </p>
                ) : (
                    <ol className="divide-y">
                        {entries.map((entry) => (
                            <li
                                key={entry.id}
                                className="py-3 first:pt-0 last:pb-0"
                            >
                                <p className="font-medium">{entry.event}</p>
                                <p className="text-muted-foreground text-sm">
                                    {entry.actor} ·{' '}
                                    <time dateTime={entry.created_at}>
                                        {formatDateTime(entry.created_at)}
                                    </time>
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
