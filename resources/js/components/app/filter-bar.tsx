import { Search, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ALL = '__all__';

type FilterBarProps = {
    onSubmit: () => void;
    onReset: () => void;
    activeCount: number;
    children: ReactNode;
    submitLabel?: string;
};

/**
 * Filter card shared by list pages: labelled fields that flow in one row while
 * they fit and wrap otherwise, one submit button, and a reset button that is
 * only enabled while filters are applied.
 */
export function FilterBar({
    onSubmit,
    onReset,
    activeCount,
    children,
    submitLabel = 'Terapkan',
}: FilterBarProps) {
    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <Card data-print-hidden>
            <CardContent>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-wrap items-end gap-3"
                >
                    {children}
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <Button type="submit" className="flex-1 sm:flex-none">
                            {submitLabel}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onReset}
                            disabled={activeCount === 0}
                        >
                            <X />
                            Reset
                            {activeCount > 0 ? (
                                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
                                    {activeCount}
                                </span>
                            ) : null}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

type FieldProps = {
    id: string;
    label: string;
    className?: string;
};

export function FilterSearch({
    id,
    label,
    value,
    onChange,
    placeholder,
    className,
}: FieldProps & {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div className={cn('grid min-w-0 flex-[2_1_14rem] gap-1.5', className)}>
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    id={id}
                    type="search"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="pl-9"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

export function FilterSelect({
    id,
    label,
    value,
    onChange,
    options,
    allLabel,
    className,
}: FieldProps & {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    allLabel: string;
}) {
    return (
        <div className={cn('grid min-w-0 flex-[1_1_12rem] gap-1.5', className)}>
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            <Select
                value={value === '' ? ALL : value}
                onValueChange={(next) => onChange(next === ALL ? '' : next)}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={allLabel} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>{allLabel}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * Wraps any other control (for example a DateField) with the same label style.
 */
export function FilterField({
    id,
    label,
    className,
    children,
}: FieldProps & { children: ReactNode }) {
    return (
        <div className={cn('grid min-w-0 flex-[1_1_12rem] gap-1.5', className)}>
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            {children}
        </div>
    );
}
