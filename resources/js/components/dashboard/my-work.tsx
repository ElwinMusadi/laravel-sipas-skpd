import { Link } from '@inertiajs/react';
import { ArrowUpRight, ClipboardList } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { DashboardWorkItem } from './dashboard-data';
import { StatusBadge } from './status-badge';

export function MyWork({ items }: { items: readonly DashboardWorkItem[] }) {
    return (
        <Card className="rounded-xl">
            <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                        <ClipboardList className="size-4" />
                    </span>
                    <div>
                        <CardTitle>Tugas Saya</CardTitle>
                        <CardDescription>
                            Tugas yang perlu menjadi perhatian Anda.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="divide-y p-0">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href ?? '#'}
                        className="hover:bg-muted/50 flex items-start gap-3 px-6 py-4 transition-colors"
                    >
                        <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums">
                            {item.count}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{item.title}</p>
                                <StatusBadge status={item.status} />
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {item.description}
                            </p>
                        </div>
                        <ArrowUpRight
                            aria-hidden="true"
                            className="text-muted-foreground mt-1 size-4 shrink-0"
                        />
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
