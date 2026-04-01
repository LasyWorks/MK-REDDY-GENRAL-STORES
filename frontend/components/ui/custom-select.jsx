"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  buttonClassName = "",
  contentClassName = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const item = options.find((opt) => opt.value === value);
    return item?.label || placeholder;
  }, [options, placeholder, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`inline-flex min-w-[156px] items-center justify-between gap-2 rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-left text-[13px] text-gray-600 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className={`w-[var(--radix-popover-trigger-width)] p-1 ${contentClassName}`}>
        <div className="max-h-72 overflow-auto py-0.5">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                type="button"
                key={opt.value || "__empty"}
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                } ${opt.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
