"use client";

import * as React from "react";
import { ChronoSelect } from "@/components/ui/chrono-select";

export default function ChronoSelectDemo() {
  const [date, setDate] = React.useState();

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Date Picker Demo</h1>

      <ChronoSelect
        value={date}
        onChange={setDate}
        yearRange={[1990, 2035]}
      />

      {date && (
        <p className="text-sm text-muted-foreground">
          You selected: {date.toDateString()}
        </p>
      )}
    </div>
  );
}
