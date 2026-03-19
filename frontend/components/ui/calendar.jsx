"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 font-[Inter,var(--font-geist-sans),sans-serif]", className)}
      classNames={{
        months: "flex flex-col gap-5 sm:flex-row sm:gap-6",
        month: "space-y-3",
        month_caption: "relative mb-3 flex items-center justify-center",
        caption_label: "text-sm font-semibold text-[#111827]",
        nav: "flex items-center gap-1",
        button_previous: "absolute left-1 h-8 w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition-all duration-150 hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
        button_next: "absolute right-1 h-8 w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition-all duration-150 hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 rounded-md text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]",
        week: "mt-1 flex w-full",
        cell: "relative h-10 w-10 p-0 text-center text-sm [&:has(>.rdp-day_range_end)]:rounded-r-full [&:has(>.rdp-day_range_start)]:rounded-l-full [&:has(>.rdp-day_selected)]:rounded-full [&:has(>.rdp-day_range_middle)]:bg-[#EEF2FF]",
        day: "h-10 w-10 p-0 text-center",
        day_button: "h-10 w-10 rounded-full border-0 bg-transparent p-0 font-medium text-[#111827] transition-all duration-150 hover:bg-[#EEF2FF] hover:text-[#4338CA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
        day_range_start: "bg-[#4F46E5] text-white hover:bg-[#4F46E5] hover:text-white",
        day_range_end: "bg-[#4F46E5] text-white hover:bg-[#4F46E5] hover:text-white",
        day_selected: "bg-[#4F46E5] text-white hover:bg-[#4F46E5] hover:text-white",
        day_today: "ring-1 ring-[#A5B4FC]",
        day_outside: "text-[#D1D5DB]",
        day_disabled: "text-[#D1D5DB]",
        day_range_middle: "rounded-none bg-[#EEF2FF] text-[#3730A3]",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
