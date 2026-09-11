import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: DatePickerProps) {
  const selectedDate = value === "" ? undefined : parseISO(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-between font-normal",
            value === "" && "text-muted-foreground",
            className,
          )}
        >
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: id }) : placeholder}
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          defaultMonth={selectedDate}
          locale={id}
          captionLayout="dropdown"
        />
        {selectedDate ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange("")}
            >
              <X data-icon="inline-start" />
              Hapus tanggal
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
