"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled,
  required = false,
  maxDate,
  minDate,
  align = "start",
  enableMonthYearDropdown = true,
  yearsBack = 120,
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const label = selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder;

  const toYear = useMemo(() => {
    if (maxDate instanceof Date && !Number.isNaN(maxDate.getTime())) {
      return maxDate.getFullYear();
    }
    return new Date().getFullYear();
  }, [maxDate]);

  const fromYear = useMemo(() => {
    if (minDate instanceof Date && !Number.isNaN(minDate.getTime())) {
      return minDate.getFullYear();
    }
    return toYear - Math.max(1, Number(yearsBack || 120));
  }, [minDate, toYear, yearsBack]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-required={required}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-gray-200 bg-white px-3 text-left font-normal text-gray-900 hover:bg-gray-50",
            !selectedDate && "text-gray-500",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
            <span className="truncate">{label}</span>
          </span>
          {selectedDate && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange?.("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange?.("");
                }
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear date"
            >
              <XMarkIcon className="h-4 w-4" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange?.(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          captionLayout={enableMonthYearDropdown ? "dropdown" : "label"}
          fromYear={fromYear}
          toYear={toYear}
          disabled={{
            after: maxDate,
            before: minDate,
          }}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  );
}
