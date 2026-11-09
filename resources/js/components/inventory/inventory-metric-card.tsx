import { Link, type InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
    label: string;
    value: string;
    description?: string;
    icon: LucideIcon;
    /** Turns the whole card into a link to the list behind the figure. */
    href?: NonNullable<InertiaLinkProps['href']>;
    /** Visible call to action shown on a linked card, e.g. "Lihat alokasi". */
    linkLabel?: string;
};

export function InventoryMetricCard({
    label,
    value,
    description,
    icon: Icon,
    href,
    linkLabel = 'Lihat daftar',
}: Props) {
    const card = (
        <Card
            size="sm"
            className={cn(
                'h-full',
                href &&
                    'group-hover:ring-primary/30 transition-shadow group-hover:shadow-lg',
            )}
        >
            <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">
                        {value}
                    </p>
                    {description ? (
                        <p className="text-muted-foreground text-xs">
                            {description}
                        </p>
                    ) : null}
                    {href ? (
                        <p className="text-primary inline-flex items-center gap-1 pt-1 text-xs font-medium group-hover:underline">
                            {linkLabel}
                            <ArrowRight className="size-3" />
                        </p>
                    ) : null}
                </div>
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-4" />
                </span>
            </CardContent>
        </Card>
    );

    if (!href) {
        return card;
    }

    return (
        <Link
            href={href}
            className="group focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
        >
            {card}
        </Link>
    );
}
