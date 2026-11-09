import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    FilterBar,
    FilterField,
    FilterSelect,
} from '@/components/app/filter-bar';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    laporanMonthOptions,
    type LaporanFilters,
    type LaporanLoketOption,
} from './laporan-filters';

type Props = {
    indexUrl: string;
    filters: LaporanFilters;
    lokets: LaporanLoketOption[];
};

/**
 * Period and Loket filter shared by every Laporan Sistem page. The form is
 * keyed by the page URL, so after any visit (apply, reset, or pagination) it
 * shows exactly the filters the server applied.
 */
export function LaporanFilterCard(props: Props) {
    const { url } = usePage();

    return <LaporanFilterForm key={url} url={url} {...props} />;
}

function LaporanFilterForm({
    url,
    indexUrl,
    filters,
    lokets,
}: Props & { url: string }) {
    const [month, setMonth] = useState(filters.month.toString());
    const [year, setYear] = useState(filters.year.toString());
    const [loket, setLoket] = useState(filters.loket?.toString() ?? '');

    function visit(query: Record<string, number>): void {
        router.get(indexUrl, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function applyFilters(): void {
        visit({
            month: Number(month),
            year: Number(year),
            ...(loket === '' ? {} : { loket: Number(loket) }),
        });
    }

    return (
        <FilterBar
            onSubmit={applyFilters}
            onReset={() => visit({})}
            activeCount={appliedFilterCount(url)}
        >
            <FilterField id="laporan-month" label="Bulan">
                <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger id="laporan-month" className="w-full">
                        <SelectValue placeholder="Pilih bulan" />
                    </SelectTrigger>
                    <SelectContent>
                        {laporanMonthOptions.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value.toString()}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FilterField>
            <FilterField id="laporan-year" label="Tahun">
                <Input
                    id="laporan-year"
                    type="number"
                    inputMode="numeric"
                    min={2000}
                    max={9999}
                    required
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="tabular-nums"
                />
            </FilterField>
            <FilterSelect
                id="laporan-loket"
                label="Loket"
                value={loket}
                onChange={setLoket}
                options={lokets.map((option) => ({
                    value: option.id.toString(),
                    label: option.name,
                }))}
                allLabel="Semua Loket"
            />
        </FilterBar>
    );
}

/**
 * Filters the user chose explicitly: the period (month and/or year) counts
 * once and the Loket once. Without them the server shows the current month.
 */
function appliedFilterCount(url: string): number {
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const hasPeriod = query.has('month') || query.has('year');
    const hasLoket = (query.get('loket') ?? '') !== '';

    return Number(hasPeriod) + Number(hasLoket);
}
