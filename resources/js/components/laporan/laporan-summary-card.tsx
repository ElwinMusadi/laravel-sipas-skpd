import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function LaporanSummaryCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card>
            <CardHeader className="gap-1">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
                {description}
            </CardContent>
        </Card>
    );
}
