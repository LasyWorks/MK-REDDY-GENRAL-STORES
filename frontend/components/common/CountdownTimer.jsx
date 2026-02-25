"use client";

import { useState, useEffect } from "react";

/**
 * CountdownTimer – shows remaining time until `endsAt`.
 * Auto-updates every second. Disappears when time reaches 0.
 *
 * Props:
 *   endsAt    – ISO date string
 *   className – additional tailwind classes
 *   compact   – if true, show "2h 15m" instead of boxes
 *   themeColor – optional hex for styling
 */
export default function CountdownTimer({ endsAt, className = "", compact = false, themeColor }) {
  const [diff, setDiff] = useState(() => Math.max(0, new Date(endsAt) - new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, new Date(endsAt) - new Date());
      setDiff(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (diff <= 0) return null;

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  if (compact) {
    let text = "";
    if (days > 0) text = `${days}d ${hours}h`;
    else if (hours > 0) text = `${hours}h ${mins}m`;
    else text = `${mins}m ${secs}s`;
    return (
      <span className={`font-mono text-xs font-bold ${className}`} style={themeColor ? { color: themeColor } : {}}>
        {text}
      </span>
    );
  }

  const blocks = [];
  if (days > 0)  blocks.push({ val: days, label: "D" });
  blocks.push({ val: hours, label: "H" });
  blocks.push({ val: mins, label: "M" });
  blocks.push({ val: secs, label: "S" });

  const bg = themeColor || "#FF6B00";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {blocks.map((b, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="text-white text-[10px] font-bold leading-none px-1.5 py-1 rounded"
            style={{ backgroundColor: bg }}>
            {String(b.val).padStart(2, "0")}
          </span>
          <span className="text-[8px] text-gray-400 font-semibold mt-0.5">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
