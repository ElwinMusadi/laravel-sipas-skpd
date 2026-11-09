import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
    title: string;
    description?: ReactNode;
    back?: { href: NonNullable<InertiaLinkProps['href']>; label: string };
    badges?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
};

/**
 * The one page heading pattern: optional back link, the page `h1` with status
 * badges, a short description, and the page actions that wrap on small screens.
 */
export function PageHeader({
    title,
    description,
    back,
    badges,
    meta,
    actions,
}: Props) {
    return (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 space-y-2">
                {back ? (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto w-fit p-0 hover:no-underline"
                        data-print-hidden
                        asChild
                    >
                        <Link href={back.href}>
                            <ArrowLeft />
                            {back.label}
                        </Link>
                    </Button>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight break-words">
                        {title}
                    </h1>
                    {badges}
                </div>
                {description ? (
                    <p className="text-muted-foreground max-w-3xl text-sm text-pretty">
                        {description}
                    </p>
                ) : null}
                {meta}
            </div>
            {actions ? (
                <div
                    className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end"
                    data-print-hidden
                >
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
