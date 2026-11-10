import { Link, type InertiaLinkProps } from '@inertiajs/react';
import type { Key, ReactNode } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
    id: string;
    header: string;
    cell: (row: T) => ReactNode;
    /** Right-aligned with tabular figures, for quantities. */
    numeric?: boolean;
    /** Monospace cells, for Nomerator ranges and codes; applies to the card too. */
    mono?: boolean;
    /**
     * A status badge column: fixed width and centered; a long label wraps
     * inside the badge instead of widening the column.
     */
    status?: boolean;
    /**
     * Secondary detail shown as a table column only on wide screens (2xl and
     * up) so common laptop widths fit without scrolling; cards always show it.
     */
    wideOnly?: boolean;
    align?: 'left' | 'center' | 'right';
    className?: string;
    headerClassName?: string;
    /**
     * How the column appears on the mobile card: `title` and `subtitle` head the
     * card, `badge` sits top-right, `field` is a labelled value, `hidden` is
     * omitted. Defaults to `field`.
     */
    mobile?: 'title' | 'subtitle' | 'badge' | 'field' | 'hidden';
};

type Props<T> = {
    rows: T[];
    columns: DataTableColumn<T>[];
    getRowKey: (row: T) => Key;
    /** Row actions, in the last column of the table and the foot of a card. */
    actions?: (row: T) => ReactNode;
    actionsHeader?: string;
    /** Makes the title column a link to the record. */
    rowHref?: (row: T) => NonNullable<InertiaLinkProps['href']>;
    empty: ReactNode;
    /** Minimum table width class so columns do not squash, e.g. `min-w-240`. */
    minWidthClassName?: string;
    /** Below this width rows render as cards. */
    breakpoint?: 'md' | 'lg' | 'xl';
    caption?: string;
};

const tableVisibility = {
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
} as const;

const cardVisibility = {
    md: 'md:hidden',
    lg: 'lg:hidden',
    xl: 'xl:hidden',
} as const;

const alignClassName = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
} as const;

const statusColumnClassName =
    'w-42 min-w-42 text-center [&_[data-slot=badge]]:h-auto [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:py-1 [&_[data-slot=badge]]:text-center [&_[data-slot=badge]]:leading-tight [&_[data-slot=badge]]:whitespace-normal';

function headerAlign<T>(column: DataTableColumn<T>): string {
    return cn(
        column.status
            ? statusColumnClassName
            : column.numeric
              ? 'text-right'
              : alignClassName[column.align ?? 'left'],
        column.wideOnly && 'hidden 2xl:table-cell',
    );
}

function cellAlign<T>(column: DataTableColumn<T>): string {
    return cn(
        column.status
            ? statusColumnClassName
            : cn(
                  column.numeric
                      ? 'text-right tabular-nums'
                      : alignClassName[column.align ?? 'left'],
                  column.mono && 'font-mono text-xs whitespace-nowrap',
              ),
        column.wideOnly && 'hidden 2xl:table-cell',
    );
}

/**
 * Responsive list: a table on wide screens and stacked cards on phones, both
 * built from one column definition so the two views never drift apart.
 */
export function DataTable<T>({
    rows,
    columns,
    getRowKey,
    actions,
    actionsHeader = 'Aksi',
    rowHref,
    empty,
    minWidthClassName,
    breakpoint = 'lg',
    caption,
}: Props<T>) {
    if (rows.length === 0) {
        return <>{empty}</>;
    }

    const titleColumns = columns.filter((column) => column.mobile === 'title');
    const subtitleColumns = columns.filter(
        (column) => column.mobile === 'subtitle',
    );
    const badgeColumns = columns.filter((column) => column.mobile === 'badge');
    const fieldColumns = columns.filter(
        (column) => (column.mobile ?? 'field') === 'field',
    );

    return (
        <>
            <div
                className={cn(tableVisibility[breakpoint], 'min-w-0')}
                data-print-table
            >
                <Table className={minWidthClassName}>
                    {caption ? (
                        <caption className="sr-only">{caption}</caption>
                    ) : null}
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {columns.map((column) => (
                                <TableHead
                                    key={column.id}
                                    className={cn(
                                        headerAlign(column),
                                        column.headerClassName,
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                            {actions ? (
                                <TableHead
                                    className="text-right"
                                    data-print-action
                                >
                                    <span className="sr-only">
                                        {actionsHeader}
                                    </span>
                                </TableHead>
                            ) : null}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={getRowKey(row)}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            cellAlign(column),
                                            column.className,
                                        )}
                                    >
                                        {rowHref &&
                                        column.mobile === 'title' ? (
                                            <Link
                                                href={rowHref(row)}
                                                className="hover:underline"
                                            >
                                                {column.cell(row)}
                                            </Link>
                                        ) : (
                                            column.cell(row)
                                        )}
                                    </TableCell>
                                ))}
                                {actions ? (
                                    <TableCell
                                        className="w-px text-right"
                                        data-print-action
                                    >
                                        <div className="flex justify-end gap-1">
                                            {actions(row)}
                                        </div>
                                    </TableCell>
                                ) : null}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ul
                className={cn(
                    cardVisibility[breakpoint],
                    'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3',
                )}
                data-print-mobile
            >
                {rows.map((row) => (
                    <li
                        key={getRowKey(row)}
                        className="min-w-0 rounded-lg border p-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-0.5">
                                {titleColumns.map((column) => (
                                    <div
                                        key={column.id}
                                        className="font-medium [overflow-wrap:anywhere]"
                                    >
                                        {rowHref ? (
                                            <Link
                                                href={rowHref(row)}
                                                className="hover:underline"
                                            >
                                                {column.cell(row)}
                                            </Link>
                                        ) : (
                                            column.cell(row)
                                        )}
                                    </div>
                                ))}
                                {subtitleColumns.map((column) => (
                                    <div
                                        key={column.id}
                                        className="text-muted-foreground text-sm break-words"
                                    >
                                        {column.cell(row)}
                                    </div>
                                ))}
                            </div>
                            {badgeColumns.length > 0 ? (
                                <div className="flex max-w-[50%] shrink-0 flex-col items-end gap-1 text-right [&_[data-slot=badge]]:h-auto [&_[data-slot=badge]]:py-0.5 [&_[data-slot=badge]]:text-right [&_[data-slot=badge]]:leading-tight [&_[data-slot=badge]]:whitespace-normal">
                                    {badgeColumns.map((column) => (
                                        <div key={column.id}>
                                            {column.cell(row)}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {fieldColumns.length > 0 ? (
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {fieldColumns.map((column) => (
                                    <div key={column.id} className="min-w-0">
                                        <dt className="text-muted-foreground text-xs">
                                            {column.header}
                                        </dt>
                                        <dd
                                            className={cn(
                                                'break-words',
                                                column.numeric &&
                                                    'tabular-nums',
                                                column.mono &&
                                                    'font-mono text-xs',
                                            )}
                                        >
                                            {column.cell(row)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        ) : null}

                        {actions ? (
                            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                                {actions(row)}
                            </div>
                        ) : null}
                    </li>
                ))}
            </ul>
        </>
    );
}
