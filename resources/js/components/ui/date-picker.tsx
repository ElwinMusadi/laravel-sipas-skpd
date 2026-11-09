import { format, parseISO } from 'date-fns';
import { id as indonesian } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import type { Matcher } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Lets a `<Label htmlFor>` point at the trigger button. */
    id?: string;
    /** Renders a hidden input so plain `<Form>` submissions include the date. */
    name?: string;
    'aria-label'?: string;
    disabled?: boolean;
    invalid?: boolean;
    /** Dates that cannot be picked, e.g. `{ after: new Date() }`. */
    disabledDays?: Matcher | Matcher[];
    /** Hide the "Hapus tanggal" action for required fields. */
    clearable?: boolean;
    className?: string;
};

/**
 * The single date field of the app: Indonesian long date ("10 November 2026"),
 * month/year dropdowns, and a `yyyy-MM-dd` value.
 */
export function DatePicker({
    value,
    onChange,
    placeholder,
    id,
    name,
    'aria-label': ariaLabel,
    disabled = false,
    invalid = false,
    disabledDays,
    clearable = true,
    className,
}: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const selectedDate = value === '' ? undefined : parseISO(value);

    return (
        <>
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-label={ariaLabel}
                        aria-invalid={invalid || undefined}
                        disabled={disabled}
                        className={cn(
                            'w-full justify-between font-normal',
                            value === '' && 'text-muted-foreground',
                            invalid && 'border-destructive',
                            className,
                        )}
                    >
                        {selectedDate
                            ? format(selectedDate, 'd MMMM yyyy', {
                                  locale: indonesian,
                              })
                            : placeholder}
                        <CalendarIcon data-icon="inline-end" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            setOpen(false);
                        }}
                        defaultMonth={selectedDate}
                        disabled={disabledDays}
                        locale={indonesian}
                        captionLayout="dropdown"
                    />
                    {clearable && selectedDate ? (
                        <div className="border-t p-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <X data-icon="inline-start" />
                                Hapus tanggal
                            </Button>
                        </div>
                    ) : null}
                </PopoverContent>
            </Popover>
        </>
    );
}
