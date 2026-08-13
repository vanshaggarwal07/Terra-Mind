"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

import { WhatsAppButton } from "@/components/contact/ContactButtons";
import { LinkButton } from "@/components/shared/LinkButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { logActivity } from "@/lib/activity";
import { projectionMessage } from "@/lib/contact";
import { DUMMY_LISTINGS, formatInr, formatRate } from "@/lib/listings";
import type { ExpresswayPhase, PropertyListing } from "@/lib/types";
import {
  annualGrowthRate,
  lookbackFromLedger,
  projectInvestment,
  type GrowthPoint,
} from "@/lib/valuation";
import { cn } from "@/lib/utils";

const PHASES: ExpresswayPhase[] = ["I", "II", "III", "IV"];
const CUSTOM_ID = "custom";
const MIN_AMOUNT = 100_000;
const MAX_AMOUNT = 1_000_000_000;

const AMOUNT_CHIPS = [
  { label: "₹10L", value: 1_000_000 },
  { label: "₹25L", value: 2_500_000 },
  { label: "₹50L", value: 5_000_000 },
  { label: "₹1Cr", value: 10_000_000 },
] as const;

// Month-granularity "today" anchor for the forward projection axis.
const NOW = new Date();
const NOW_MONTH_INDEX = NOW.getFullYear() * 12 + NOW.getMonth();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(Math.round(parsed), min, max) : fallback;
}

function inr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** 30 → "2 years 6 months", 60 → "5 years", 6 → "6 months". */
function horizonLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "year" : "years"}`);
  if (m > 0) parts.push(`${m} months`);
  return parts.join(" ");
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2025-11" → "Nov 2025". */
function monthLabel(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Month offset from today → "Nov 2031". */
function futureLabel(monthOffset: number): string {
  const abs = NOW_MONTH_INDEX + monthOffset;
  return `${MONTH_NAMES[abs % 12]} ${Math.floor(abs / 12)}`;
}

/**
 * Hero rupee figure that counts up/down between recalculations. Renders the
 * final value in SSR markup so there is no hydration mismatch or layout jump.
 */
function AnimatedRupees({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce || prev.current === value) {
      node.textContent = inr(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = inr(latest);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {inr(value)}
    </span>
  );
}

interface CurveMarker {
  monthOffset: number;
  value: number;
  year: number;
}

/**
 * Hand-rolled SVG growth curve: invested amount to final value, with
 * infrastructure milestones marked on the timeline. The path redraws on
 * every recalculation (keyed remount), reduced-motion renders static.
 */
function GrowthCurve({
  points,
  markers,
  startLabel,
  endLabel,
  ariaLabel,
}: {
  points: GrowthPoint[];
  markers: CurveMarker[];
  startLabel: string;
  endLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId();

  const w = 560;
  const h = 210;
  const pad = 18;
  const topPad = 30; // room for milestone year labels

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const totalMonths = points[points.length - 1].monthOffset || 1;

  const toX = (m: number) => pad + (m / totalMonths) * (w - pad * 2);
  const toY = (v: number) =>
    h - pad - ((v - min) / span) * (h - pad - topPad);

  const coords = points.map((p) => ({ x: toX(p.monthOffset), y: toY(p.value) }));
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h - pad} L ${coords[0].x.toFixed(1)} ${h - pad} Z`;

  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? "var(--growth)" : "var(--signal)";
  const last = coords[coords.length - 1];
  // Keyed on the normalized path: amount changes scale values linearly and
  // cancel out, so the draw animation only re-runs when the shape changes
  // (mode, horizon, or parcel), not on every keystroke.
  const redrawKey = linePath;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline at the invested amount */}
        <line
          x1={pad}
          x2={w - pad}
          y1={h - pad}
          y2={h - pad}
          stroke="var(--steel-line)"
          strokeWidth="1"
        />
        <line
          x1={pad}
          x2={w - pad}
          y1={topPad}
          y2={topPad}
          stroke="var(--steel-line)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        <motion.path
          key={`area-${redrawKey}`}
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        />
        <motion.path
          key={`line-${redrawKey}`}
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Infrastructure milestone markers */}
        {markers.map((m) => {
          const x = toX(m.monthOffset);
          const y = toY(m.value);
          return (
            <g key={`${m.year}-${m.monthOffset}`}>
              <line
                x1={x}
                x2={x}
                y1={y}
                y2={h - pad}
                stroke="var(--steel-line)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <circle cx={x} cy={y} r="4" fill="var(--panel)" stroke="var(--signal)" strokeWidth="2" />
              <text
                x={x}
                y={topPad - 10}
                textAnchor="middle"
                fill="var(--dim)"
                fontSize="10"
                className="font-data"
              >
                {m.year}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => (
          <circle
            key={p.monthOffset}
            cx={coords[i].x}
            cy={coords[i].y}
            r="3"
            fill="var(--panel)"
            stroke={stroke}
            strokeWidth="2"
          />
        ))}

        <circle cx={last.x} cy={last.y} r="6" fill={stroke} opacity="0.25" />
        <circle cx={last.x} cy={last.y} r="3.5" fill={stroke} />
      </svg>
      <div className="mt-1 flex items-baseline justify-between font-data text-[11px] text-dim">
        <span>{startLabel}</span>
        <span className="text-foreground">{endLabel}</span>
      </div>
    </div>
  );
}

interface WealthCalculatorProps {
  listings?: PropertyListing[];
}

export function WealthCalculator({
  listings = DUMMY_LISTINGS,
}: WealthCalculatorProps) {
  // Listing surfaces deep-link here via calculatorHref() with
  // ?parcel=&rate=&distance=&phase=&amount= so buyers land on their parcel.
  const searchParams = useSearchParams();
  const parcelParam = searchParams.get("parcel");
  const phaseParam = searchParams.get("phase");

  const linkedListing = parcelParam
    ? listings.find(
        (l) => l.parcelId === parcelParam || l.id === parcelParam,
      )
    : undefined;

  const [selectedId, setSelectedId] = useState<string>(
    () => linkedListing?.id ?? listings[0]?.id ?? CUSTOM_ID,
  );
  const [amount, setAmount] = useState(() =>
    numberParam(searchParams.get("amount"), 2_500_000, MIN_AMOUNT, MAX_AMOUNT),
  );
  const [months, setMonths] = useState(60);
  const [inputMode, setInputMode] = useState<"budget" | "area">("budget");
  const [modeChoice, setModeChoice] = useState<"past" | "future" | null>(null);

  // Custom-parcel inputs, seeded from deep-link params when present.
  const [customRate, setCustomRate] = useState(() =>
    numberParam(searchParams.get("rate"), 24_000, 12_000, 50_000),
  );
  const [customDistance, setCustomDistance] = useState(() =>
    numberParam(searchParams.get("distance"), 18, 3, 40),
  );
  const [customPhase, setCustomPhase] = useState<ExpresswayPhase>(() =>
    PHASES.includes(phaseParam as ExpresswayPhase)
      ? (phaseParam as ExpresswayPhase)
      : "II",
  );

  const listing =
    selectedId === CUSTOM_ID
      ? undefined
      : listings.find((l) => l.id === selectedId);

  const rate = listing?.pricePerSqYd ?? customRate;
  const distanceKm = listing?.distanceToAirportKm ?? customDistance;
  const phase = listing?.expresswayPhase ?? customPhase;

  // The input allows clearing while typing (amount 0); computations always
  // run on a sensible floor so nothing downstream divides by zero.
  const effectiveAmount = Math.max(MIN_AMOUNT, amount);
  const areaSqYd = effectiveAmount / rate;

  const lookback = useMemo(
    () =>
      listing && listing.transactions.length >= 3
        ? lookbackFromLedger({
            amount: effectiveAmount,
            months,
            transactions: listing.transactions,
          })
        : null,
    [listing, effectiveAmount, months],
  );

  // Real ledger history is the stronger hook, so past mode is the default
  // whenever the selected parcel has one. Custom parcels have no ledger.
  const mode: "past" | "future" =
    lookback === null ? "future" : (modeChoice ?? "past");

  const projection = useMemo(
    () => projectInvestment({ amount: effectiveAmount, months, distanceKm, phase }),
    [effectiveAmount, months, distanceKm, phase],
  );

  const result =
    mode === "past" && lookback
      ? {
          finalValue: lookback.finalValue,
          profit: lookback.profit,
          upliftPct: lookback.upliftPct,
          cagrPct: lookback.cagrPct,
          points: lookback.points,
        }
      : {
          finalValue: projection.finalValue,
          profit: projection.profit,
          upliftPct: projection.upliftPct,
          cagrPct: projection.cagrPct,
          points: projection.points,
        };

  // Confirmed infra milestones that fall inside the projection horizon,
  // anchored mid-year on the chart timeline.
  const milestones = useMemo(() => {
    if (mode !== "future" || !listing) return [];
    const growth = annualGrowthRate(distanceKm, phase);
    return listing.infraTimeline
      .map((item) => {
        const monthOffset = item.year * 12 + 5 - NOW_MONTH_INDEX;
        return { ...item, monthOffset };
      })
      .filter((item) => item.monthOffset > 0 && item.monthOffset <= months)
      .slice(0, 4)
      .map((item) => ({
        year: item.year,
        event: item.event,
        source: item.source,
        monthOffset: item.monthOffset,
        value: Math.round(
          effectiveAmount * Math.pow(1 + growth, item.monthOffset / 12),
        ),
      }));
  }, [mode, listing, distanceKm, phase, months, effectiveAmount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void logActivity({
        action: "calculator_use",
        propertyId: listing?.parcelId,
        meta: {
          mode,
          amount: effectiveAmount,
          months,
          finalValue: result.finalValue,
          profit: result.profit,
        },
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    mode,
    effectiveAmount,
    months,
    result.finalValue,
    result.profit,
    listing?.parcelId,
  ]);

  const reduce = useReducedMotion();
  const subject = listing ? `${listing.locality} (${listing.parcelId})` : "a corridor parcel";
  const heldLabel = lookback ? horizonLabel(lookback.heldMonths) : "";

  const sentence =
    mode === "past" && lookback
      ? `${inr(effectiveAmount)} invested in ${subject} in ${monthLabel(lookback.entryDate)} would be worth ${inr(lookback.finalValue)} today. That is a profit of ${inr(lookback.profit)} (+${lookback.upliftPct.toFixed(1)}%) in ${heldLabel}, based on registered transaction rates.`
      : `${inr(effectiveAmount)} invested in ${subject} today could grow to ${inr(result.finalValue)} by ${futureLabel(months)}. That is a projected gain of ${inr(result.profit)} (+${result.upliftPct.toFixed(1)}%), from corridor growth and confirmed infrastructure milestones.`;

  const breakdownRows =
    mode === "past" && lookback
      ? lookback.points.map((p) => ({
          key: p.date,
          label: monthLabel(p.date),
          value: p.value,
          gain: p.value - effectiveAmount,
        }))
      : projection.points.map((p) => ({
          key: String(p.monthOffset),
          label: p.monthOffset === 0 ? "Today" : futureLabel(p.monthOffset),
          value: p.value,
          gain: p.value - effectiveAmount,
        }));

  const whatsappMessage = projectionMessage({
    parcelId: listing?.parcelId,
    years: Math.max(1, Math.round(months / 12)),
    currentValue: formatInr(effectiveAmount),
    projectedValue: formatInr(result.finalValue),
    mode,
  });

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
            Wealth calculator
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-foreground md:text-5xl">
            See what your money makes here.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-dim md:text-base">
            Pick a parcel, put in an amount. Past returns come straight from
            registered transactions on that parcel&apos;s ledger. Projections
            come from the corridor growth model.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          {/* ————— Inputs ————— */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="steel-frame h-fit space-y-6 p-4 md:p-6"
          >
            {/* Mode toggle */}
            <div
              role="group"
              aria-label="Calculation mode"
              className="grid grid-cols-2 gap-1 rounded-full border border-steel-line bg-background p-1"
            >
              {(
                [
                  { key: "past", label: "What I would have made" },
                  { key: "future", label: "What I could make" },
                ] as const
              ).map((item) => {
                const disabled = item.key === "past" && lookback === null;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={disabled}
                    aria-pressed={mode === item.key}
                    onClick={() => setModeChoice(item.key)}
                    title={
                      disabled
                        ? "Needs a parcel with a transaction ledger"
                        : undefined
                    }
                    className={cn(
                      "rounded-full px-2 py-2 font-data text-[10px] uppercase tracking-[0.08em] transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-[11px]",
                      mode === item.key
                        ? "bg-foreground text-background"
                        : "text-dim hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Property */}
            <div className="space-y-2">
              <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                Property
              </Label>
              <Select
                value={selectedId}
                onValueChange={(value) => {
                  const next = String(value ?? CUSTOM_ID);
                  setSelectedId(next);
                  setModeChoice(null);
                }}
              >
                <SelectTrigger className="w-full rounded-sm border-steel-line bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm border-steel-line bg-panel">
                  {listings.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {formatRate(item.pricePerSqYd)}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_ID}>
                    Custom corridor parcel
                  </SelectItem>
                </SelectContent>
              </Select>
              {listing && (
                <p className="font-data text-[11px] text-dim">
                  {listing.parcelId} · {listing.distanceToAirportKm.toFixed(1)}{" "}
                  km from Jewar Airport · Phase {listing.expresswayPhase}
                </p>
              )}
            </div>

            {/* Custom parcel controls */}
            {!listing && (
              <div className="space-y-5 rounded-2xl border border-steel-line bg-background p-4">
                <div className="space-y-2">
                  <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                    Rate ·{" "}
                    <span className="text-foreground">{formatRate(customRate)}</span>
                  </Label>
                  <Slider
                    min={12000}
                    max={50000}
                    step={500}
                    value={[customRate]}
                    onValueChange={(value) =>
                      setCustomRate(Number(Array.isArray(value) ? value[0] : value))
                    }
                    className="py-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                    Distance to airport ·{" "}
                    <span className="text-foreground">
                      {customDistance.toFixed(0)} km
                    </span>
                  </Label>
                  <Slider
                    min={3}
                    max={40}
                    step={1}
                    value={[customDistance]}
                    onValueChange={(value) =>
                      setCustomDistance(
                        Number(Array.isArray(value) ? value[0] : value),
                      )
                    }
                    className="py-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                    Expressway phase
                  </Label>
                  <Select
                    value={customPhase}
                    onValueChange={(value) =>
                      setCustomPhase(String(value ?? "II") as ExpresswayPhase)
                    }
                  >
                    <SelectTrigger className="w-full rounded-sm border-steel-line bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm border-steel-line bg-panel">
                      {PHASES.map((item) => (
                        <SelectItem key={item} value={item}>
                          Phase {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Budget / Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="wealth-amount"
                  className="font-data text-[10px] uppercase tracking-[0.18em] text-dim"
                >
                  {inputMode === "budget" ? "Investment amount" : "Plot area"}
                </Label>
                <div
                  role="group"
                  aria-label="Enter by budget or by area"
                  className="flex gap-0.5 rounded-full border border-steel-line p-0.5"
                >
                  {(
                    [
                      { key: "budget", label: "Budget" },
                      { key: "area", label: "Area" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={inputMode === item.key}
                      onClick={() => setInputMode(item.key)}
                      className={cn(
                        "rounded-full px-2.5 py-1 font-data text-[10px] uppercase tracking-[0.08em] transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        inputMode === item.key
                          ? "bg-foreground text-background"
                          : "text-dim hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === "budget" ? (
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-data text-sm text-dim"
                  >
                    ₹
                  </span>
                  <Input
                    id="wealth-amount"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amount === 0 ? "" : amount.toLocaleString("en-IN")}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, "");
                      setAmount(
                        digits === ""
                          ? 0
                          : clamp(Number(digits), 1, MAX_AMOUNT),
                      );
                    }}
                    className="h-11 rounded-sm border-steel-line bg-background pl-7 font-data tabular-nums"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="wealth-amount"
                    inputMode="numeric"
                    autoComplete="off"
                    value={
                      amount === 0
                        ? ""
                        : Math.round(amount / rate).toLocaleString("en-IN")
                    }
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, "");
                      const nextArea = digits === "" ? 0 : Number(digits);
                      setAmount(clamp(Math.round(nextArea * rate), 0, MAX_AMOUNT));
                    }}
                    className="h-11 rounded-sm border-steel-line bg-background pr-16 font-data tabular-nums"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-data text-xs text-dim"
                  >
                    sq.yd
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {AMOUNT_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    aria-pressed={amount === chip.value}
                    onClick={() => setAmount(chip.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-data text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px",
                      amount === chip.value
                        ? "border-signal bg-signal-tint text-signal"
                        : "border-steel-line text-dim hover:text-foreground",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <p className="font-data text-[11px] text-dim" aria-live="polite">
                {inputMode === "budget"
                  ? `Buys ≈ ${Math.round(areaSqYd).toLocaleString("en-IN")} sq.yd at ${formatRate(rate)}`
                  : `Costs ≈ ${inr(effectiveAmount)} at ${formatRate(rate)}`}
              </p>
            </div>

            {/* Horizon */}
            <div className="space-y-2">
              <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                {mode === "past" ? "If I had invested" : "Holding period"} ·{" "}
                <span className="text-foreground">
                  {horizonLabel(months)}
                  {mode === "past" ? " ago" : ""}
                </span>
              </Label>
              <Slider
                min={6}
                max={144}
                step={6}
                value={[months]}
                onValueChange={(value) =>
                  setMonths(Number(Array.isArray(value) ? value[0] : value))
                }
                className="py-3"
              />
              {mode === "past" && lookback?.clampedToLedgerStart && (
                <p className="font-data text-[11px] text-dim">
                  This parcel&apos;s ledger begins {monthLabel(lookback.entryDate)},
                  so returns are shown from there.
                </p>
              )}
            </div>
          </motion.div>

          {/* ————— The reveal ————— */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <div className="relative">
              <div
                aria-hidden
                className="absolute -top-8 left-1/2 h-36 w-[80%] -translate-x-1/2 rounded-full bg-signal-tint blur-3xl"
              />
              <p className="relative font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                {mode === "past" && lookback
                  ? `Worth today, bought ${monthLabel(lookback.entryDate)}`
                  : `Worth in ${horizonLabel(months)}`}
              </p>
              <AnimatedRupees
                value={result.finalValue}
                className="relative mt-2 block font-data text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl"
              />

              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <motion.span
                  key={`profit-${result.profit}`}
                  animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="rounded-full border border-growth/30 bg-growth-tint px-3 py-1.5 font-data text-sm text-growth"
                >
                  {result.profit >= 0 ? "+" : ""}
                  {inr(result.profit)} profit
                </motion.span>
                <span className="rounded-full border border-growth/30 bg-growth-tint px-3 py-1.5 font-data text-sm text-growth">
                  {result.upliftPct >= 0 ? "+" : ""}
                  {result.upliftPct.toFixed(1)}%
                </span>
                <span className="rounded-full border border-steel-line px-3 py-1.5 font-data text-sm text-dim">
                  {result.cagrPct.toFixed(1)}% / yr
                </span>
              </div>

              <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-foreground md:text-base">
                {sentence}
              </p>
            </div>

            <div className="steel-frame mt-6 p-4 md:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
                  {mode === "past"
                    ? "Registered value path"
                    : "Projected value path"}
                </p>
                <p className="font-data text-[11px] text-dim">
                  {inr(effectiveAmount)} in · {inr(result.finalValue)} out
                </p>
              </div>
              <div className="mt-3">
                <GrowthCurve
                  points={result.points}
                  markers={milestones}
                  startLabel={
                    mode === "past" && lookback
                      ? `${monthLabel(lookback.entryDate)} · ${inr(effectiveAmount)}`
                      : `Today · ${inr(effectiveAmount)}`
                  }
                  endLabel={
                    mode === "past" && lookback
                      ? `${monthLabel(lookback.exitDate)} · ${inr(result.finalValue)}`
                      : `${futureLabel(months)} · ${inr(result.finalValue)}`
                  }
                  ariaLabel={`Value path from ${inr(effectiveAmount)} to ${inr(result.finalValue)}, ${result.upliftPct.toFixed(1)} percent ${mode === "past" ? "historical gain" : "projected gain"}`}
                />
              </div>

              {milestones.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-steel-line pt-3">
                  {milestones.map((m) => (
                    <li
                      key={`${m.year}-${m.event}`}
                      className="flex items-baseline gap-2 font-data text-[11px]"
                    >
                      <span className="shrink-0 text-signal">{m.year}</span>
                      <span className="text-foreground">{m.event}</span>
                      <span className="ml-auto shrink-0 text-dim">{m.source}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Breakdown */}
            <div className="steel-frame mt-4 overflow-hidden">
              <table className="w-full font-data text-sm">
                <caption className="sr-only">
                  {mode === "past"
                    ? "Registered value of the investment at each ledger date"
                    : "Projected value of the investment year by year"}
                </caption>
                <thead>
                  <tr className="border-b border-steel-line text-left">
                    <th className="px-4 py-2.5 text-[10px] font-normal uppercase tracking-[0.16em] text-dim">
                      {mode === "past" ? "Ledger date" : "Year"}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-normal uppercase tracking-[0.16em] text-dim">
                      Value
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-normal uppercase tracking-[0.16em] text-dim">
                      Gain
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-steel-line/60 last:border-b-0"
                    >
                      <td className="px-4 py-2 text-dim">{row.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">
                        {inr(row.value)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right tabular-nums",
                          row.gain > 0 ? "text-growth" : "text-dim",
                        )}
                      >
                        {row.gain > 0 ? "+" : ""}
                        {inr(row.gain)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTAs */}
            <div className="mt-5 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
              <WhatsAppButton
                message={whatsappMessage}
                where="calculator_projection"
                propertyId={listing?.parcelId}
                meta={{
                  mode,
                  amount,
                  months,
                  finalValue: result.finalValue,
                  profit: result.profit,
                }}
                className="h-12 w-full bg-signal text-background hover:bg-signal/90"
              >
                {mode === "past"
                  ? "Discuss these returns on WhatsApp"
                  : "Discuss this projection on WhatsApp"}
              </WhatsAppButton>
              <LinkButton
                href={listing ? `/enquire?property=${listing.id}` : "/enquire"}
                variant="outline"
                className="h-12 w-full border-steel-line text-foreground hover:bg-secondary"
                onClick={() => {
                  void logActivity({
                    action: "cta_click",
                    propertyId: listing?.id,
                    meta: { where: "calculator_book_call" },
                  });
                }}
              >
                Book a call
              </LinkButton>
            </div>

            <p className="mt-3 font-data text-[11px] text-dim">
              {mode === "past"
                ? "Computed from registered transaction rates on this parcel's ledger. Real history, not a model."
                : "Projected from the corridor growth model (phase and airport proximity). An estimate, not a guarantee of returns."}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
