"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { formatRate } from "@/lib/listings";
import { cn } from "@/lib/utils";

interface Transaction {
  date: string;
  rate: number;
  type: string;
}

interface PriceTrendChartProps {
  transactions: Transaction[];
  /** sparkline: tiny card inline. full: axis labels + last-price marker. */
  variant?: "sparkline" | "full";
  className?: string;
}

function buildPoints(
  transactions: Transaction[],
  width: number,
  height: number,
  pad: number,
) {
  const rates = transactions.map((t) => t.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min || 1;
  return transactions.map((t, i) => ({
    x:
      pad +
      (transactions.length === 1
        ? (width - pad * 2) / 2
        : (i / (transactions.length - 1)) * (width - pad * 2)),
    y: height - pad - ((t.rate - min) / span) * (height - pad * 2),
    ...t,
  }));
}

function toPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/**
 * Hand-rolled inline SVG price trend from the listing's chronological
 * transactions. No chart library. Line draw animates on scroll into view.
 */
export function PriceTrendChart({
  transactions,
  variant = "full",
  className,
}: PriceTrendChartProps) {
  const reduce = useReducedMotion();
  const gradientId = useId();

  if (transactions.length < 2) return null;

  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const appreciationPct = ((last.rate - first.rate) / first.rate) * 100;
  const rising = last.rate >= first.rate;
  const stroke = rising ? "var(--growth)" : "var(--signal)";

  if (variant === "sparkline") {
    const w = 120;
    const h = 36;
    const points = buildPoints(transactions, w, h, 4);
    const lastPoint = points[points.length - 1];

    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={cn("h-9 w-[7.5rem]", className)}
        role="img"
        aria-label={`Price trend: ${formatRate(first.rate)} in ${first.date} to ${formatRate(last.rate)} in ${last.date}`}
      >
        <motion.path
          d={toPath(points)}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={stroke} />
      </svg>
    );
  }

  const w = 560;
  const h = 200;
  const pad = 16;
  const points = buildPoints(transactions, w, h, pad);
  const lastPoint = points[points.length - 1];
  const rates = transactions.map((t) => t.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const areaPath = `${toPath(points)} L ${lastPoint.x.toFixed(1)} ${h - pad} L ${points[0].x.toFixed(1)} ${h - pad} Z`;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          Registered rate movement
        </p>
        <p className="font-data text-sm">
          <span className={rising ? "text-growth" : "text-signal"}>
            {rising ? "+" : ""}
            {appreciationPct.toFixed(1)}%
          </span>{" "}
          <span className="text-dim">
            {first.date} to {last.date}
          </span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Price trend chart: ${formatRate(first.rate)} in ${first.date} rising to ${formatRate(last.rate)} in ${last.date}, ${appreciationPct.toFixed(1)} percent change`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Reference hairlines at min / max */}
        {[pad, h - pad].map((y) => (
          <line
            key={y}
            x1={pad}
            x2={w - pad}
            y1={y}
            y2={y}
            stroke="var(--steel-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reduce ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.path
          d={toPath(points)}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />

        {points.map((p) => (
          <circle
            key={`${p.date}-${p.rate}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--panel)"
            stroke={stroke}
            strokeWidth="2"
          />
        ))}

        {/* Last-price marker */}
        <circle cx={lastPoint.x} cy={lastPoint.y} r="5.5" fill={stroke} opacity="0.25" />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={stroke} />
      </svg>

      <div className="mt-2 flex items-baseline justify-between font-data text-[11px] text-dim">
        <span>
          {first.date} · {formatRate(first.rate)}
        </span>
        <span className="text-foreground">
          {last.date} · {formatRate(last.rate)}
        </span>
      </div>
      <p className="mt-1 font-data text-[10px] text-dim">
        Range {formatRate(min)} to {formatRate(max)} · from the parcel&apos;s
        transaction ledger
      </p>
    </div>
  );
}
