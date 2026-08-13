"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

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
import { formatInr, formatRate } from "@/lib/listings";
import type { ExpresswayPhase } from "@/lib/types";
import { computeParcelValue } from "@/lib/valuation";

const ParcelCanvas = dynamic(
  () =>
    import("@/components/calculator/ParcelCanvas").then((m) => m.ParcelCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="steel-frame flex h-[360px] items-center justify-center text-sm text-dim md:h-[420px]">
        Initializing survey mesh…
      </div>
    ),
  },
);

export function InvestmentCalculator() {
  const [distanceKm, setDistanceKm] = useState(18);
  const [phase, setPhase] = useState<ExpresswayPhase>("II");
  const [years, setYears] = useState(7);
  const [baseRate, setBaseRate] = useState(24000);

  const result = useMemo(
    () => computeParcelValue({ distanceKm, phase, years, baseRate }),
    [distanceKm, phase, years, baseRate],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void logActivity({
        action: "calculator_use",
        meta: {
          distanceKm,
          phase,
          years,
          baseRate,
          projectedValue: result.projectedValue,
        },
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [distanceKm, phase, years, baseRate, result.projectedValue]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-6">
      <div>
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
          Investment calculator
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
          Model a parcel in 3D
        </h1>
        <p className="mt-3 max-w-lg text-sm text-dim">
          Adjust distance, expressway phase, and horizon. The extruded block height
          tracks projected land value — live, not decorative.
        </p>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
              Distance to airport ·{" "}
              <span className="text-foreground">{distanceKm.toFixed(0)} km</span>
            </Label>
            <Slider
              min={3}
              max={40}
              step={1}
              value={[distanceKm]}
              onValueChange={(value) =>
                setDistanceKm(Number(Array.isArray(value) ? value[0] : value))
              }
              className="py-3"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
              Expressway phase
            </Label>
            <Select
              value={phase}
              onValueChange={(value) =>
                setPhase(String(value ?? "II") as ExpresswayPhase)
              }
            >
              <SelectTrigger className="w-full rounded-sm border-steel-line bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-sm border-steel-line bg-panel">
                {(["I", "II", "III", "IV"] as ExpresswayPhase[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    Phase {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
              Timeline · <span className="text-foreground">{years} years</span>
            </Label>
            <Slider
              min={3}
              max={12}
              step={1}
              value={[years]}
              onValueChange={(value) =>
                setYears(Number(Array.isArray(value) ? value[0] : value))
              }
              className="py-3"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
              Base rate ·{" "}
              <span className="text-foreground">{formatRate(baseRate)}</span>
            </Label>
            <Slider
              min={12000}
              max={50000}
              step={500}
              value={[baseRate]}
              onValueChange={(value) =>
                setBaseRate(Number(Array.isArray(value) ? value[0] : value))
              }
              className="py-3"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ParcelCanvas
          height={result.blockHeight}
          upliftPct={result.upliftPct}
          distanceKm={distanceKm}
        />
        <div className="steel-frame grid grid-cols-3 gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Current</p>
            <p className="mt-1 font-data text-sm text-foreground md:text-base">
              {formatInr(result.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Projected</p>
            <p className="mt-1 font-data text-sm text-signal md:text-base">
              {formatInr(result.projectedValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Uplift</p>
            <p className="mt-1 font-data text-sm text-growth md:text-base">
              +{result.upliftPct.toFixed(1)}%
            </p>
          </div>
        </div>
        <p className="text-xs text-dim">
          Estimate only. Confidence depends on phase delivery and absorption —
          not a guarantee of returns.
        </p>
      </div>
    </div>
  );
}
