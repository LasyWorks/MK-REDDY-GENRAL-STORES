"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatRangeLabel(range) {
  if (!range?.from) return "All Time";
  if (!range.to) return format(range.from, "MMM d, yyyy");
  return `${format(range.from, "MMM d")} -> ${format(range.to, "MMM d")}`;
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  numberOfMonths = 1,
  className,
  placeholder = "All Time",
}) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(value);

  const today = useMemo(() => new Date(), []);

  const normalizeRange = (range) => {
    if (!range?.from) return range;
    const from = range.from;
    const to = range.to && range.to > today ? today : range.to;
    return { from, to };
  };

  const applyPreset = (preset) => {
    if (preset === "allTime") {
      setDraftRange(undefined);
      return;
    }
    if (preset === "today") {
      setDraftRange({ from: startOfDay(today), to: endOfDay(today) });
      return;
    }
    if (preset === "last7") {
      setDraftRange({
        from: startOfDay(subDays(today, 6)),
        to: endOfDay(today),
      });
      return;
    }
    if (preset === "thisMonth") {
      setDraftRange({ from: startOfMonth(today), to: endOfDay(today) });
    }
  };

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setDraftRange(normalizeRange(value)));
    }
  }, [value, open]);

  const triggerLabel = useMemo(() => {
    if (!value?.from) return "All Time";
    if (!value?.to) return format(value.from, "MMM d, yyyy");
    return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
  }, [placeholder, value]);

  const handleCancel = () => {
    setDraftRange(value);
    setOpen(false);
  };

  const handleApply = () => {
    onChange?.(normalizeRange(draftRange));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-start gap-2 rounded-xl border-[#E5E7EB] bg-white px-3 text-left font-normal text-[#111827]",
            className,
          )}
        >
          <CalendarDaysIcon className="h-4 w-4 text-[#6B7280]" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[min(94vw,380px)] rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-lg"
      >
        <div className="font-[var(--font-geist-sans),system-ui,sans-serif]">
          <div className="border-b border-gray-200 px-5 py-4">
            <p className="text-lg font-semibold tracking-tight text-gray-900">
              Select Date Range
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {formatRangeLabel(draftRange)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={() => applyPreset("allTime")}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-100 hover:border-gray-400 active:scale-95"
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-100 hover:border-gray-400 active:scale-95"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last7")}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-100 hover:border-gray-400 active:scale-95"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-100 hover:border-gray-400 active:scale-95"
            >
              This Month
            </button>
          </div>

          <div className="p-4">
            <Calendar
              mode="range"
              numberOfMonths={numberOfMonths}
              selected={draftRange}
              onSelect={(range) => setDraftRange(normalizeRange(range))}
              defaultMonth={draftRange?.from}
              disabled={{ after: today }}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
            <p className="truncate text-sm font-medium text-gray-700">
              {formatRangeLabel(draftRange)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg px-4 text-gray-700 hover:bg-gray-100"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 rounded-lg bg-blue-500 px-4 text-white hover:bg-blue-600 transition-colors"
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
