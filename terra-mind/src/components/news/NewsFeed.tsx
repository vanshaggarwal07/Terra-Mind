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
          // `amount` bounds the total spread regardless of card count, so a
          // feed of 500+ items still finishes revealing in well under a second
          // instead of compounding into a multi-second per-card delay.
          gsap.from(".news-card", {
            opacity: 0,
            y: 18,
            duration: 0.5,
            stagger: { each: 0.03, amount: 0.4, from: "start" },
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
        <header className="news-masthead mt-6 md:mt-8">
          <div className="flex flex-col gap-8 border-b border-steel-line pb-8 md:flex-row md:items-end md:justify-between md:gap-10 md:pb-10">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-steel-line bg-panel px-4 py-1.5 text-sm text-dim shadow-sm">
                <span className="size-1.5 rounded-full bg-signal" aria-hidden />
                Live corridor signal feed
              </p>
              <h1 className="mt-5 font-display text-4xl leading-[1.08] tracking-tight text-foreground md:text-5xl">
                Corridor news, <span className="text-signal">without the noise.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-dim">
                Government notices and press signals across Noida, YEIDA, Jewar
                Airport, and the full ~100&nbsp;km ring — deduplicated and
                categorized as they land.
              </p>
            </div>

            <div className="shrink-0 rounded-3xl border border-steel-line bg-panel p-6 text-center soft-shadow md:text-right">
              <p className="font-display text-5xl tabular-nums tracking-tight text-foreground md:text-6xl">
                {filtered.length}
              </p>
              <p className="mt-1 max-w-[14rem] text-sm text-dim md:ml-auto">
                {deferredQuery || filter !== "all"
                  ? `of ${items.length} stored stories`
                  : "stories in the archive"}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <NewsStatusBar status={status} unavailable={statusNote} />
          </div>
        </header>

        <div className="sticky top-16 z-20 mt-6 rounded-3xl border border-steel-line bg-panel/90 p-3 shadow-sm backdrop-blur-md md:mt-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

            <label className="relative w-full shrink-0 md:w-64">
              <span className="sr-only">Search news</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keyword…"
                className="w-full rounded-full border border-steel-line bg-secondary/60 py-2.5 pl-10 pr-4 text-base text-foreground placeholder:text-dim outline-none transition-colors focus:border-signal focus:bg-panel md:text-sm"
              />
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-4 md:mt-10">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-steel-line bg-panel/40 px-6 py-20 text-center">
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
                <div className="grid gap-4 pt-1">
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
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors active:scale-[0.98]",
        active
          ? "bg-foreground text-background"
          : "bg-secondary text-dim hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
