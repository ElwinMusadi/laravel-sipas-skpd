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
    /** Monospace, for Nomerator ranges and codes; applies to the card too. */
    mono?: boolean;
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
    /** Row actions; kept visible at the right edge while the table scrolls. */
    actions?: (row: T) => ReactNode;
    actionsHeader?: string;
    /** Makes the mobile card title a link to the record. */
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

function columnAlign<T>(column: DataTableColumn<T>): string {
    return cn(
        column.numeric
            ? 'text-right tabular-nums'
            : alignClassName[column.align ?? 'left'],
        column.mono && 'font-mono text-xs whitespace-nowrap',
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
                className={cn(tableVisibility[breakpoint], 'overflow-x-auto')}
                data-print-table
            >
                <Table className={minWidthClassName}>
                    {caption ? (
                        <caption className="sr-only">{caption}</caption>
                    ) : null}
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead
                                    key={column.id}
                                    className={cn(
                                        columnAlign(column),
                                        column.headerClassName,
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                            {actions ? (
                                <TableHead
                                    className="bg-card sticky right-0 text-right"
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
                            <TableRow key={getRowKey(row)} className="group">
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            columnAlign(column),
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
                                        className="bg-card group-hover:bg-muted/50 sticky right-0 text-right"
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
                className={cn(cardVisibility[breakpoint], 'grid gap-3')}
                data-print-mobile
            >
                {rows.map((row) => (
                    <li key={getRowKey(row)} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-0.5">
                                {titleColumns.map((column) => (
                                    <div
                                        key={column.id}
                                        className="font-medium break-words"
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
                                <div className="flex shrink-0 flex-col items-end gap-1">
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
