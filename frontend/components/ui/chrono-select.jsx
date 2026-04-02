"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  yearRange = [1970, 2050],
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value);
  const [month, setMonth] = React.useState(value ?? new Date());

  React.useEffect(() => {
    setSelected(value);
    setMonth(value ?? new Date());
  }, [value]);

  const years = React.useMemo(() => {
    const [start, end] = yearRange;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [yearRange]);

  const handleSelect = (date) => {
    setSelected(date);
    setOpen(false);
    onChange?.(date);
  };

  const handleYearChange = (year) => {
    const newYear = parseInt(year, 10);
    const newDate = new Date(month);
    newDate.setFullYear(newYear);
    setMonth(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-start rounded-xl border-gray-200 bg-white text-left font-normal text-gray-900 hover:bg-gray-50",
            !selected && "text-gray-500",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[300px] space-y-3 p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-gray-700">{format(month, "MMMM yyyy")}</span>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          classNames={{
            month_caption: "relative mx-10 mb-3 flex h-9 items-center justify-center",
            nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1",
            button_previous:
              "!static pointer-events-auto h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
            button_next:
              "!static pointer-events-auto h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
          }}
          className="rounded-md border"
        />
        <div className="border-t border-gray-100 pt-2">
          <Select
            value={String(month.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="start"
              sideOffset={6}
              className="z-[80] max-h-56 border border-gray-200 bg-white shadow-xl"
            >
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
