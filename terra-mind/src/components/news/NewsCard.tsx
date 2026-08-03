"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import type { StoredNewsItem } from "@/lib/news/types";
import { cn } from "@/lib/utils";

function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function sourceRail(sourceType: string) {
  if (sourceType === "government") return "bg-growth";
  if (sourceType === "x") return "bg-signal";
  return "bg-steel";
}

function sourceTone(sourceType: string) {
  if (sourceType === "government") return "text-growth";
  if (sourceType === "x") return "text-signal";
  return "text-dim";
}

export function NewsCard({
  item,
  featured = false,
}: {
  item: StoredNewsItem;
  featured?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const categoryLabel = item.category
    ? item.category.replace(/-/g, " ")
    : null;

  return (
    <article
      className={cn(
        "news-card group relative overflow-hidden border border-steel-line/80 bg-panel/40 transition-[border-color,background-color,transform] duration-300",
        featured
          ? "md:grid md:grid-cols-[minmax(0,1fr)_auto]"
          : "hover:border-steel hover:bg-panel/70",
        open && "border-signal/35 bg-panel/80",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          sourceRail(item.sourceType),
        )}
        aria-hidden
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start gap-4 pl-5 pr-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          featured ? "py-6 md:py-8 md:pr-8" : "py-5",
        )}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={cn(
                "font-data text-[10px] uppercase tracking-[0.16em]",
                sourceTone(item.sourceType),
              )}
            >
              {item.sourceName}
            </span>
            {categoryLabel ? (
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-dim/80">
                {categoryLabel}
              </span>
            ) : null}
          </div>

          <h2
            className={cn(
              "mt-2.5 font-display font-medium tracking-tight text-foreground transition-colors group-hover:text-foreground",
              featured
                ? "text-2xl leading-[1.15] md:text-3xl lg:text-[2.15rem]"
                : "text-lg leading-snug md:text-xl",
            )}
          >
            {item.headline}
          </h2>

          {featured && item.body?.trim() ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim md:text-[15px]">
              {item.body.trim().slice(0, 180)}
              {item.body.trim().length > 180 ? "…" : ""}
            </p>
          ) : null}

          <p className="mt-3 font-data text-[10px] uppercase tracking-[0.14em] text-dim/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-100">
            {open ? "Hide details" : "Read brief"}
          </p>
        </div>

        <time
          className={cn(
            "shrink-0 font-data tabular-nums text-dim",
            featured
              ? "pt-1 text-xs md:text-sm"
              : "pt-0.5 text-[11px]",
          )}
          dateTime={item.publishedAt ?? item.fetchedAt}
        >
          {relativeTime(item.publishedAt ?? item.fetchedAt)}
        </time>
      </button>

      {featured ? (
        <div className="hidden border-l border-steel-line/80 survey-hatch md:flex md:min-w-[9rem] md:flex-col md:items-center md:justify-center md:px-6">
          <span className="font-data text-[10px] uppercase tracking-[0.2em] text-dim">
            Lead
          </span>
          <span className="mt-2 font-display text-3xl text-signal">01</span>
        </div>
      ) : null}

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          featured && "md:col-span-2",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-steel-line/70 px-5 pb-5 pt-4 md:px-6">
            <p className="max-w-3xl text-sm leading-relaxed text-dim">
              {item.body?.trim() || "No summary available for this item."}
            </p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-[0.16em] text-signal transition-colors hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              View original source
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
