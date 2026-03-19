"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatRangeLabel(range) {
  if (!range?.from) return "Select date range";
  if (!range.to) return format(range.from, "MMM d, yyyy");
  return `${format(range.from, "MMM d")} -> ${format(range.to, "MMM d")}`;
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  numberOfMonths = 1,
  className,
  placeholder = "Select date range",
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
    if (preset === "today") {
      setDraftRange({ from: startOfDay(today), to: endOfDay(today) });
      return;
    }
    if (preset === "last7") {
      setDraftRange({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
      return;
    }
    if (preset === "thisMonth") {
      setDraftRange({ from: startOfMonth(today), to: endOfDay(today) });
    }
  };

  useEffect(() => {
    if (!open) {
      setDraftRange(normalizeRange(value));
    }
  }, [value, open]);

  const triggerLabel = useMemo(() => {
    if (!value?.from) return placeholder;
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
            className
          )}
        >
          <CalendarDaysIcon className="h-4 w-4 text-[#6B7280]" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[min(94vw,380px)] rounded-[20px] border border-white/10 bg-slate-900/90 p-0 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div className="font-[Inter,var(--font-geist-sans),sans-serif]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-base font-semibold tracking-tight">Select Date Range</p>
            <p className="mt-1 text-sm text-slate-300">{formatRangeLabel(draftRange)}</p>
          </div>

          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last7")}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
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
              className="premium-range-picker"
              classNames={{
                month: "space-y-3",
                month_caption: "relative mb-3 flex items-center justify-center",
                caption_label: "text-sm font-semibold text-white",
                button_previous:
                  "absolute left-1 h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10",
                button_next:
                  "absolute right-1 h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10",
                head_cell:
                  "w-10 rounded-md text-[11px] font-semibold uppercase tracking-wide text-slate-400",
                cell:
                  "relative h-10 w-10 p-0 text-center text-sm [&:has(>.rdp-day_range_end)]:rounded-r-full [&:has(>.rdp-day_range_start)]:rounded-l-full [&:has(>.rdp-day_range_middle)]:bg-[#EEF2FF]/35",
                day:
                  "h-10 w-10 p-0 text-center",
                day_button:
                  "h-10 w-10 rounded-full border-0 bg-transparent p-0 text-slate-100 transition-all duration-150 hover:bg-[#EEF2FF]/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
                day_range_start: "bg-[#4F46E5] text-white hover:bg-[#4F46E5]",
                day_range_end: "bg-[#4F46E5] text-white hover:bg-[#4F46E5]",
                day_selected: "bg-[#4F46E5] text-white hover:bg-[#4F46E5]",
                day_range_middle: "rounded-none bg-[#EEF2FF]/35 text-slate-100",
                day_today: "ring-1 ring-[#A5B4FC]",
                day_outside: "text-slate-500",
                day_disabled: "text-slate-600",
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
            <p className="truncate text-sm font-medium text-slate-300">{formatRangeLabel(draftRange)}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-9 rounded-lg px-4 text-slate-300 hover:bg-white/10" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 text-white hover:brightness-110"
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
