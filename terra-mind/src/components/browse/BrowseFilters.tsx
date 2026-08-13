"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { ExpresswayPhase, ListingFilters } from "@/lib/types";

interface BrowseFiltersProps {
  filters: ListingFilters;
  regions: string[];
  onChange: (next: ListingFilters) => void;
}

export function BrowseFilters({ filters, regions, onChange }: BrowseFiltersProps) {
  return (
    <div className="steel-frame grid gap-5 p-4 md:grid-cols-4 md:p-5">
      <div className="space-y-2">
        <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          Location
        </Label>
        <Select
          value={filters.location}
          onValueChange={(value) =>
            onChange({ ...filters, location: String(value ?? "all") })
          }
        >
          <SelectTrigger className="h-10 w-full rounded-sm border-steel-line bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-sm border-steel-line bg-panel">
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
        <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          Price ceiling ·{" "}
          <span className="text-foreground">
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
        <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          Airport distance ≤{" "}
          <span className="text-foreground">{filters.airportMaxKm.toFixed(0)} km</span>
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
        <Label className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
          Expressway phase
        </Label>
        <Select
          value={filters.phase}
          onValueChange={(value) =>
            onChange({
              ...filters,
              phase: String(value ?? "all") as ExpresswayPhase | "all",
            })
          }
        >
          <SelectTrigger className="h-10 w-full rounded-sm border-steel-line bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-sm border-steel-line bg-panel">
            <SelectItem value="all">All phases</SelectItem>
            {(["I", "II", "III", "IV"] as ExpresswayPhase[]).map((phase) => (
              <SelectItem key={phase} value={phase}>
                Phase {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
