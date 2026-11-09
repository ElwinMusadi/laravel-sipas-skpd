import { router } from '@inertiajs/react';
import { useState } from 'react';

type FilterValues = Record<string, string>;

/**
 * State for a list page filter form. `initial` is what the server applied, so
 * the active count reflects the list on screen, not unsaved edits.
 */
export function useIndexFilters<T extends FilterValues>(
    url: string,
    initial: T,
) {
    const [values, setValues] = useState<T>(initial);

    const set = <K extends keyof T>(key: K, value: T[K]): void => {
        setValues((current) => ({ ...current, [key]: value }));
    };

    const visit = (query: Partial<T>): void => {
        router.get(url, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const apply = (): void => {
        visit(
            Object.fromEntries(
                Object.entries(values).filter(([, value]) => value !== ''),
            ) as Partial<T>,
        );
    };

    const reset = (): void => {
        const cleared = Object.fromEntries(
            Object.keys(values).map((key) => [key, '']),
        ) as T;

        setValues(cleared);
        visit({});
    };

    const activeCount = Object.values(initial).filter(
        (value) => value !== '',
    ).length;

    return { values, set, apply, reset, activeCount };
}
