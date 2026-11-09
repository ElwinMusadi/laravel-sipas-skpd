import { AlertTriangle, ClipboardCheck, Clock3, FileText } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { DashboardMetric } from './dashboard-data';

const metricIcons = {
    today: FileText,
    waiting: Clock3,
    in_progress: ClipboardCheck,
    discrepancy: AlertTriangle,
};

export function DashboardMetrics({
    metrics,
}: {
    metrics: readonly DashboardMetric[];
}) {
    return (
        <section
            aria-label="Ringkasan pekerjaan"
            className="grid gap-4 sm:grid-cols-2"
        >
            {metrics.map((metric) => {
                const Icon = metricIcons[metric.id];

                return (
                    <Card key={metric.id} size="sm" className="rounded-xl">
                        <CardHeader className="gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <CardDescription>
                                    {metric.label}
                                </CardDescription>
                                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                                    <Icon className="size-4" />
                                </span>
                            </div>
                            <CardTitle className="text-2xl font-semibold tabular-nums">
                                {metric.value}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground text-xs">
                            {metric.description}
                        </CardContent>
                    </Card>
                );
            })}
        </section>
    );
}
