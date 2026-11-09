export const laporanMonthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
] as const;

export type LaporanFilters = {
    month: number;
    year: number;
    loket: number | null;
};

export type LaporanLoketOption = {
    id: number;
    name: string;
};

export function formatLaporanPeriod(month: number, year: number): string {
    const option = laporanMonthOptions.find((item) => item.value === month);

    return `${option?.label ?? month} ${year}`;
}

/**
 * Query options shared by the report page, its exports, and Loket drill-downs.
 */
export function laporanQuery(filters: LaporanFilters, loket = filters.loket) {
    return {
        query: {
            month: filters.month,
            year: filters.year,
            ...(loket === null ? {} : { loket }),
        },
    };
}
