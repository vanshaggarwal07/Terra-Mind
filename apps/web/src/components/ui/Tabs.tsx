"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  className,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  className?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={className}>
      <div
        className="flex gap-1 border-b border-white/10 mb-4"
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors focus-brass",
              t.id === active
                ? "text-text-hi border-brass font-medium"
                : "text-text-low border-transparent hover:text-text-mid",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
