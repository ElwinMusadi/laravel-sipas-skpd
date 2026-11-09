import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationLink } from '@/components/inventory/types';
import { Button } from '@/components/ui/button';
import { formatQuantity } from '@/components/inventory/format';

export type Paginator = {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

/**
 * "Menampilkan x–y dari z" plus Indonesian page navigation. Laravel puts the
 * previous and next links first and last; the numbered pages sit between.
 */
export function ListFooter({
    paginator,
    noun,
}: {
    paginator: Paginator;
    noun: string;
}) {
    if (paginator.total === 0) {
        return null;
    }

    const links = paginator.links;
    const previous = links[0];
    const next = links[links.length - 1];
    const pages = links.slice(1, -1);
    const hasMultiplePages = pages.length > 1;

    return (
        <div
            className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center"
            data-print-hidden
        >
            <p className="text-muted-foreground">
                Menampilkan {formatQuantity(paginator.from ?? 0)}–
                {formatQuantity(paginator.to ?? 0)} dari{' '}
                {formatQuantity(paginator.total)} {noun}
            </p>
            {hasMultiplePages ? (
                <nav
                    aria-label="Navigasi halaman"
                    className="flex flex-wrap items-center gap-1"
                >
                    <PageButton url={previous?.url ?? null} label="Sebelumnya">
                        <ChevronLeft />
                        <span className="sr-only sm:not-sr-only">
                            Sebelumnya
                        </span>
                    </PageButton>
                    {pages.map((link, index) =>
                        link.url === null ? (
                            <span
                                key={`gap-${index}`}
                                className="text-muted-foreground px-2"
                            >
                                …
                            </span>
                        ) : (
                            <PageButton
                                key={link.url}
                                url={link.url}
                                active={link.active}
                                label={`Halaman ${link.label}`}
                            >
                                {link.label}
                            </PageButton>
                        ),
                    )}
                    <PageButton url={next?.url ?? null} label="Berikutnya">
                        <span className="sr-only sm:not-sr-only">
                            Berikutnya
                        </span>
                        <ChevronRight />
                    </PageButton>
                </nav>
            ) : null}
        </div>
    );
}

function PageButton({
    url,
    active = false,
    label,
    children,
}: {
    url: string | null;
    active?: boolean;
    label: string;
    children: React.ReactNode;
}) {
    if (url === null) {
        return (
            <Button variant="outline" className="min-w-9" disabled>
                {children}
            </Button>
        );
    }

    return (
        <Button
            variant={active ? 'default' : 'outline'}
            className="min-w-9"
            asChild
        >
            <Link
                href={url}
                preserveScroll
                aria-label={label}
                aria-current={active ? 'page' : undefined}
            >
                {children}
            </Link>
        </Button>
    );
}
