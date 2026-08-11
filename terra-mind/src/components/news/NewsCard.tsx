"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

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

function sourceBadge(sourceType: string): { dot: string; text: string; bg: string } {
  if (sourceType === "government") {
    return { dot: "bg-growth", text: "text-growth", bg: "bg-growth-tint" };
  }
  if (sourceType === "x") {
    return { dot: "bg-signal", text: "text-signal", bg: "bg-signal-tint" };
  }
  return { dot: "bg-steel", text: "text-dim", bg: "bg-secondary" };
}

export function NewsCard({
  item,
  featured = false,
}: {
  item: StoredNewsItem;
  featured?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const categoryLabel = item.category ? item.category.replace(/-/g, " ") : null;
  const badge = sourceBadge(item.sourceType);
  const hasBody = Boolean(item.body?.trim());

  return (
    <article
      className={cn(
        "news-card group relative overflow-hidden rounded-3xl border bg-panel transition-all duration-300",
        featured
          ? "border-signal/25 soft-shadow"
          : "border-steel-line hover:border-steel hover:shadow-md",
        open && "border-steel",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full flex-col gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          featured ? "p-6 md:p-8" : "p-5 md:p-6",
        )}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {featured ? (
              <span className="inline-flex items-center rounded-full bg-signal px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-background">
                Lead story
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                badge.bg,
                badge.text,
              )}
            >
              <span className={cn("size-1.5 rounded-full", badge.dot)} aria-hidden />
              {item.sourceName}
            </span>
            {categoryLabel ? (
              <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-xs capitalize text-dim sm:inline-flex">
                {categoryLabel}
              </span>
            ) : null}
          </div>
          <time
            className="shrink-0 pt-0.5 font-data text-xs text-dim"
            dateTime={item.publishedAt ?? item.fetchedAt}
          >
            {relativeTime(item.publishedAt ?? item.fetchedAt)}
          </time>
        </div>

        <h2
          className={cn(
            "font-display font-medium tracking-tight text-foreground",
            featured
              ? "text-2xl leading-[1.15] md:text-3xl lg:text-[2.15rem]"
              : "text-lg leading-snug md:text-xl",
          )}
        >
          {item.headline}
        </h2>

        {featured && hasBody ? (
          <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-dim md:text-[15px]">
            {item.body!.trim()}
          </p>
        ) : null}

        <span className="inline-flex items-center gap-1 text-xs font-medium text-dim transition-colors group-hover:text-foreground">
          {open ? "Hide details" : "Read brief"}
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            strokeWidth={2}
          />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "space-y-3 border-t border-steel-line pt-4",
              featured ? "px-6 pb-6 md:px-8 md:pb-8" : "px-5 pb-5 md:px-6 md:pb-6",
            )}
          >
            <p className="max-w-3xl text-sm leading-relaxed text-dim">
              {item.body?.trim() || "No summary available for this item."}
            </p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              View original source
              <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
