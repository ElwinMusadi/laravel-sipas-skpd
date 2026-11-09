import { Link, type InertiaLinkProps } from '@inertiajs/react';
import type { Key, ReactNode } from 'react';
import { formatQuantity } from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type LaporanRecapColumn<T> = {
    id: string;
    header: string;
    value: (row: T) => number;
    /** Footer total; the Total row renders only when every column has one. */
    total?: number;
    /** Bold figures, for a row-total column. */
    emphasis?: boolean;
};

type Props<T> = {
    rows: T[];
    columns: LaporanRecapColumn<T>[];
    getRowKey: (row: T) => Key;
    getLoket: (row: T) => string;
    /** The same report filtered to the row's Loket. */
    detailHref: (row: T) => NonNullable<InertiaLinkProps['href']>;
    detailLabel: string;
    caption: string;
    empty: ReactNode;
    /** Minimum table width so the quantity columns do not squash. */
    minWidthClassName?: string;
};

/**
 * Per-Loket recap of a Laporan Sistem: a table with an optional Total row on
 * wide screens and when printing, stacked cards on phones.
 */
export function LaporanRecapTable<T>({
    rows,
    columns,
    getRowKey,
    getLoket,
    detailHref,
    detailLabel,
    caption,
    empty,
    minWidthClassName,
}: Props<T>) {
    if (rows.length === 0) {
        return <>{empty}</>;
    }

    const hasTotals = columns.every((column) => column.total !== undefined);

    const detailLink = (row: T) => (
        <Button variant="outline" size="sm" asChild>
            <Link
                href={detailHref(row)}
                preserveScroll
                aria-label={`${detailLabel} ${getLoket(row)}`}
            >
                {detailLabel}
            </Link>
        </Button>
    );

    return (
        <>
            <div className="hidden overflow-x-auto lg:block" data-print-table>
                <Table className={minWidthClassName}>
                    <caption className="sr-only">{caption}</caption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Loket</TableHead>
                            {columns.map((column) => (
                                <TableHead
                                    key={column.id}
                                    className="text-right"
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                            <TableHead className="text-right" data-print-action>
                                <span className="sr-only">Aksi</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={getRowKey(row)}>
                                <TableCell className="font-medium">
                                    {getLoket(row)}
                                </TableCell>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            'text-right tabular-nums',
                                            column.emphasis && 'font-medium',
                                        )}
                                    >
                                        {formatQuantity(column.value(row))}
                                    </TableCell>
                                ))}
                                <TableCell
                                    className="text-right"
                                    data-print-action
                                >
                                    {detailLink(row)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    {hasTotals ? (
                        <TableFooter>
                            <TableRow>
                                <TableCell>Total</TableCell>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className="text-right tabular-nums"
                                    >
                                        {formatQuantity(column.total ?? 0)}
                                    </TableCell>
                                ))}
                                <TableCell data-print-action />
                            </TableRow>
                        </TableFooter>
                    ) : null}
                </Table>
            </div>

            <ul className="grid gap-3 lg:hidden" data-print-mobile>
                {rows.map((row) => (
                    <li key={getRowKey(row)} className="rounded-lg border p-4">
                        <p className="font-medium break-words">
                            {getLoket(row)}
                        </p>
                        <RecapFigures
                            columns={columns}
                            value={(column) => column.value(row)}
                        />
                        <div className="mt-3 flex justify-end border-t pt-3">
                            {detailLink(row)}
                        </div>
                    </li>
                ))}
                {hasTotals ? (
                    <li className="bg-muted/50 rounded-lg border p-4">
                        <p className="font-medium">Total</p>
                        <RecapFigures
                            columns={columns}
                            value={(column) => column.total ?? 0}
                        />
                    </li>
                ) : null}
            </ul>
        </>
    );
}

function RecapFigures<T>({
    columns,
    value,
}: {
    columns: LaporanRecapColumn<T>[];
    value: (column: LaporanRecapColumn<T>) => number;
}) {
    return (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {columns.map((column) => (
                <div key={column.id} className="min-w-0">
                    <dt className="text-muted-foreground text-xs">
                        {column.header}
                    </dt>
                    <dd className="font-medium tabular-nums">
                        {formatQuantity(value(column))}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
