"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Search } from "lucide-react";

import { NEWS_CATEGORIES, type StoredNewsItem } from "@/lib/news/types";
import { cn } from "@/lib/utils";

import { NewsCard } from "./NewsCard";
import { NewsStatusBar } from "./NewsStatusBar";

type SyncStatus = {
  lastSyncedAt: string | null;
  lastSyncOk: boolean | null;
  counts: { government: number; news: number; x: number; total: number };
  error?: string;
};

type Props = {
  initialItems: StoredNewsItem[];
  initialStatus: SyncStatus | null;
  statusUnavailable?: boolean;
};

gsap.registerPlugin(useGSAP);

export function NewsFeed({
  initialItems,
  initialStatus,
  statusUnavailable = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [clientItems, setClientItems] = useState<StoredNewsItem[] | null>(null);
  const items = clientItems ?? initialItems;
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [status, setStatus] = useState<SyncStatus | null>(initialStatus);
  const [statusNote, setStatusNote] = useState(statusUnavailable);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter !== "all" && item.category !== filter) return false;
      if (!deferredQuery) return true;
      const haystack = `${item.headline}\n${item.body ?? ""}\n${item.sourceName}`
        .toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [filter, items, deferredQuery]);

  const lead = filtered[0] ?? null;
  const rest = filtered.slice(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, newsRes] = await Promise.all([
          fetch("/api/news/sync-status", { cache: "no-store" }),
          fetch("/api/news?limit=1000", { cache: "no-store" }),
        ]);
        if (statusRes.ok) {
          const data = (await statusRes.json()) as SyncStatus;
          if (!cancelled) {
            setStatus(data);
            setStatusNote(Boolean(data.error));
          }
        } else if (!cancelled) {
          setStatusNote(true);
        }
        if (newsRes.ok) {
          const data = (await newsRes.json()) as { items?: StoredNewsItem[] };
          if (!cancelled && Array.isArray(data.items) && data.items.length > 0) {
            setClientItems(data.items);
          }
        }
      } catch {
        if (!cancelled) setStatusNote(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          motionOk: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as {
            reduceMotion: boolean;
          };
          if (reduceMotion) {
            gsap.set(".news-card", { opacity: 1, y: 0 });
            gsap.set(".news-masthead", { opacity: 1, y: 0 });
            return;
          }
          gsap.from(".news-masthead", {
            opacity: 0,
            y: 20,
            duration: 0.55,
            ease: "power3.out",
          });
          gsap.from(".news-card", {
            opacity: 0,
            y: 18,
            duration: 0.5,
            stagger: 0.05,
            delay: 0.08,
            ease: "power2.out",
            clearProps: "transform",
          });
        },
      );
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [filtered.length, filter, deferredQuery] },
  );

  const emptyMessage = deferredQuery
    ? "No matches for that keyword"
    : filter === "all"
      ? "No updates stored yet"
      : "No updates in this category yet";

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-6xl px-4 md:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[28rem] w-[min(100%,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--signal)_14%,transparent),transparent_68%)] blur-2xl"
      />

      <div className="relative">
        <NewsStatusBar status={status} unavailable={statusNote} />

        <header className="news-masthead mt-8 grid gap-8 border-b border-steel-line pb-8 md:mt-10 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-end md:gap-10 md:pb-10">
          <div>
            <h1 className="font-display text-[2.35rem] font-medium leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
              Corridor
              <span className="text-signal"> signal</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim md:text-base">
              Live web and government updates across the Noida–YEIDA–Jewar core
              and the full ~100 km ring, including Dadri, Bulandshahr, Ghaziabad,
              Faridabad, and nearby districts. Every sync adds to the archive.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:items-end md:text-right">
            <p className="font-display text-5xl tabular-nums tracking-tight text-foreground md:text-6xl">
              {filtered.length}
            </p>
            <p className="max-w-[16rem] font-data text-[10px] uppercase tracking-[0.16em] text-dim">
              {deferredQuery || filter !== "all"
                ? `of ${items.length} stored stories`
                : "stories in the archive"}
            </p>
          </div>
        </header>

        <div className="sticky top-14 z-20 -mx-4 mt-6 border-y border-steel-line/80 bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
          <div className="flex flex-col gap-3">
            <div
              className="-mx-1 flex flex-wrap gap-2 px-1"
              role="tablist"
              aria-label="Filter by category"
            >
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="All"
              />
              {NEWS_CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat.id}
                  active={filter === cat.id}
                  onClick={() => setFilter(cat.id)}
                  label={cat.label}
                />
              ))}
            </div>

            <label className="relative w-full max-w-md">
              <span className="sr-only">Search news</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-dim"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keyword…"
                className="w-full border border-steel-line bg-panel/80 py-2.5 pl-9 pr-3 font-data text-[11px] text-foreground placeholder:text-dim/70 outline-none transition-[border-color,background-color] focus:border-signal focus:bg-panel"
              />
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-3 md:mt-10 md:space-y-4">
          {filtered.length === 0 ? (
            <div className="border border-dashed border-steel-line px-6 py-20 text-center">
              <p className="font-display text-xl text-foreground">
                {emptyMessage}
              </p>
              <p className="mt-2 text-sm text-dim">
                Try another category or clear the search.
              </p>
            </div>
          ) : (
            <>
              {lead ? <NewsCard key={lead.id} item={lead} featured /> : null}
              {rest.length > 0 ? (
                <div className="grid gap-3 pt-2 md:gap-3.5">
                  {rest.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 border px-3 py-2 font-data text-[10px] uppercase tracking-[0.16em] transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98]",
        active
          ? "border-signal bg-signal text-background"
          : "border-steel-line bg-transparent text-dim hover:border-steel hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
