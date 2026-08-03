"use client";

import { useEffect, useState } from "react";

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-line/80 pb-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="inline-flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          <span
            className={
              live
                ? "size-1.5 shrink-0 rounded-full bg-growth shadow-[0_0_10px_color-mix(in_srgb,var(--growth)_70%,transparent)]"
                : "size-1.5 shrink-0 rounded-full bg-dim"
            }
            aria-hidden
          />
          {live ? "Live archive" : "Status offline"}
        </span>
        <Metric label="Govt" value={counts.government} tone="text-growth" />
        <Metric label="News" value={counts.news} tone="text-steel" />
        <Metric label="X" value={counts.x} tone="text-signal" />
        <Metric label="Total" value={counts.total} tone="text-foreground" />
      </div>
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
        {unavailable ? (
          "Status unavailable"
        ) : (
          <>
            Synced{" "}
            <span className="text-foreground">
              {relativeFrom(status?.lastSyncedAt ?? null, now)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <span className="font-data text-[10px] uppercase tracking-[0.14em] text-dim">
      <span className={tone}>{label}</span>{" "}
      <span className="text-foreground tabular-nums">{value}</span>
    </span>
  );
}
