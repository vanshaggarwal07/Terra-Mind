"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_FILTERS } from "@/lib/listings";
import type { ExpresswayPhase, ListingFilters } from "@/lib/types";

interface BrowseFiltersProps {
  filters: ListingFilters;
  regions: string[];
  onChange: (next: ListingFilters) => void;
}

const labelClass =
  "font-data text-[10px] uppercase tracking-[0.18em] text-dim";

export function BrowseFilters({ filters, regions, onChange }: BrowseFiltersProps) {
  const isDefault =
    filters.location === DEFAULT_FILTERS.location &&
    filters.priceMax === DEFAULT_FILTERS.priceMax &&
    filters.airportMaxKm === DEFAULT_FILTERS.airportMaxKm &&
    filters.filmCityMaxKm === DEFAULT_FILTERS.filmCityMaxKm &&
    filters.phase === DEFAULT_FILTERS.phase;

  return (
    <div className="steel-frame grid gap-x-6 gap-y-5 rounded-2xl p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[minmax(150px,0.9fr)_minmax(130px,0.8fr)_1fr_1fr_1fr_auto] xl:items-end">
      <div className="space-y-2">
        <Label className={labelClass}>Location</Label>
        <Select
          value={filters.location}
          onValueChange={(value) =>
            onChange({ ...filters, location: String(value ?? "all") })
          }
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-steel-line bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-steel-line bg-panel">
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Expressway phase</Label>
        <Select
          value={filters.phase}
          onValueChange={(value) =>
            onChange({
              ...filters,
              phase: String(value ?? "all") as ExpresswayPhase | "all",
            })
          }
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-steel-line bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-steel-line bg-panel">
            <SelectItem value="all">All phases</SelectItem>
            {(["I", "II", "III", "IV"] as ExpresswayPhase[]).map((phase) => (
              <SelectItem key={phase} value={phase}>
                Phase {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>
          Price ceiling{" "}
          <span className="normal-case tracking-normal text-foreground">
            ₹{filters.priceMax.toLocaleString("en-IN")}
          </span>
        </Label>
        <Slider
          min={10000}
          max={60000}
          step={500}
          value={[filters.priceMax]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            onChange({ ...filters, priceMax: Number(next) });
          }}
          className="py-3"
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>
          Airport ≤{" "}
          <span className="normal-case tracking-normal text-foreground">
            {filters.airportMaxKm.toFixed(0)} km
          </span>
        </Label>
        <Slider
          min={5}
          max={50}
          step={1}
          value={[filters.airportMaxKm]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            onChange({ ...filters, airportMaxKm: Number(next) });
          }}
          className="py-3"
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>
          Film City ≤{" "}
          <span className="normal-case tracking-normal text-foreground">
            {filters.filmCityMaxKm >= 50 ? "any" : `${filters.filmCityMaxKm.toFixed(0)} km`}
          </span>
        </Label>
        <Slider
          min={5}
          max={50}
          step={1}
          value={[filters.filmCityMaxKm]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            onChange({ ...filters, filmCityMaxKm: Number(next) });
          }}
          className="py-3"
        />
      </div>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        disabled={isDefault}
        className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-full border border-steel-line bg-background px-4 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 disabled:pointer-events-none disabled:opacity-40 sm:col-span-2 xl:col-span-1"
      >
        <ArrowCounterClockwise className="size-3.5" aria-hidden />
        Reset
      </button>
    </div>
  );
}
