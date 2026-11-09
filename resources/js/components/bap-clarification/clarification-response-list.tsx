import { StatusBadge } from '@/components/app/status-badge';
import { ClarificationOutcomeBadge } from '@/components/bap-clarification/clarification-status';
import { formatDateTime } from '@/components/inventory/format';

export type ClarificationResponse = {
    id: number;
    round: number;
    response: string;
    responded_by: string;
    responded_at: string;
    resolution: {
        outcome: string;
        outcome_label: string;
        notes: string;
        resolved_by: string;
        resolved_at: string;
    } | null;
};

/**
 * Loket responses in order, each followed by the verifier decision on it, so
 * the conversation reads top to bottom.
 */
export function ClarificationResponseList({
    responses,
    emptyText = 'Belum ada tanggapan dari Loket.',
}: {
    responses: ClarificationResponse[];
    emptyText?: string;
}) {
    if (responses.length === 0) {
        return <p className="text-muted-foreground text-sm">{emptyText}</p>;
    }

    return (
        <ol className="grid gap-4">
            {responses.map((response) => (
                <li
                    key={response.id}
                    className="grid gap-3 rounded-xl border p-4 text-sm"
                >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-medium">
                                Tanggapan ke-{response.round}
                            </p>
                            <p className="text-muted-foreground">
                                {response.responded_by} ·{' '}
                                {formatDateTime(response.responded_at)}
                            </p>
                        </div>
                        {response.resolution ? (
                            <ClarificationOutcomeBadge
                                outcome={response.resolution.outcome}
                                fallbackLabel={
                                    response.resolution.outcome_label
                                }
                            />
                        ) : (
                            <StatusBadge
                                label="Menunggu tinjauan"
                                tone="info"
                            />
                        )}
                    </div>
                    <p className="whitespace-pre-wrap">{response.response}</p>
                    {response.resolution ? (
                        <div className="bg-muted/50 grid gap-1 rounded-lg border-l-4 p-3">
                            <p className="font-medium">Keputusan verifier</p>
                            <p className="whitespace-pre-wrap">
                                {response.resolution.notes}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {response.resolution.resolved_by} ·{' '}
                                {formatDateTime(
                                    response.resolution.resolved_at,
                                )}
                            </p>
                        </div>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}
