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
        month_caption: "relative mb-3 flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold text-[#111827]",
        nav: "pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between",
        button_previous: "!static pointer-events-auto h-8 w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-all duration-150 hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
        button_next: "!static pointer-events-auto h-8 w-8 rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-all duration-150 hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#4F46E5]",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday: "rounded-md text-center text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]",
        week: "mt-1 grid grid-cols-7 gap-1 w-full",
        cell: "relative h-10 p-0 text-center text-xs",
        day: "h-10 w-full p-0 text-center",
        day_button: "mx-auto h-9 w-9 rounded-full border-0 bg-transparent p-0 text-[13px] font-medium leading-none text-[#111827] transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
        day_range_start: "rounded-full bg-[#BFDBFE] text-[#1E3A8A]",
        day_range_end: "rounded-full bg-[#BFDBFE] text-[#1E3A8A]",
        day_selected: "bg-[#BFDBFE] text-[#1E3A8A]",
        day_today: "rounded-full border border-[#93C5FD] bg-[#F8FBFF] text-[#1E3A8A]",
        day_outside: "text-[#D1D5DB]",
        day_disabled: "text-[#D1D5DB]",
        day_range_middle: "rounded-full bg-[#EAF2FF] text-[#1E3A8A]",
        range_start: "rounded-full bg-[#BFDBFE] text-[#1E3A8A]",
        range_end: "rounded-full bg-[#BFDBFE] text-[#1E3A8A]",
        range_middle: "rounded-full bg-[#EAF2FF] text-[#1E3A8A]",
        selected: "bg-[#BFDBFE] text-[#1E3A8A]",
        outside: "text-[#D1D5DB]",
        disabled: "text-[#D1D5DB]",
        today: "rounded-full border border-[#93C5FD] bg-[#F8FBFF] text-[#1E3A8A]",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
