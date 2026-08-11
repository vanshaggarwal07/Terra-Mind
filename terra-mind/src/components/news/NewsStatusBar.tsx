"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type SyncStatus = {
  lastSyncedAt: string | null;
  lastSyncOk: boolean | null;
  counts: { government: number; news: number; x: number; total: number };
};

function relativeFrom(iso: string | null, now: number): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function NewsStatusBar({
  status,
  unavailable,
}: {
  status: SyncStatus | null;
  unavailable: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const counts = status?.counts ?? {
    government: 0,
    news: 0,
    x: 0,
    total: 0,
  };
  const live = !unavailable && status?.lastSyncOk !== false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-steel-line bg-panel px-3.5 py-1.5 text-xs font-medium text-dim shadow-sm">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            live
              ? "bg-growth shadow-[0_0_8px_color-mix(in_srgb,var(--growth)_70%,transparent)]"
              : "bg-dim",
          )}
          aria-hidden
        />
        {live ? "Live archive" : "Status offline"}
      </span>

      <StatPill label="Govt" value={counts.government} dot="bg-growth" />
      <StatPill label="News" value={counts.news} dot="bg-steel" />
      <StatPill label="X" value={counts.x} dot="bg-signal" />
      <StatPill label="Total" value={counts.total} dot="bg-foreground" />

      <span className="text-xs text-dim">
        {unavailable ? (
          "Status unavailable"
        ) : (
          <>
            Synced{" "}
            <span className="font-medium text-foreground">
              {relativeFrom(status?.lastSyncedAt ?? null, now)}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-dim">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      {label}
      <span className="font-data tabular-nums text-foreground">{value}</span>
    </span>
  );
}
