import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
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
    description: string;
};

export function LaporanFilterCard({
    indexUrl,
    filters,
    lokets,
    description,
}: Props) {
    const [month, setMonth] = useState(filters.month.toString());
    const [year, setYear] = useState(filters.year.toString());
    const [loket, setLoket] = useState(filters.loket?.toString() ?? 'all');

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            indexUrl,
            {
                month: Number(month),
                year: Number(year),
                loket: loket === 'all' ? undefined : Number(loket),
            },
            { preserveState: true, replace: true },
        );
    }

    function resetFilters() {
        router.get(indexUrl, {}, { preserveState: false, replace: true });
    }

    return (
        <Card data-print-hidden>
            <CardHeader>
                <CardTitle>Filter laporan</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={applyFilters}
                    className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_13rem_auto]"
                >
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger aria-label="Pilih bulan">
                            <SelectValue placeholder="Pilih bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {laporanMonthOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value.toString()}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        min="2000"
                        max="9999"
                        value={year}
                        onChange={(event) => setYear(event.target.value)}
                        aria-label="Pilih tahun"
                    />
                    <Select value={loket} onValueChange={setLoket}>
                        <SelectTrigger aria-label="Filter Loket">
                            <SelectValue placeholder="Semua Loket" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">Semua Loket</SelectItem>
                                {lokets.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id.toString()}
                                    >
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                        <Button type="submit">Tampilkan</Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={resetFilters}
                            aria-label="Reset filter laporan"
                        >
                            <X />
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
